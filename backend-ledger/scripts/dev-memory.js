require("dotenv").config({ quiet: true })

const mongoose = require("mongoose")
const { MongoMemoryReplSet } = require("mongodb-memory-server")

const app = require("../src/app")
const connectToDB = require("../src/config/db")

const PORT = Number(process.env.PORT) || 3000

async function startInMemoryServer() {
    const replSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1
        }
    })

    await connectToDB(replSet.getUri())

    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
        console.log("Using in-memory MongoDB replica set")
    })

    let isShuttingDown = false
    const shutdown = async () => {
        if (isShuttingDown) {
            return
        }

        isShuttingDown = true

        server.close(async () => {
            await mongoose.disconnect()
            try {
                await replSet.stop()
            } catch (error) {
                console.warn("In-memory MongoDB was already stopped:", error.message)
            }
            process.exit(0)
        })
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
}

startInMemoryServer().catch((error) => {
    console.error("Unable to start in-memory server:", error.message)
    process.exit(1)
})
