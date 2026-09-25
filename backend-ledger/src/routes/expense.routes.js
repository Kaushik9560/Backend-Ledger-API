const express = require("express")
const { requireAuthentication } = require("../middleware/auth.middleware")
const expenseController = require("../controllers/expense.controller")

const router = express.Router()

router.get("/categories", requireAuthentication, expenseController.getCategories)
router.get("/summary", requireAuthentication, expenseController.getExpenseSummary)
router.get("/", requireAuthentication, expenseController.getExpenses)
router.post("/", requireAuthentication, expenseController.createExpense)
router.delete("/:id", requireAuthentication, expenseController.deleteExpense)

module.exports = router
