const expenseModel = require("../models/expense.model")
const accountModel = require("../models/account.model")
const ledgerModel = require("../models/ledger.model")
const transactionModel = require("../models/transaction.model")
const mongoose = require("mongoose")

/**
 * POST /api/expenses
 * Create a new income or expense entry (no MongoDB session — works with standalone)
 */
async function createExpense(req, res) {
    const { accountId, amount, type, category, description, date, tags } = req.body

    if (!accountId || !amount || !type || !category) {
        return res.status(400).json({
            message: "accountId, amount, type and category are required"
        })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" })
    }

    // Verify account belongs to user
    const account = await accountModel.findOne({ _id: accountId, user: req.user._id })
    if (!account) {
        return res.status(404).json({ message: "Account not found" })
    }

    if (account.status !== "ACTIVE") {
        return res.status(400).json({ message: "Account is not active" })
    }

    // For expenses, check there's enough balance
    if (type === "expense") {
        const balance = await account.getBalance()
        if (balance < parsedAmount) {
            return res.status(400).json({
                message: `Insufficient balance. Available: ₹${balance.toFixed(2)}, Required: ₹${parsedAmount.toFixed(2)}`
            })
        }
    }

    try {
        const idempotencyKey = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        // Create the transaction record
        const transaction = await transactionModel.create({
            fromAccount: accountId,
            toAccount: accountId,
            amount: parsedAmount,
            idempotencyKey,
            status: "COMPLETED"
        })

        // Create the ledger entry (CREDIT for income, DEBIT for expense)
        await ledgerModel.create({
            account: accountId,
            amount: parsedAmount,
            transaction: transaction._id,
            type: type === "income" ? "CREDIT" : "DEBIT"
        })

        // Create the expense record
        const expense = await expenseModel.create({
            user: req.user._id,
            account: accountId,
            amount: parsedAmount,
            type,
            category,
            description: description || "",
            date: date ? new Date(date) : new Date(),
            tags: tags || []
        })

        return res.status(201).json({
            message: "Expense recorded successfully",
            expense
        })
    } catch (error) {
        console.error("createExpense error:", error)
        return res.status(500).json({ message: "Failed to create expense. Please try again." })
    }
}

/**
 * GET /api/expenses
 * List expenses with optional filters
 */
async function getExpenses(req, res) {
    const { category, type, from, to, accountId, limit = 50, page = 1 } = req.query

    const query = { user: req.user._id }

    if (category) query.category = category
    if (type) query.type = type
    if (accountId) query.account = accountId
    if (from || to) {
        query.date = {}
        if (from) query.date.$gte = new Date(from)
        if (to) query.date.$lte = new Date(to)
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [ expenses, total ] = await Promise.all([
        expenseModel.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        expenseModel.countDocuments(query)
    ])

    return res.status(200).json({
        expenses,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        }
    })
}

/**
 * GET /api/expenses/summary
 * Get aggregated analytics
 */
async function getExpenseSummary(req, res) {
    const { from, to, accountId } = req.query

    const matchStage = { user: new mongoose.Types.ObjectId(req.user._id), isDeleted: false }
    if (accountId) matchStage.account = new mongoose.Types.ObjectId(accountId)
    if (from || to) {
        matchStage.date = {}
        if (from) matchStage.date.$gte = new Date(from)
        if (to) matchStage.date.$lte = new Date(to)
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
 * Soft delete and reverse ledger (no MongoDB session — works with standalone)
 */
async function deleteExpense(req, res) {
    const { id } = req.params

    const expense = await expenseModel.findOne({ _id: id, user: req.user._id })
    if (!expense) {
        return res.status(404).json({ message: "Expense not found" })
    }

    try {
        const idempotencyKey = `del_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        // Create a reversal transaction
        const transaction = await transactionModel.create({
            fromAccount: expense.account,
            toAccount: expense.account,
            amount: expense.amount,
            idempotencyKey,
            status: "COMPLETED"
        })

        // Reverse the ledger entry (flip CREDIT↔DEBIT)
        await ledgerModel.create({
            account: expense.account,
            amount: expense.amount,
            transaction: transaction._id,
            type: expense.type === "income" ? "DEBIT" : "CREDIT"
        })

        // Soft delete the expense
        await expenseModel.updateOne({ _id: expense._id }, { isDeleted: true })

        return res.status(200).json({ message: "Expense deleted successfully" })
    } catch (error) {
        console.error("deleteExpense error:", error)
        return res.status(500).json({ message: "Failed to delete expense" })
    }
}

/**
 * GET /api/expenses/categories
 * Return available categories
 */
function getCategories(req, res) {
    const { CATEGORIES } = require("../models/expense.model")
    return res.status(200).json({ categories: CATEGORIES })
}

module.exports = {
    createExpense,
    getExpenses,
    getExpenseSummary,
    deleteExpense,
    getCategories
}
