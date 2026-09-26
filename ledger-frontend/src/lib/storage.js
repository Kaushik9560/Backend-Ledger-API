const storageKey = "spendwise-user"

export function readStoredUser() {
    try {
        return JSON.parse(localStorage.getItem(storageKey) || "null")
    } catch {
        return null
    }
}

export function persistStoredSession(user) {
    localStorage.setItem(storageKey, JSON.stringify(user))
}

export function clearStoredSession() {
    localStorage.removeItem(storageKey)
}
