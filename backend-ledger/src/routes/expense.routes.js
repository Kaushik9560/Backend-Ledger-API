const { Router } = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const expenseController = require("../controllers/expense.controller")

const expenseRoutes = Router()

// All routes require authentication
expenseRoutes.use(authMiddleware.authMiddleware)

/**
 * GET /api/expenses/categories
 * Get list of available categories
 */
expenseRoutes.get("/categories", expenseController.getCategories)

/**
 * GET /api/expenses/summary
 * Get aggregated income/expense analytics
 */
expenseRoutes.get("/summary", expenseController.getExpenseSummary)

/**
 * GET /api/expenses
 * List all expenses with optional filters
 */
expenseRoutes.get("/", expenseController.getExpenses)

/**
 * POST /api/expenses
 * Create a new expense or income entry
 */
expenseRoutes.post("/", expenseController.createExpense)

/**
 * DELETE /api/expenses/:id
 * Delete (reverse) an expense
 */
expenseRoutes.delete("/:id", expenseController.deleteExpense)

module.exports = expenseRoutes
