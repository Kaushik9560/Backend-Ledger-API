require("dotenv").config({ quiet: true })

const mongoose = require("mongoose")
const { validateEnvironment } = require("./src/config/env")

const config = validateEnvironment()
const app = require("./src/app")
const connectToDB = require("./src/config/db")

let server
let isShuttingDown = false

async function startServer() {
    try {
        await connectToDB(config.mongoUri)

        server = app.listen(config.port, "0.0.0.0", () => {
            console.log(`Server is running on port ${config.port} (${config.nodeEnv})`)
        })
    } catch (error) {
        console.error("Unable to start server:", error.message)
        process.exit(1)
    }
}

async function shutdown(signal) {
    if (isShuttingDown) {
        return
    }

    isShuttingDown = true
    console.log(`${signal} received. Shutting down gracefully.`)

    const forceExitTimer = setTimeout(() => {
        console.error("Graceful shutdown timed out. Forcing exit.")
        process.exit(1)
    }, 10000)
    forceExitTimer.unref()

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve())
            })
        }

        await mongoose.disconnect()
        process.exit(0)
    } catch (error) {
        console.error("Error during shutdown:", error.message)
        process.exit(1)
    }
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

startServer()
