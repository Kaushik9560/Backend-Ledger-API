const fs = require("fs")
const path = require("path")
const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const compression = require("compression")
const helmet = require("helmet")
const mongoose = require("mongoose")
const { rateLimit } = require("express-rate-limit")

const app = express()
const isProduction = process.env.NODE_ENV === "production"
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
const frontendDistPath = path.resolve(__dirname, "../../ledger-frontend/dist")
const shouldServeFrontend = isProduction && fs.existsSync(frontendDistPath)

if (isProduction) {
    app.set("trust proxy", 1)
}

app.disable("x-powered-by")
app.use(helmet({
    hsts: isProduction ? undefined : false,
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "img-src": ["'self'", "data:"],
            "connect-src": ["'self'", ...allowedOrigins],
            "frame-ancestors": ["'none'"]
        }
    },
    frameguard: { action: "deny" }
}))

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

            if (allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.length === 0)) {
                return callback(null, true)
            }

            const error = new Error("Origin is not allowed by CORS")
            error.status = 403
            return callback(error)
        },
        credentials: true
    })(req, res, next)
})

app.use(compression())
app.use(express.json({ limit: "100kb" }))
app.use(cookieParser())

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.API_RATE_LIMIT_MAX) || 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: req => req.method === "OPTIONS"
})

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: req => req.method === "OPTIONS" || req.path === "/session" || req.path === "/logout"
})

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
    const databaseReady = mongoose.connection.readyState === 1

    res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? "ok" : "unavailable",
        service: "backend-ledger",
        database: databaseReady ? "connected" : "disconnected"
    })
})

app.use("/api", apiLimiter)
app.use("/api/auth", authLimiter, authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)
app.use("/api/expenses", expenseRoutes)

app.use("/api", (req, res) => {
    return res.status(404).json({ message: "API endpoint not found" })
})

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

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error)
    }

    let status = error.status || 500
    let message = status < 500
        ? error.message
        : "Something went wrong on the server. Please try again."

    if (error.type === "entity.too.large") {
        status = 413
        message = "Request body is too large"
    } else if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        status = 400
        message = "Request body contains invalid JSON"
    } else if (error.name === "ValidationError") {
        status = 400
        message = Object.values(error.errors).map(item => item.message).join(", ")
    } else if (error.name === "CastError") {
        status = 400
        message = "Invalid identifier"
    } else if (error.code === 11000) {
        status = 409
        message = "A record with this value already exists"
    }

    if (status >= 500) {
        console.error(error)
    }

    return res.status(status).json({ message })
})

module.exports = app
