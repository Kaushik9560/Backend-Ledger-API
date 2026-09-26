const mongoose = require("mongoose")
const { CATEGORIES } = require("./transaction.model")

const budgetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    category: {
        type: String,
        enum: CATEGORIES,
        required: true
    },
    limit: {
        type: Number,
        required: true,
        min: 0.01
    }
}, {
    timestamps: true
})

budgetSchema.index({ user: 1, category: 1 }, { unique: true })

const budgetModel = mongoose.model("budget", budgetSchema)

module.exports = budgetModel
