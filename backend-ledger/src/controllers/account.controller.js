const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

async function createAccount(req, res) {
    const { name } = req.body || {}

    if (typeof name !== "string" || !name.trim() || name.trim().length > 50) {
        return res.status(400).json({
            message: "Account name is required and cannot exceed 50 characters"
        })
    }

    const account = await accountModel.create({
        user: req.user._id,
        name: name.trim()
    })

    return res.status(201).json({ account })
}

async function listUserAccounts(req, res) {
    const accounts = await accountModel.find({
        user: req.user._id,
        isArchived: false
    })

    return res.status(200).json({ accounts })
}

async function getAccountBalance(req, res) {
    const { accountId } = req.params

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id,
        isArchived: false
    })

    if (!account) {
        return res.status(404).json({ message: "Account not found" })
    }

    const balance = await account.getBalance()

    return res.status(200).json({
        accountId: account._id,
        balance
    })
}

async function archiveAccount(req, res) {
    const { accountId } = req.params

    if (!mongoose.isObjectIdOrHexString(accountId)) {
        return res.status(400).json({ message: "Invalid account id" })
    }

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id,
        isArchived: false
    })

    if (!account) {
        return res.status(404).json({ message: "Account not found" })
    }

    const balance = await account.getBalance()
    if (balance !== 0) {
        return res.status(400).json({
            message: "Transfer or spend the remaining balance before deleting this account"
        })
    }

    account.isArchived = true
    await account.save()

    return res.status(200).json({ message: "Account deleted successfully" })
}

module.exports = {
    createAccount,
    listUserAccounts,
    getAccountBalance,
    archiveAccount
}
