const { transactionModel } = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

function transactionMatches(existingTransaction, { fromAccount, toAccount, amount }) {
    return existingTransaction.fromAccount.toString() === fromAccount.toString()
        && existingTransaction.toAccount.toString() === toAccount.toString()
        && existingTransaction.amount === Number(amount)
}

function toTransferResponse(transaction) {
    const event = transaction.toObject ? transaction.toObject() : transaction

    return {
        fromAccount: event.fromAccount,
        toAccount: event.toAccount,
        status: event.status,
        amount: event.amount,
        idempotencyKey: event.idempotencyKey,
        _id: event._id,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        __v: event.__v
    }
}

async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body || {}

    if (!fromAccount || !toAccount || amount === undefined || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (!mongoose.isObjectIdOrHexString(fromAccount) || !mongoose.isObjectIdOrHexString(toAccount)) {
        return res.status(400).json({ message: "Invalid fromAccount or toAccount" })
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > Number.MAX_SAFE_INTEGER) {
        return res.status(400).json({ message: "Amount must be a positive number" })
    }

    if (idempotencyKey.trim().length > 128) {
        return res.status(400).json({ message: "Idempotency key cannot exceed 128 characters" })
    }

    if (fromAccount.toString() === toAccount.toString()) {
        return res.status(400).json({ message: "Source and destination accounts must be different" })
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()

    const sourceAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id,
        isArchived: false
    })

    if (!sourceAccount) {
        return res.status(403).json({ message: "You can only transfer from your own account" })
    }

    const destinationAccount = await accountModel.findOne({
        _id: toAccount,
        user: req.user._id,
        isArchived: false
    })

    if (!destinationAccount) {
        return res.status(400).json({
            message: "You can only transfer to your own account"
        })
    }

    const existingTransaction = await transactionModel.findOne({
        idempotencyKey: normalizedIdempotencyKey
    })

    if (existingTransaction) {
        if (!transactionMatches(existingTransaction, { fromAccount, toAccount, amount: parsedAmount })) {
            return res.status(409).json({
                message: "Idempotency key has already been used for a different transaction"
            })
        }

        if (existingTransaction.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: toTransferResponse(existingTransaction)
            })
        }

        if (existingTransaction.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }

    }


    let transaction
    let session

    try {
        session = await mongoose.startSession()
        session.startTransaction()

        // This write makes concurrent transfers from the same account conflict safely.
        await accountModel.updateOne(
            { _id: sourceAccount._id, user: req.user._id, isArchived: false },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        )

        const balance = await sourceAccount.getBalance({ session })

        if (balance < parsedAmount) {
            await session.abortTransaction()
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${parsedAmount}`
            })
        }

        transaction = (await transactionModel.create([{
            user: req.user._id,
            type: "TRANSFER",
            fromAccount,
            toAccount,
            amount: parsedAmount,
            idempotencyKey: normalizedIdempotencyKey,
            status: "PENDING"
        }], { session }))[ 0 ]

        await ledgerModel.create([{
            account: fromAccount,
            amount: parsedAmount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session })

        await ledgerModel.create([{
            account: toAccount,
            amount: parsedAmount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session })

        transaction.status = "COMPLETED"
        await transaction.save({ session })
        await session.commitTransaction()
    } catch (error) {
        if (session?.inTransaction()) {
            await session.abortTransaction()
        }

        console.error("createTransaction error:", error.message)
        return res.status(error.code === 11000 ? 409 : 503).json({
            message: error.code === 11000
                ? "This idempotency key is already being processed"
                : "Transaction could not be completed safely. Please retry with the same idempotency key."
        })
    } finally {
        if (session) {
            session.endSession()
        }
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: toTransferResponse(transaction)
    })
}

module.exports = {
    createTransaction
}
