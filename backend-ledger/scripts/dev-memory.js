require("dotenv").config()

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

    const shutdown = async () => {
        server.close(async () => {
            await mongoose.disconnect()
            await replSet.stop()
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
