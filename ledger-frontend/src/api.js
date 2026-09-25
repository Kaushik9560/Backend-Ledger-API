const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"

async function request(path, options = {}) {
    let response

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method: options.method || "GET",
            headers: options.body ? { "Content-Type": "application/json" } : {},
            credentials: "include",
            body: options.body ? JSON.stringify(options.body) : undefined
        })
    } catch {
        throw new Error("Unable to connect to the server. Check your connection and try again.")
    }

    const data = await response.json()

    if (!response.ok) {
        const message = data.message || "Request failed"

        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent("ledger:unauthorized", {
                detail: { message }
            }))
        }

        const error = new Error(message)
        error.status = response.status
        throw error
    }

    return data
}

function buildQueryString(params) {
    if (!params) {
        return ""
    }

    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            query.set(key, value)
        }
    })

    return `?${query.toString()}`
}

export const ledgerApi = {
    baseUrl: API_BASE_URL,
    health: () => request("/api/health"),
    register: (body) => request("/api/auth/register", { method: "POST", body }),
    login: (body) => request("/api/auth/login", { method: "POST", body }),
    session: () => request("/api/auth/session"),
    logout: () => request("/api/auth/logout", { method: "POST" }),
    listAccounts: () => request("/api/accounts"),
    createAccount: () => request("/api/accounts", { method: "POST" }),
    getBalance: (accountId) => request(`/api/accounts/balance/${accountId}`),
    transfer: (body) => request("/api/transactions", { method: "POST", body }),
    createExpense: (body) => request("/api/expenses", { method: "POST", body }),
    listExpenses: (params) => request("/api/expenses" + buildQueryString(params)),
    getExpenseSummary: (params) => request("/api/expenses/summary" + buildQueryString(params)),
    deleteExpense: (id) => request(`/api/expenses/${id}`, { method: "DELETE" }),
    getCategories: () => request("/api/expenses/categories")
}
