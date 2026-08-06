const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

function isPositiveAmount(value) {
    const amount = Number(value)
    return Number.isFinite(amount) && amount > 0 && amount <= Number.MAX_SAFE_INTEGER
}

function transactionMatches(existingTransaction, { fromAccount, toAccount, amount }) {
    return existingTransaction.fromAccount.toString() === fromAccount.toString()
        && existingTransaction.toAccount.toString() === toAccount.toString()
        && existingTransaction.amount === Number(amount)
}

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body || {}

    if (!fromAccount || !toAccount || amount === undefined || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (!mongoose.isObjectIdOrHexString(fromAccount) || !mongoose.isObjectIdOrHexString(toAccount)) {
        return res.status(400).json({ message: "Invalid fromAccount or toAccount" })
    }

    if (!isPositiveAmount(amount)) {
        return res.status(400).json({ message: "Amount must be a positive number" })
    }

    if (idempotencyKey.trim().length > 128) {
        return res.status(400).json({ message: "Idempotency key cannot exceed 128 characters" })
    }

    if (fromAccount.toString() === toAccount.toString()) {
        return res.status(400).json({ message: "Source and destination accounts must be different" })
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    const parsedAmount = Number(amount)

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(403).json({ message: "You can only transfer from your own account" })
    }

    const toUserAccount = await accountModel.findById(toAccount)

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: normalizedIdempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (!transactionMatches(isTransactionAlreadyExists, { fromAccount, toAccount, amount: parsedAmount })) {
            return res.status(409).json({
                message: "Idempotency key has already been used for a different transaction"
            })
        }

        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    let transaction;
    let session;
    try {
        /**
         * 4. Lock the source account and derive its balance in this transaction.
         * The account write makes concurrent transfers conflict instead of both
         * spending the same ledger balance.
         */
        session = await mongoose.startSession()
        session.startTransaction()

        await accountModel.updateOne(
            { _id: fromUserAccount._id, user: req.user._id, status: "ACTIVE" },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        )

        const balance = await fromUserAccount.getBalance({ session })

        if (balance < parsedAmount) {
            await session.abortTransaction()
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${parsedAmount}`
            })
        }

        /**
         * 5. Create transaction (PENDING)
         */

        transaction = (await transactionModel.create([ {
            fromAccount,
            toAccount,
            amount: parsedAmount,
            idempotencyKey: normalizedIdempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        await ledgerModel.create([ {
            account: fromAccount,
            amount: parsedAmount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        await ledgerModel.create([ {
            account: toAccount,
            amount: parsedAmount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

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
    /**
     * 10. Send email notification
     */
    await emailService.sendTransactionEmail(req.user.email, req.user.name, parsedAmount, toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body || {}

    if (!toAccount || amount === undefined || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    if (!mongoose.isObjectIdOrHexString(toAccount)) {
        return res.status(400).json({ message: "Invalid toAccount" })
    }

    if (!isPositiveAmount(amount)) {
        return res.status(400).json({ message: "Amount must be a positive number" })
    }

    const normalizedIdempotencyKey = idempotencyKey.trim()
    if (normalizedIdempotencyKey.length > 128) {
        return res.status(400).json({ message: "Idempotency key cannot exceed 128 characters" })
    }

    const parsedAmount = Number(amount)

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    const existingTransaction = await transactionModel.findOne({
        idempotencyKey: normalizedIdempotencyKey
    })

    if (existingTransaction) {
        if (!transactionMatches(existingTransaction, {
            fromAccount: fromUserAccount._id,
            toAccount,
            amount: parsedAmount
        })) {
            return res.status(409).json({
                message: "Idempotency key has already been used for a different transaction"
            })
        }

        return res.status(200).json({
            message: "Initial funds transaction already processed",
            transaction: existingTransaction
        })
    }


    let session;
    try {
        session = await mongoose.startSession()
        session.startTransaction()

        await accountModel.updateMany(
            { _id: { $in: [fromUserAccount._id, toUserAccount._id] } },
            { $set: { lastTransactionAt: new Date() } },
            { session }
        )

        const transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount: parsedAmount,
            idempotencyKey: normalizedIdempotencyKey,
            status: "PENDING"
        })

        await ledgerModel.create([ {
            account: fromUserAccount._id,
            amount: parsedAmount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        await ledgerModel.create([ {
            account: toAccount,
            amount: parsedAmount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        transaction.status = "COMPLETED"
        await transaction.save({ session })

        await session.commitTransaction()

        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction: transaction
        })
    } catch (error) {
        if (session?.inTransaction()) {
            await session.abortTransaction()
        }

        return res.status(500).json({
            message: "Unable to add initial funds right now"
        })
    } finally {
        if (session) {
            session.endSession()
        }
    }


}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}
