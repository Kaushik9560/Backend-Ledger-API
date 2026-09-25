require("dotenv").config({ quiet: true })

const app = require("./src/app")
const connectToDB = require("./src/config/db")

const PORT = process.env.PORT || 3000

async function startServer() {
    await connectToDB()

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
}

startServer().catch((error) => {
    console.error("Unable to start server:", error.message)
    process.exit(1)
})
