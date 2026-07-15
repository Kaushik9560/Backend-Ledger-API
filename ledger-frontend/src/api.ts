const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "")

type RequestOptions = {
    method?: string
    body?: Record<string, unknown>
    token?: string
}

async function request<T>(path: string, options: RequestOptions = {}) {
    const headers: Record<string, string> = {}

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
            : (payload as { message?: string }).message || "Request failed"
        throw new Error(message)
    }

    return payload as T
}

/* ── Types ──────────────────────────────────────────────────── */
export type LedgerUser = {
    _id: string
    name: string
    email: string
}

export type LedgerAccount = {
    _id: string
    currency: string
    status: "ACTIVE" | "FROZEN" | "CLOSED"
    createdAt: string
}

export type Expense = {
    _id: string
    account: string
    amount: number
    type: "income" | "expense"
    category: string
    description: string
    date: string
    tags: string[]
    createdAt: string
}

export type ExpenseSummary = {
    summary: {
        totalIncome: number
        totalExpense: number
        netBalance: number
        incomeCount: number
        expenseCount: number
    }
    categoryBreakdown: Array<{
        _id: { category: string; type: string }
        total: number
        count: number
    }>
    monthlyTrend: Array<{
        _id: { year: number; month: number; type: string }
        total: number
    }>
}

type AuthResponse = {
    user: LedgerUser
    token: string
}

type AccountsResponse = {
    accounts: LedgerAccount[]
}

type BalanceResponse = {
    accountId: string
    balance: number
}

type TransactionResponse = {
    message: string
    transaction: {
        _id: string
        fromAccount: string
        toAccount: string
        amount: number
        status: string
        idempotencyKey: string
        createdAt: string
    }
}

type ExpensesResponse = {
    expenses: Expense[]
    pagination: {
        total: number
        page: number
        limit: number
        pages: number
    }
}

/* ── API client ─────────────────────────────────────────────── */
export const ledgerApi = {
    baseUrl: API_BASE_URL,

    health: () =>
        request<{ status: string; service: string }>("/api/health"),

    register: (payload: { name: string; email: string; password: string }) =>
        request<AuthResponse>("/api/auth/register", { method: "POST", body: payload }),

    login: (payload: { email: string; password: string }) =>
        request<AuthResponse>("/api/auth/login", { method: "POST", body: payload }),

    logout: (token: string) =>
        request<{ message: string }>("/api/auth/logout", { method: "POST", token }),

    listAccounts: (token: string) =>
        request<AccountsResponse>("/api/accounts", { token }),

    createAccount: (token: string) =>
        request<{ account: LedgerAccount }>("/api/accounts", { method: "POST", token }),

    getBalance: (token: string, accountId: string) =>
        request<BalanceResponse>(`/api/accounts/balance/${accountId}`, { token }),

    transfer: (
        token: string,
        payload: { fromAccount: string; toAccount: string; amount: number; idempotencyKey: string }
    ) =>
        request<TransactionResponse>("/api/transactions", { method: "POST", token, body: payload as unknown as Record<string, unknown> }),

    // ── Expense API ──────────────────────────────────────────
    createExpense: (
        token: string,
        payload: { accountId: string; amount: number; type: "income" | "expense"; category: string; description?: string; date?: string; tags?: string[] }
    ) =>
        request<{ message: string; expense: Expense }>("/api/expenses", { method: "POST", token, body: payload as unknown as Record<string, unknown> }),

    listExpenses: (token: string, params?: { category?: string; type?: string; from?: string; to?: string; accountId?: string; limit?: number; page?: number }) => {
        const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ""
        return request<ExpensesResponse>(`/api/expenses${qs}`, { token })
    },

    getExpenseSummary: (token: string, params?: { from?: string; to?: string; accountId?: string }) => {
        const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ""
        return request<ExpenseSummary>(`/api/expenses/summary${qs}`, { token })
    },

    deleteExpense: (token: string, id: string) =>
        request<{ message: string }>(`/api/expenses/${id}`, { method: "DELETE", token }),

    getCategories: (token: string) =>
        request<{ categories: string[] }>("/api/expenses/categories", { token }),
}
