const fs = require("fs")
const path = require("path")
const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const app = express()
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
const frontendDistPath = path.resolve(__dirname, "../../ledger-frontend/dist")
const shouldServeFrontend = process.env.NODE_ENV === "production" && fs.existsSync(frontendDistPath)

app.use((req, res, next) => {
    const sameOriginCandidates = [
        `http://${req.headers.host}`,
        `https://${req.headers.host}`
    ]

    return cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true)
            }

            if (sameOriginCandidates.includes(origin)) {
                return callback(null, true)
            }

            if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }

            return callback(new Error("Origin is not allowed by CORS"))
        },
        credentials: true
    })(req, res, next)
})

app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")
const expenseRoutes = require("./routes/expense.routes")

/**
 * - Use Routes
 */

app.get("/", (req, res) => {
    if (shouldServeFrontend) {
        return res.sendFile(path.join(frontendDistPath, "index.html"))
    }

    res.send("Ledger Service is up and running")
})

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "backend-ledger"
    })
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)
app.use("/api/expenses", expenseRoutes)

if (shouldServeFrontend) {
    app.use(express.static(frontendDistPath))

    app.use((req, res, next) => {
        if (req.method !== "GET") {
            return next()
        }

        if (req.path.startsWith("/api")) {
            return next()
        }

        if (path.extname(req.path)) {
            return next()
        }

        return res.sendFile(path.join(frontendDistPath, "index.html"))
    })
}

module.exports = app
