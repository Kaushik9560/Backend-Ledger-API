const PLACEHOLDER_SECRETS = new Set([
    "replace-with-a-long-random-secret",
    "change-me",
    "secret"
])

function isEnabled(value) {
    return ["1", "true", "yes"].includes(String(value || "").toLowerCase())
}

function parsePort(value) {
    const port = Number(value || 3000)

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535")
    }

    return port
}

function validateEnvironment(env = process.env) {
    const errors = []
    const isProduction = env.NODE_ENV === "production"
    const jwtSecret = String(env.JWT_SECRET || "")

    if (!env.MONGO_URI) {
        errors.push("MONGO_URI is required")
    }

    if (!jwtSecret) {
        errors.push("JWT_SECRET is required")
    } else if (isProduction && (jwtSecret.length < 32 || PLACEHOLDER_SECRETS.has(jwtSecret))) {
        errors.push("JWT_SECRET must be a non-placeholder value of at least 32 characters in production")
    }

    if (isEnabled(env.EMAIL_ENABLED)) {
        const missingEmailVariables = ["EMAIL_USER", "CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN"]
            .filter(key => !env[key])

        if (missingEmailVariables.length > 0) {
            errors.push(`Email is enabled but these variables are missing: ${missingEmailVariables.join(", ")}`)
        }
    }

    if (env.COOKIE_SAME_SITE && !["lax", "strict", "none"].includes(env.COOKIE_SAME_SITE.toLowerCase())) {
        errors.push("COOKIE_SAME_SITE must be lax, strict, or none")
    }

    let port
    try {
        port = parsePort(env.PORT)
    } catch (error) {
        errors.push(error.message)
    }

    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`)
    }

    return {
        nodeEnv: env.NODE_ENV || "development",
        port,
        mongoUri: env.MONGO_URI
    }
}

module.exports = {
    isEnabled,
    parsePort,
    validateEnvironment
}
