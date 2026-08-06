const defaultBaseUrl = import.meta.env.DEV
    ? "http://localhost:3000"
    : window.location.origin

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultBaseUrl).replace(/\/$/, "")
const REQUEST_TIMEOUT_MS = 15000

async function request(path, options = {}) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const headers = {}

    if (options.body) {
        headers["Content-Type"] = "application/json"
    }

    let response
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method: options.method || "GET",
            headers,
            credentials: "include",
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal
        })
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("The server is taking too long to respond. Please try again.")
        }
        throw new Error("Unable to connect to the server. Check your connection and try again.")
    } finally {
        window.clearTimeout(timeout)
    }

    const contentType = response.headers.get("content-type") || ""
    const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text()

    if (!response.ok) {
        const message = typeof payload === "string"
            ? (contentType.includes("text/html") ? "Something went wrong on the server. Please try again." : payload)
            : payload.message || "Request failed"

        if (response.status === 401 && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("ledger:unauthorized", {
                detail: { message }
            }))
        }

        const error = new Error(message)
        error.status = response.status
        throw error
    }

    return payload
}

export const ledgerApi = {
    baseUrl: API_BASE_URL,

    health: () => request("/api/health"),

    register: (payload) =>
        request("/api/auth/register", { method: "POST", body: payload }),

    login: (payload) =>
        request("/api/auth/login", { method: "POST", body: payload }),

    session: () => request("/api/auth/session"),

    logout: () => request("/api/auth/logout", { method: "POST" }),

    listAccounts: () => request("/api/accounts"),

    createAccount: () => request("/api/accounts", { method: "POST" }),

    getBalance: (accountId) => request(`/api/accounts/balance/${accountId}`),

    transfer: (payload) => request("/api/transactions", { method: "POST", body: payload }),

    createExpense: (payload) => request("/api/expenses", { method: "POST", body: payload }),

    listExpenses: (params) => {
        const queryString = params
            ? `?${new URLSearchParams(
                Object.entries(params)
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => [key, String(value)])
            ).toString()}`
            : ""

        return request(`/api/expenses${queryString}`)
    },

    getExpenseSummary: (params) => {
        const queryString = params
            ? `?${new URLSearchParams(
                Object.entries(params)
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => [key, String(value)])
            ).toString()}`
            : ""

        return request(`/api/expenses/summary${queryString}`)
    },

    deleteExpense: (id) => request(`/api/expenses/${id}`, { method: "DELETE" }),

    getCategories: () => request("/api/expenses/categories")
}
