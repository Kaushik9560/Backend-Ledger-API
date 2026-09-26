const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blackList.model")

const TOKEN_TTL_MS = 3 * 24 * 60 * 60 * 1000

function createToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "3d" })
}

function getCookieOptions(includeMaxAge = true) {
    const configuredSameSite = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase()
    const sameSite = ["lax", "strict", "none"].includes(configuredSameSite)
        ? configuredSameSite
        : "lax"
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite,
        path: "/"
    }

    if (includeMaxAge) {
        options.maxAge = TOKEN_TTL_MS
    }

    return options
}

function buildAuthResponse(user) {
    return {
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        }
    }
}

async function registerUser(req, res) {
    const { email, password, name } = req.body || {}

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof name !== "string" ||
        !email.trim() ||
        !name.trim() ||
        password.length < 6 ||
        password.length > 128 ||
        email.length > 254 ||
        name.length > 100
    ) {
        return res.status(400).json({
            message: "A valid name, email and password (6-128 characters) are required"
        })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await userModel.findOne({
        email: normalizedEmail
    })

    if (existingUser) {
        return res.status(422).json({
            message: "User already exists with email."
        })
    }

    const user = await userModel.create({
        email: normalizedEmail,
        password,
        name: name.trim()
    })

    const token = createToken(user._id)

    res.cookie("token", token, getCookieOptions())

    res.status(201).json(buildAuthResponse(user))

}

async function loginUser(req, res) {
    const { email, password } = req.body || {}

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        })
    }

    const user = await userModel.findOne({ email: email.trim().toLowerCase() }).select("+password")

    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const isValidPassword = await user.comparePassword(password)

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const token = createToken(user._id)

    res.cookie("token", token, getCookieOptions())

    res.status(200).json(buildAuthResponse(user))
}

async function logoutUser(req, res) {
    const token = req.cookies.token

    if (!token || token.length > 4096) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }

    await tokenBlackListModel.updateOne(
        { token },
        { $setOnInsert: { token } },
        { upsert: true }
    )

    res.clearCookie("token", getCookieOptions(false))

    res.status(200).json({
        message: "User logged out successfully"
    })
}

function getCurrentUser(req, res) {
    return res.status(200).json({
        user: {
            _id: req.user._id,
            email: req.user.email,
            name: req.user.name
        }
    })
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
}
