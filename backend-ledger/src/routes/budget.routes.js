const express = require("express")
const { requireAuthentication } = require("../middleware/auth.middleware")
const budgetController = require("../controllers/budget.controller")

const router = express.Router()

router.get("/", requireAuthentication, budgetController.listBudgets)
router.post("/", requireAuthentication, budgetController.saveBudget)
router.delete("/:category", requireAuthentication, budgetController.removeBudget)

module.exports = router
