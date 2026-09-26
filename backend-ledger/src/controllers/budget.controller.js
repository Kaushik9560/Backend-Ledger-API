const budgetModel = require("../models/budget.model")
const { CATEGORIES } = require("../models/transaction.model")

async function listBudgets(req, res) {
    const budgets = await budgetModel.find({ user: req.user._id })
        .sort({ category: 1 })
        .lean()

    return res.status(200).json({ budgets })
}

async function saveBudget(req, res) {
    const { category, limit } = req.body || {}
    const parsedLimit = Number(limit)

    if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid budget category" })
    }

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0 || parsedLimit > Number.MAX_SAFE_INTEGER) {
        return res.status(400).json({ message: "Budget limit must be a positive number" })
    }

    const budget = await budgetModel.findOneAndUpdate(
        { user: req.user._id, category },
        { $set: { limit: parsedLimit } },
        { upsert: true, returnDocument: 'after', runValidators: true }
    )

    return res.status(200).json({
        message: "Budget saved successfully",
        budget
    })
}

async function removeBudget(req, res) {
    const budget = await budgetModel.findOneAndDelete({
        user: req.user._id,
        category: req.params.category
    })

    if (!budget) {
        return res.status(404).json({ message: "Budget not found" })
    }

    return res.status(200).json({ message: "Budget removed successfully" })
}

module.exports = {
    listBudgets,
    saveBudget,
    removeBudget
}
