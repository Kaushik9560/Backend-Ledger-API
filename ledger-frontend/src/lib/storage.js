export const storageKeys = {
    token: "spendwise-token",
    user: "spendwise-user",
    budgets: "spendwise-budgets"
}

export function readBudgets() {
    try {
        return JSON.parse(localStorage.getItem(storageKeys.budgets) || "[]")
    } catch {
        return []
    }
}

export function saveBudgets(budgets) {
    localStorage.setItem(storageKeys.budgets, JSON.stringify(budgets))
}

export function readStoredUser() {
    try {
        return JSON.parse(localStorage.getItem(storageKeys.user) || "null")
    } catch {
        return null
    }
}

export function readStoredToken() {
    return localStorage.getItem(storageKeys.token) || ""
}

export function persistStoredSession(user, token) {
    localStorage.setItem(storageKeys.user, JSON.stringify(user))
    localStorage.setItem(storageKeys.token, token)
}

export function clearStoredSession() {
    localStorage.removeItem(storageKeys.user)
    localStorage.removeItem(storageKeys.token)
}
