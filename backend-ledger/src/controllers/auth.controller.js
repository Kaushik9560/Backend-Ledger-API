const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")

const TOKEN_TTL_MS = 3 * 24 * 60 * 60 * 1000

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

function buildAuthResponse(user, token) {
    const payload = {
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        }
    }

    const shouldReturnToken = process.env.NODE_ENV !== "production"
        || ["true", "1", "yes"].includes(String(process.env.AUTH_RETURN_TOKEN || "").toLowerCase())

    if (shouldReturnToken) {
        payload.token = token
    }

    return payload
}

/**
* - user register controller
* - POST /api/auth/register
*/
async function userRegisterController(req, res) {
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

    const isExists = await userModel.findOne({
        email: normalizedEmail
    })

    if (isExists) {
        return res.status(422).json({
            message: "User already exists with email.",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email: normalizedEmail,
        password,
        name: name.trim()
    })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    res.cookie("token", token, getCookieOptions())

    res.status(201).json(buildAuthResponse(user, token))

    await emailService.sendRegistrationEmail(user.email, user.name)
}

/**
 * - User Login Controller
 * - POST /api/auth/login
  */

async function userLoginController(req, res) {
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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    res.cookie("token", token, getCookieOptions())

    res.status(200).json(buildAuthResponse(user, token))

}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res) {
    const authorization = req.headers.authorization
    const bearerToken = typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : ""
    const token = req.cookies.token || bearerToken

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

function getCurrentUserController(req, res) {
    return res.status(200).json({
        user: {
            _id: req.user._id,
            email: req.user.email,
            name: req.user.name
        }
    })
}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    getCurrentUserController
}
