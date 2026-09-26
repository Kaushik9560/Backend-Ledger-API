const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRouter = require("./routes/transaction.routes")
const expenseRouter = require("./routes/expense.routes")
const budgetRouter = require("./routes/budget.routes")

const app = express()

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4173"
].filter(Boolean)

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true)
            return
        }

        callback(new Error("Not allowed by CORS"))
    },
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
app.use("/api/budgets", budgetRouter)

module.exports = app
