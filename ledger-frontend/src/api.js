const defaultBaseUrl = import.meta.env.DEV
    ? "http://localhost:3000"
    : window.location.origin

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultBaseUrl).replace(/\/$/, "")

async function request(path, options = {}) {
    const headers = {}

    if (options.body) {
        headers["Content-Type"] = "application/json"
    }

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        credentials: "include",
        body: options.body ? JSON.stringify(options.body) : undefined
    })

    const contentType = response.headers.get("content-type") || ""
    const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text()

    if (!response.ok) {
        const message = typeof payload === "string"
            ? payload
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

    logout: (token) =>
        request("/api/auth/logout", { method: "POST", token }),

    listAccounts: (token) =>
        request("/api/accounts", { token }),

    createAccount: (token) =>
        request("/api/accounts", { method: "POST", token }),

    getBalance: (token, accountId) =>
        request(`/api/accounts/balance/${accountId}`, { token }),

    transfer: (token, payload) =>
        request("/api/transactions", { method: "POST", token, body: payload }),

    createExpense: (token, payload) =>
        request("/api/expenses", { method: "POST", token, body: payload }),

    listExpenses: (token, params) => {
        const queryString = params
            ? `?${new URLSearchParams(
                Object.entries(params)
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => [key, String(value)])
            ).toString()}`
            : ""

        return request(`/api/expenses${queryString}`, { token })
    },

    getExpenseSummary: (token, params) => {
        const queryString = params
            ? `?${new URLSearchParams(
                Object.entries(params)
                    .filter(([, value]) => value !== undefined)
                    .map(([key, value]) => [key, String(value)])
            ).toString()}`
            : ""

        return request(`/api/expenses/summary${queryString}`, { token })
    },

    deleteExpense: (token, id) =>
        request(`/api/expenses/${id}`, { method: "DELETE", token }),

    getCategories: (token) =>
        request("/api/expenses/categories", { token })
}
