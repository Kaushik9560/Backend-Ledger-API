const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRouter = require("./routes/transaction.routes")
const expenseRouter = require("./routes/expense.routes")

const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "backend-ledger",
        database: "connected"
    })
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRouter)
app.use("/api/expenses", expenseRouter)

module.exports = app
