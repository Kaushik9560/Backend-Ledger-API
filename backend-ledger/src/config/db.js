const mongoose = require("mongoose")

async function connectToDB(uri = process.env.MONGO_URI) {
    if (!uri) {
        throw new Error("MONGO_URI is not set")
    }

    await mongoose.connect(uri)

    const { transactionModel } = require("../models/transaction.model")
    await transactionModel.syncIndexes()

    console.log("Server is connected to DB")
}

module.exports = connectToDB
