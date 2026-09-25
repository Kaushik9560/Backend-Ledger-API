const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const tokenBlackListModel = require("../models/blackList.model")

function getTokenFromRequest(req) {
    if (req.cookies.token) {
        return req.cookies.token
    }

    const authorization = req.headers.authorization
    if (authorization?.startsWith("Bearer ")) {
        return authorization.slice(7).trim()
    }

    return null
}

async function requireAuthentication(req, res, next) {
    const token = getTokenFromRequest(req)

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized access, token is missing"
        })
    }

    try {
        const blacklistedToken = await tokenBlackListModel.findOne({ token })
        if (blacklistedToken) {
            return res.status(401).json({
                message: "Unauthorized access, token is invalid"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.userId).select("+systemUser")

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized access, user no longer exists"
            })
        }

        req.user = user
        next()
    } catch {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }
}

function requireSystemUser(req, res, next) {
    if (!req.user.systemUser) {
        return res.status(403).json({
            message: "Forbidden access, not a system user"
        })
    }

    next()
}

module.exports = {
    requireAuthentication,
    requireSystemUser
}
