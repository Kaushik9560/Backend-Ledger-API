const express = require("express")
const { requireAuthentication, requireSystemUser } = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const router = express.Router()

router.post("/", requireAuthentication, transactionController.createTransaction)

router.post("/system/initial-funds", requireAuthentication, requireSystemUser, transactionController.createInitialFundsTransaction)

module.exports = router
