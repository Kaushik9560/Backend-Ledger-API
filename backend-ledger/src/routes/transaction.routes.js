const express = require("express")
const { requireAuthentication } = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller")

const router = express.Router()

router.post("/", requireAuthentication, transactionController.createTransaction)

module.exports = router
