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
