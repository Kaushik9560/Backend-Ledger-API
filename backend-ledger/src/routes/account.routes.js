const express = require("express")
const { requireAuthentication } = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")

const router = express.Router()

router.post("/", requireAuthentication, accountController.createAccount)

router.get("/", requireAuthentication, accountController.listUserAccounts)

router.get("/balance/:accountId", requireAuthentication, accountController.getAccountBalance)

module.exports = router
