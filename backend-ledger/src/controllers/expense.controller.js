const { transactionModel, CATEGORIES } = require("../models/transaction.model")
const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const mongoose = require("mongoose")

const MONEY_EVENT_TYPES = [ "INCOME", "EXPENSE" ]

function toMoneyEventResponse(transaction) {
    const event = transaction.toObject ? transaction.toObject() : transaction

    return {
        _id: event._id,
        user: event.user,
        account: event.account,
        amount: event.amount,
        type: event.type.toLowerCase(),
        category: event.category,
        description: event.description,
        date: event.date,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        __v: event.__v
    }
}

async function getReversedTransactionIds(userId, session) {
    const query = transactionModel.find({
        user: userId,
        type: "REVERSAL"
    }).select("reversesTransaction")

    if (session) {
        query.session(session)
    }

    const reversals = await query.lean()
    return reversals.map((reversal) => reversal.reversesTransaction).filter(Boolean)
}

async function createMoneyEvent(req, res) {
    const { accountId, amount, type, category, description, date } = req.body || {}

    if (!accountId || amount === undefined || !type || !category) {
        return res.status(400).json({
            message: "accountId, amount, type and category are required"
        })
    }

    if (!mongoose.isObjectIdOrHexString(accountId)) {
        return res.status(400).json({ message: "Invalid accountId" })
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > Number.MAX_SAFE_INTEGER) {
        return res.status(400).json({ message: "Amount must be a positive number" })
    }

    if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "Type must be either income or expense" })
    }

    if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid category" })
    }

    const parsedDate = date ? new Date(date) : new Date()
    if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Date must be a valid date" })
    }

    const account = await accountModel.findOne({ _id: accountId, user: req.user._id })
    if (!account) {
        return res.status(404).json({ message: "Account not found" })
    }

    const session = await mongoose.startSession()
    try {
        session.startTransaction()

        // This write makes concurrent money events from the same account conflict safely.
        await accountModel.updateOne(
            { _id: account._id, user: req.user._id },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        )

        if (type === "expense") {
            const balance = await account.getBalance({ session })
            if (balance < parsedAmount) {
                await session.abortTransaction()
                return res.status(400).json({
                    message: `Insufficient balance. Available: ₹${balance.toFixed(2)}, Required: ₹${parsedAmount.toFixed(2)}`
                })
            }
        }

        const [transaction] = await transactionModel.create([{
            user: req.user._id,
            type: type.toUpperCase(),
            account: accountId,
            amount: parsedAmount,
            category,
            description: description || "",
            date: parsedDate,
            status: "COMPLETED"
        }], { session })

        await ledgerModel.create([{
            account: accountId,
            amount: parsedAmount,
            transaction: transaction._id,
            type: type === "income" ? "CREDIT" : "DEBIT"
        }], { session })

        await session.commitTransaction()

        return res.status(201).json({
            message: type === "income"
                ? "Income recorded successfully"
                : "Expense recorded successfully",
            expense: toMoneyEventResponse(transaction)
        })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        console.error("createMoneyEvent error:", error)
        return res.status(500).json({ message: "Failed to record transaction. Please try again." })
    } finally {
        await session.endSession()
    }
}

async function listMoneyEvents(req, res) {
    const reversedTransactionIds = await getReversedTransactionIds(req.user._id)

    const transactions = await transactionModel.find({
        user: req.user._id,
        type: { $in: MONEY_EVENT_TYPES },
        _id: { $nin: reversedTransactionIds }
    })
        .sort({ date: -1, createdAt: -1 })
        .limit(100)
        .lean()

    return res.status(200).json({
        expenses: transactions.map(toMoneyEventResponse)
    })
}

async function getMoneyEventSummary(req, res) {
    const reversedTransactionIds = await getReversedTransactionIds(req.user._id)
    const matchStage = {
        user: new mongoose.Types.ObjectId(req.user._id),
        type: { $in: MONEY_EVENT_TYPES },
        _id: { $nin: reversedTransactionIds }
    }

    const [ overallSummary, categoryBreakdown, monthlyTrend ] = await Promise.all([
        transactionModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $toLower: "$type" },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]),
        transactionModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        category: "$category",
                        type: { $toLower: "$type" }
                    },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]),
        transactionModel.aggregate([
            {
                $match: {
                    ...matchStage,
                    date: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" },
                        type: { $toLower: "$type" }
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ])
    ])

    const incomeTotals = overallSummary.find((item) => item._id === "income") || { total: 0, count: 0 }
    const expenseTotals = overallSummary.find((item) => item._id === "expense") || { total: 0, count: 0 }

    return res.status(200).json({
        summary: {
            totalIncome: incomeTotals.total,
            totalExpense: expenseTotals.total,
            netBalance: incomeTotals.total - expenseTotals.total,
            incomeCount: incomeTotals.count,
            expenseCount: expenseTotals.count
        },
        categoryBreakdown,
        monthlyTrend
    })
}

async function reverseMoneyEvent(req, res) {
    const { id } = req.params

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({ message: "Invalid transaction id" })
    }

    const session = await mongoose.startSession()
    try {
        session.startTransaction()

        const transaction = await transactionModel.findOne({
            _id: id,
            user: req.user._id,
            type: { $in: MONEY_EVENT_TYPES }
        }).session(session)

        const existingReversal = transaction && await transactionModel.findOne({
            user: req.user._id,
            type: "REVERSAL",
            reversesTransaction: transaction._id
        }).session(session)

        if (!transaction || existingReversal) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Transaction not found" })
        }

        await accountModel.updateOne(
            { _id: transaction.account, user: req.user._id },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        )

        const [reversal] = await transactionModel.create([{
            user: req.user._id,
            type: "REVERSAL",
            account: transaction.account,
            amount: transaction.amount,
            reversesTransaction: transaction._id,
            status: "COMPLETED"
        }], { session })

        await ledgerModel.create([{
            account: transaction.account,
            amount: transaction.amount,
            transaction: reversal._id,
            type: transaction.type === "INCOME" ? "DEBIT" : "CREDIT"
        }], { session })

        await session.commitTransaction()

        return res.status(200).json({ message: "Transaction reversed successfully" })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        console.error("reverseMoneyEvent error:", error)
        return res.status(error.code === 11000 ? 404 : 500).json({
            message: error.code === 11000 ? "Transaction not found" : "Failed to reverse transaction"
        })
    } finally {
        await session.endSession()
    }
}

module.exports = {
    createMoneyEvent,
    listMoneyEvents,
    getMoneyEventSummary,
    reverseMoneyEvent
}
