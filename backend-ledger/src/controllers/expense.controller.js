const expenseModel = require("../models/expense.model")
const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const transactionModel = require("../models/transaction.model")
const mongoose = require("mongoose")
const { randomUUID } = require("node:crypto")
const { CATEGORIES } = require("../models/expense.model")

function parsePositiveInteger(value, fallback, maximum) {
    const parsed = Number.parseInt(value, 10)

    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback
    }

    return Math.min(parsed, maximum)
}

function parseOptionalDate(value) {
    if (!value) {
        return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * POST /api/expenses
 * Create a new income or expense entry atomically with its ledger entry.
 */
async function createExpense(req, res) {
    const { accountId, amount, type, category, description, date, tags } = req.body || {}

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

    const parsedDate = parseOptionalDate(date)
    if (parsedDate === undefined) {
        return res.status(400).json({ message: "Date must be a valid date" })
    }

    if (tags !== undefined && (!Array.isArray(tags) || tags.length > 20 || tags.some(tag => typeof tag !== "string" || tag.length > 40))) {
        return res.status(400).json({ message: "Tags must contain at most 20 short text values" })
    }

    // Verify account belongs to user
    const account = await accountModel.findOne({ _id: accountId, user: req.user._id })
    if (!account) {
        return res.status(404).json({ message: "Account not found" })
    }

    if (account.status !== "ACTIVE") {
        return res.status(400).json({ message: "Account is not active" })
    }

    const session = await mongoose.startSession()
    try {
        session.startTransaction()
        await accountModel.updateOne(
            { _id: account._id, user: req.user._id, status: "ACTIVE" },
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

        // Create the transaction record
        const [transaction] = await transactionModel.create([{
            fromAccount: accountId,
            toAccount: accountId,
            amount: parsedAmount,
            idempotencyKey,
            status: "COMPLETED"
        }], { session })

        // Create the ledger entry (CREDIT for income, DEBIT for expense)
        await ledgerModel.create([{
            account: accountId,
            amount: parsedAmount,
            transaction: transaction._id,
            type: type === "income" ? "CREDIT" : "DEBIT"
        }], { session })

        // Create the expense record
        const [expense] = await expenseModel.create([{
            user: req.user._id,
            account: accountId,
            amount: parsedAmount,
            type,
            category,
            description: description || "",
            date: parsedDate || new Date(),
            tags: tags || []
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

/**
 * GET /api/expenses
 * List expenses with optional filters
 */
async function getExpenses(req, res) {
    const { category, type, from, to, accountId, limit = 50, page = 1 } = req.query

    const query = { user: req.user._id }

    if (category && !CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid category" })
    }
    if (type && !["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "Invalid type" })
    }
    if (accountId && !mongoose.isObjectIdOrHexString(accountId)) {
        return res.status(400).json({ message: "Invalid accountId" })
    }

    const fromDate = parseOptionalDate(from)
    const toDate = parseOptionalDate(to)
    if (fromDate === undefined || toDate === undefined) {
        return res.status(400).json({ message: "Invalid date filter" })
    }

    if (category) query.category = category
    if (type) query.type = type
    if (accountId) query.account = accountId
    if (from || to) {
        query.date = {}
        if (fromDate) query.date.$gte = fromDate
        if (toDate) query.date.$lte = toDate
    }

    const safePage = parsePositiveInteger(page, 1, 1000000)
    const safeLimit = parsePositiveInteger(limit, 50, 100)
    const skip = (safePage - 1) * safeLimit

    const [ expenses, total ] = await Promise.all([
        expenseModel.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        expenseModel.countDocuments(query)
    ])

    return res.status(200).json({
        expenses,
        pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit)
        }
    })
}

/**
 * GET /api/expenses/summary
 * Get aggregated analytics
 */
async function getExpenseSummary(req, res) {
    const { from, to, accountId } = req.query

    if (accountId && !mongoose.isObjectIdOrHexString(accountId)) {
        return res.status(400).json({ message: "Invalid accountId" })
    }

    const fromDate = parseOptionalDate(from)
    const toDate = parseOptionalDate(to)
    if (fromDate === undefined || toDate === undefined) {
        return res.status(400).json({ message: "Invalid date filter" })
    }

    const matchStage = { user: new mongoose.Types.ObjectId(req.user._id), isDeleted: false }
    if (accountId) matchStage.account = new mongoose.Types.ObjectId(accountId)
    if (from || to) {
        matchStage.date = {}
        if (fromDate) matchStage.date.$gte = fromDate
        if (toDate) matchStage.date.$lte = toDate
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

/**
 * DELETE /api/expenses/:id
 * Soft delete and reverse the ledger effect in one transaction.
 */
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

        // Create a reversal transaction
        const [transaction] = await transactionModel.create([{
            fromAccount: expense.account,
            toAccount: expense.account,
            amount: expense.amount,
            idempotencyKey,
            status: "COMPLETED"
        }], { session })

        // Reverse the ledger entry (flip CREDIT↔DEBIT)
        await ledgerModel.create([{
            account: expense.account,
            amount: expense.amount,
            transaction: transaction._id,
            type: expense.type === "income" ? "DEBIT" : "CREDIT"
        }], { session })

        // Soft delete the expense
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

/**
 * GET /api/expenses/categories
 * Return available categories
 */
function getCategories(req, res) {
    return res.status(200).json({ categories: CATEGORIES })
}

module.exports = {
    createExpense,
    getExpenses,
    getExpenseSummary,
    deleteExpense,
    getCategories
}
