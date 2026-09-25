const express = require("express")
const authController = require("../controllers/auth.controller")
const { requireAuthentication } = require("../middleware/auth.middleware")

const router = express.Router()

router.post("/register", authController.registerUser)
router.post("/login", authController.loginUser)
router.post("/logout", authController.logoutUser)
router.get("/session", requireAuthentication, authController.getCurrentUser)

module.exports = router
