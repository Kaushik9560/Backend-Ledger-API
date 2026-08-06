const assert = require("node:assert/strict")
const test = require("node:test")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const request = require("supertest")
const { MongoMemoryReplSet } = require("mongodb-memory-server")

const app = require("../src/app")
const connectToDB = require("../src/config/db")
const accountModel = require("../src/models/account.model")
const userModel = require("../src/models/user.model")

let replSet

test.before(async () => {
    process.env.JWT_SECRET = "test-secret"
    process.env.EMAIL_ENABLED = "false"
    process.env.TRANSACTION_PROCESSING_DELAY_MS = "0"

    replSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1
        }
    })

    process.env.MONGO_URI = replSet.getUri()
    await connectToDB(process.env.MONGO_URI)
})

test.after(async () => {
    await mongoose.disconnect()

    if (replSet) {
        await replSet.stop()
    }
})

test("ledger backend smoke flow", async (t) => {
    let userToken
    let targetAccountId
    let secondaryToken
    let secondaryAccountId

    await t.test("GET / returns health response", async () => {
        const response = await request(app).get("/")

        assert.equal(response.status, 200)
        assert.equal(response.text, "Ledger Service is up and running")
    })

    await t.test("registers and logs in a user", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Primary User",
                email: "primary@example.com",
                password: "secret123"
            })

        assert.equal(registerResponse.status, 201)
        assert.equal(registerResponse.body.user.email, "primary@example.com")
        assert.ok(registerResponse.body.token)

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "primary@example.com",
                password: "secret123"
            })

        assert.equal(loginResponse.status, 200)
        assert.ok(loginResponse.body.token)
        userToken = loginResponse.body.token
    })

    await t.test("creates a user account", async () => {
        const createAccountResponse = await request(app)
            .post("/api/accounts")
            .set("Authorization", `Bearer ${userToken}`)
            .send()

        assert.equal(createAccountResponse.status, 201)
        assert.equal(createAccountResponse.body.account.status, "ACTIVE")
        targetAccountId = createAccountResponse.body.account._id

        const listAccountsResponse = await request(app)
            .get("/api/accounts")
            .set("Authorization", `Bearer ${userToken}`)

        assert.equal(listAccountsResponse.status, 200)
        assert.equal(listAccountsResponse.body.accounts.length, 1)
    })

    await t.test("funds the account using a system user and reports balance", async () => {
        const systemUser = await userModel.create({
            name: "System User",
            email: "system@example.com",
            password: "secret123",
            systemUser: true
        })

        const systemAccount = await accountModel.create({
            user: systemUser._id
        })

        const systemToken = jwt.sign(
            { userId: systemUser._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        )

        const initialFundsResponse = await request(app)
            .post("/api/transactions/system/initial-funds")
            .set("Authorization", `Bearer ${systemToken}`)
            .send({
                toAccount: targetAccountId,
                amount: 5000,
                idempotencyKey: "seed-primary-account"
            })

        assert.equal(initialFundsResponse.status, 201)
        assert.equal(initialFundsResponse.body.transaction.status, "COMPLETED")
        assert.equal(initialFundsResponse.body.transaction.fromAccount, systemAccount._id.toString())

        const balanceResponse = await request(app)
            .get(`/api/accounts/balance/${targetAccountId}`)
            .set("Authorization", `Bearer ${userToken}`)

        assert.equal(balanceResponse.status, 200)
        assert.equal(balanceResponse.body.balance, 5000)
    })

    await t.test("prevents unauthorized and invalid transfers", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Secondary User",
                email: "secondary@example.com",
                password: "secret123"
            })

        secondaryToken = registerResponse.body.token

        const accountResponse = await request(app)
            .post("/api/accounts")
            .set("Authorization", `Bearer ${secondaryToken}`)
            .send()

        secondaryAccountId = accountResponse.body.account._id

        const unauthorizedResponse = await request(app)
            .post("/api/transactions")
            .set("Authorization", `Bearer ${secondaryToken}`)
            .send({
                fromAccount: targetAccountId,
                toAccount: secondaryAccountId,
                amount: 1,
                idempotencyKey: "unauthorized-transfer"
            })

        assert.equal(unauthorizedResponse.status, 403)

        const invalidAmountResponse = await request(app)
            .post("/api/transactions")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                fromAccount: targetAccountId,
                toAccount: secondaryAccountId,
                amount: -100,
                idempotencyKey: "negative-transfer"
            })

        assert.equal(invalidAmountResponse.status, 400)
    })

    await t.test("completes transfers idempotently", async () => {
        const payload = {
            fromAccount: targetAccountId,
            toAccount: secondaryAccountId,
            amount: 100,
            idempotencyKey: "primary-to-secondary"
        }

        const transferResponse = await request(app)
            .post("/api/transactions")
            .set("Authorization", `Bearer ${userToken}`)
            .send(payload)

        assert.equal(transferResponse.status, 201)
        assert.equal(transferResponse.body.transaction.status, "COMPLETED")

        const retryResponse = await request(app)
            .post("/api/transactions")
            .set("Authorization", `Bearer ${userToken}`)
            .send(payload)

        assert.equal(retryResponse.status, 200)
        assert.equal(retryResponse.body.message, "Transaction already processed")

        const changedRetryResponse = await request(app)
            .post("/api/transactions")
            .set("Authorization", `Bearer ${userToken}`)
            .send({ ...payload, amount: 101 })

        assert.equal(changedRetryResponse.status, 409)

        const [primaryBalanceResponse, secondaryBalanceResponse] = await Promise.all([
            request(app)
                .get(`/api/accounts/balance/${targetAccountId}`)
                .set("Authorization", `Bearer ${userToken}`),
            request(app)
                .get(`/api/accounts/balance/${secondaryAccountId}`)
                .set("Authorization", `Bearer ${secondaryToken}`)
        ])

        assert.equal(primaryBalanceResponse.body.balance, 4900)
        assert.equal(secondaryBalanceResponse.body.balance, 100)
    })

    await t.test("creates, lists, summarizes and reverses an expense", async () => {
        const createResponse = await request(app)
            .post("/api/expenses")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                accountId: targetAccountId,
                amount: 400,
                type: "expense",
                category: "Food & Dining",
                description: "Test dinner"
            })

        assert.equal(createResponse.status, 201)

        const [listResponse, summaryResponse, balanceAfterCreate] = await Promise.all([
            request(app)
                .get("/api/expenses?limit=500")
                .set("Authorization", `Bearer ${userToken}`),
            request(app)
                .get("/api/expenses/summary")
                .set("Authorization", `Bearer ${userToken}`),
            request(app)
                .get(`/api/accounts/balance/${targetAccountId}`)
                .set("Authorization", `Bearer ${userToken}`)
        ])

        assert.equal(listResponse.status, 200)
        assert.equal(listResponse.body.pagination.limit, 100)
        assert.equal(listResponse.body.expenses.length, 1)
        assert.equal(summaryResponse.body.summary.totalExpense, 400)
        assert.equal(balanceAfterCreate.body.balance, 4500)

        const deleteResponse = await request(app)
            .delete(`/api/expenses/${createResponse.body.expense._id}`)
            .set("Authorization", `Bearer ${userToken}`)

        assert.equal(deleteResponse.status, 200)

        const balanceAfterDelete = await request(app)
            .get(`/api/accounts/balance/${targetAccountId}`)
            .set("Authorization", `Bearer ${userToken}`)

        assert.equal(balanceAfterDelete.body.balance, 4900)
    })

    await t.test("restores and clears a browser session with an HttpOnly cookie", async () => {
        const browser = request.agent(app)
        const loginResponse = await browser
            .post("/api/auth/login")
            .send({
                email: "secondary@example.com",
                password: "secret123"
            })

        assert.equal(loginResponse.status, 200)
        assert.match(loginResponse.headers["set-cookie"][0], /HttpOnly/i)
        assert.match(loginResponse.headers["set-cookie"][0], /SameSite=Lax/i)

        const sessionResponse = await browser.get("/api/auth/session")
        assert.equal(sessionResponse.status, 200)
        assert.equal(sessionResponse.body.user.email, "secondary@example.com")

        const logoutResponse = await browser.post("/api/auth/logout")
        assert.equal(logoutResponse.status, 200)

        const expiredSessionResponse = await browser.get("/api/auth/session")
        assert.equal(expiredSessionResponse.status, 401)
    })

    await t.test("rejects stale tokens when the user record no longer exists", async () => {
        const staleToken = jwt.sign(
            { userId: new mongoose.Types.ObjectId().toString() },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        )

        const response = await request(app)
            .get("/api/accounts")
            .set("Authorization", `Bearer ${staleToken}`)

        assert.equal(response.status, 401)
        assert.equal(response.body.message, "Unauthorized access, user no longer exists")
    })
})
