const express = require("express")
const { requireAuthentication } = require("../middleware/auth.middleware")
const moneyEventController = require("../controllers/expense.controller")

const router = express.Router()

router.get("/summary", requireAuthentication, moneyEventController.getMoneyEventSummary)
router.get("/", requireAuthentication, moneyEventController.listMoneyEvents)
router.post("/", requireAuthentication, moneyEventController.createMoneyEvent)
router.delete("/:id", requireAuthentication, moneyEventController.reverseMoneyEvent)

module.exports = router
