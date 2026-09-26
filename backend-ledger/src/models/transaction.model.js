const mongoose = require("mongoose")

const CATEGORIES = [
    "Food & Dining",
    "Transport",
    "Shopping",
    "Bills & Utilities",
    "Entertainment",
    "Health & Medical",
    "Education",
    "Travel",
    "Salary & Income",
    "Investments",
    "Rent & Housing",
    "Others"
]

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Transaction must be associated with a user" ],
        index: true
    },
    type: {
        type: String,
        enum: [ "INCOME", "EXPENSE", "TRANSFER", "REVERSAL" ],
        required: [ true, "Transaction type is required" ]
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account"
    },
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account"
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account"
    },
    amount: {
        type: Number,
        required: [ true, "Transaction amount is required" ],
        min: [ 0.01, "Transaction amount must be greater than zero" ]
    },
    category: {
        type: String,
        enum: CATEGORIES
    },
    description: {
        type: String,
        trim: true,
        maxlength: [ 200, "Description cannot exceed 200 characters" ],
        default: ""
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: [ "PENDING", "COMPLETED" ],
        default: "COMPLETED"
    },
    idempotencyKey: {
        type: String,
        maxlength: [ 128, "Idempotency key cannot exceed 128 characters" ],
        unique: true,
        sparse: true
    },
    reversesTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
})

transactionSchema.index({ user: 1, type: 1, date: -1 })

const transactionModel = mongoose.model("transaction", transactionSchema)

module.exports = { transactionModel, CATEGORIES }
