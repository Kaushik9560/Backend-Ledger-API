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

const expenseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "Expense must be associated with a user" ]
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [ true, "Expense must be associated with an account" ]
    },
    amount: {
        type: Number,
        required: [ true, "Amount is required" ],
        min: [ 0.01, "Amount must be greater than 0" ]
    },
    type: {
        type: String,
        enum: {
            values: [ "income", "expense" ],
            message: "Type must be either income or expense"
        },
        required: [ true, "Type is required" ]
    },
    category: {
        type: String,
        enum: {
            values: CATEGORIES,
            message: "Invalid category"
        },
        required: [ true, "Category is required" ]
    },
    description: {
        type: String,
        trim: true,
        maxlength: [ 200, "Description cannot exceed 200 characters" ],
        default: ""
    },
    date: {
        type: Date,
        required: [ true, "Date is required" ],
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

expenseSchema.index({ user: 1, date: -1 })

// Hide soft-deleted expenses from normal queries.
expenseSchema.pre(/^find/, function () {
    this.where({ isDeleted: false })
})

const expenseModel = mongoose.model("expense", expenseSchema)

module.exports = { expenseModel, CATEGORIES }
