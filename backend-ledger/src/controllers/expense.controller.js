const { expenseModel, CATEGORIES } = require("../models/expense.model")
const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const transactionModel = require("../models/transaction.model")
const mongoose = require("mongoose")
const { randomUUID } = require("node:crypto")

async function createExpense(req, res) {
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

        // This write makes concurrent expenses from the same account conflict safely.
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

        const idempotencyKey = `exp_${randomUUID()}`

        const [transaction] = await transactionModel.create([{
            fromAccount: accountId,
            toAccount: accountId,
            amount: parsedAmount,
            idempotencyKey,
            status: "COMPLETED"
        }], { session })

        // Income adds CREDIT; expense adds DEBIT.
        await ledgerModel.create([{
            account: accountId,
            amount: parsedAmount,
            transaction: transaction._id,
            type: type === "income" ? "CREDIT" : "DEBIT"
        }], { session })

        const [expense] = await expenseModel.create([{
            user: req.user._id,
            account: accountId,
            amount: parsedAmount,
            type,
            category,
            description: description || "",
            date: parsedDate
        }], { session })

        await session.commitTransaction()

        return res.status(201).json({
            message: "Expense recorded successfully",
            expense
        })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        console.error("createExpense error:", error)
        return res.status(500).json({ message: "Failed to create expense. Please try again." })
    } finally {
        await session.endSession()
    }
}

async function getExpenses(req, res) {
    const expenses = await expenseModel.find({ user: req.user._id })
        .sort({ date: -1, createdAt: -1 })
        .limit(100)
        .lean()

    return res.status(200).json({ expenses })
}

async function getExpenseSummary(req, res) {
    const matchStage = {
        user: new mongoose.Types.ObjectId(req.user._id),
        isDeleted: false
    }

    const [ overallSummary, categoryBreakdown, monthlyTrend ] = await Promise.all([
        // Total income vs expense
        expenseModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]),
        // Category-wise breakdown
        expenseModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { category: "$category", type: "$type" },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]),
        // Last 6 months monthly trend
        expenseModel.aggregate([
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
                        type: "$type"
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ])
    ])

    const income = overallSummary.find(s => s._id === "income") || { total: 0, count: 0 }
    const expense = overallSummary.find(s => s._id === "expense") || { total: 0, count: 0 }

    return res.status(200).json({
        summary: {
            totalIncome: income.total,
            totalExpense: expense.total,
            netBalance: income.total - expense.total,
            incomeCount: income.count,
            expenseCount: expense.count
        },
        categoryBreakdown,
        monthlyTrend
    })
}

async function deleteExpense(req, res) {
    const { id } = req.params

    if (!mongoose.isObjectIdOrHexString(id)) {
        return res.status(400).json({ message: "Invalid expense id" })
    }

    const session = await mongoose.startSession()
    try {
        session.startTransaction()

        const expense = await expenseModel.findOne({
            _id: id,
            user: req.user._id
        }).session(session)

        if (!expense) {
            await session.abortTransaction()
            return res.status(404).json({ message: "Expense not found" })
        }

        const idempotencyKey = `del_${randomUUID()}`

        await accountModel.updateOne(
            { _id: expense.account },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        )

        const [transaction] = await transactionModel.create([{
            fromAccount: expense.account,
            toAccount: expense.account,
            amount: expense.amount,
            idempotencyKey,
            status: "COMPLETED"
        }], { session })

        // Reverse the original financial effect by flipping CREDIT and DEBIT.
        await ledgerModel.create([{
            account: expense.account,
            amount: expense.amount,
            transaction: transaction._id,
            type: expense.type === "income" ? "DEBIT" : "CREDIT"
        }], { session })

        expense.isDeleted = true
        await expense.save({ session })
        await session.commitTransaction()

        return res.status(200).json({ message: "Expense deleted successfully" })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction()
        }
        console.error("deleteExpense error:", error)
        return res.status(500).json({ message: "Failed to delete expense" })
    } finally {
        await session.endSession()
    }
}

module.exports = {
    createExpense,
    getExpenses,
    getExpenseSummary,
    deleteExpense
}
