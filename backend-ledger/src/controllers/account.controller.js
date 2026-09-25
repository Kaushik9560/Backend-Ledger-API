const accountModel = require("../models/account.model")

async function createAccount(req, res) {
    const account = await accountModel.create({
        user: req.user._id
    })

    return res.status(201).json({ account })
}

async function listUserAccounts(req, res) {
    const accounts = await accountModel.find({ user: req.user._id })

    return res.status(200).json({ accounts })
}

async function getAccountBalance(req, res) {
    const { accountId } = req.params

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if (!account) {
        return res.status(404).json({
            message: "Account not found"
        })
    }

    const balance = await account.getBalance()

    return res.status(200).json({
        accountId: account._id,
        balance
    })
}

module.exports = {
    createAccount,
    listUserAccounts,
    getAccountBalance
}
