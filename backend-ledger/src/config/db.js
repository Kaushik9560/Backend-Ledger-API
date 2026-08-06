const mongoose = require("mongoose")


async function connectToDB(uri = process.env.MONGO_URI) {
    if (!uri) {
        throw new Error("MONGO_URI is not set")
    }

    mongoose.set("strictQuery", true)

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000
    })
    console.log("Server is connected to DB")
    return mongoose.connection
}


module.exports = connectToDB
