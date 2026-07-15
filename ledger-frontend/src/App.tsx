import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import type { FormEvent } from "react"
import { ledgerApi } from "./api"
import type { Expense, ExpenseSummary, LedgerAccount, LedgerUser } from "./api"
import "./style.css"

/* ── Constants ────────────────────────────────────────────── */
type AuthMode = "register" | "login"
type ActiveTab = "dashboard" | "expenses" | "analytics" | "accounts" | "transfer" | "budget"
type BusyAction = "register" | "login" | "logout" | "createAccount" | "refreshAccounts" | "addExpense" | "transfer" | "seeding" | null
type ToastType = "success" | "error" | "info"
type Budget = { category: string; limit: number }

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
    "Food & Dining":       { icon: "🍔", color: "var(--cat-food)" },
    "Transport":           { icon: "🚗", color: "var(--cat-transport)" },
    "Shopping":            { icon: "🛍️", color: "var(--cat-shopping)" },
    "Bills & Utilities":   { icon: "⚡", color: "var(--cat-bills)" },
    "Entertainment":       { icon: "🎬", color: "var(--cat-entertainment)" },
    "Health & Medical":    { icon: "🏥", color: "var(--cat-health)" },
    "Education":           { icon: "📚", color: "var(--cat-education)" },
    "Travel":              { icon: "✈️", color: "var(--cat-travel)" },
    "Salary & Income":     { icon: "💼", color: "var(--cat-salary)" },
    "Investments":         { icon: "📈", color: "var(--cat-investments)" },
    "Rent & Housing":      { icon: "🏠", color: "var(--cat-rent)" },
    "Others":              { icon: "📦", color: "var(--cat-others)" },
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const storageKeys = { token: "spendwise-token", user: "spendwise-user", budgets: "spendwise-budgets" }

function readBudgets(): Budget[] {
    try { return JSON.parse(localStorage.getItem(storageKeys.budgets) || "[]") as Budget[] }
    catch { return [] }
}

function saveBudgets(budgets: Budget[]) {
    localStorage.setItem(storageKeys.budgets, JSON.stringify(budgets))
}

/* ── Helpers ──────────────────────────────────────────────── */
function readStoredUser() {
    try { return JSON.parse(localStorage.getItem(storageKeys.user) || "null") as LedgerUser | null }
    catch { return null }
}

function fmt(amount: number, currency = "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
}

function fmtDate(dateStr: string) {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d)
}

function fmtRelative(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return "Today"
    if (diff === 1) return "Yesterday"
    if (diff < 7) return `${diff} days ago`
    return fmtDate(dateStr)
}

function genIdem() {
    return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function maskToken(t: string) {
    if (!t || t.length <= 10) return t || "—"
    return `${t.slice(0, 8)}...${t.slice(-6)}`
}

/* ── Icons ────────────────────────────────────────────────── */
const Icon = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={3} y={3} width={7} height={7} rx={1}/><rect x={14} y={3} width={7} height={7} rx={1}/><rect x={3} y={14} width={7} height={7} rx={1}/><rect x={14} y={14} width={7} height={7} rx={1}/></svg>,
    expenses:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    analytics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    accounts:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x={2} y={5} width={20} height={14} rx={2}/><line x1={2} y1={10} x2={22} y2={10}/></svg>,
    transfer:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
    logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1={21} y1={12} x2={9} y2={12}/></svg>,
    plus:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/></svg>,
    trash:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    refresh:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    close:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>,
    chevron:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>,
    check:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>,
    income:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1={12} y1={19} x2={12} y2={5}/><polyline points="5 12 12 5 19 12"/></svg>,
    expense:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1={12} y1={5} x2={12} y2={19}/><polyline points="19 12 12 19 5 12"/></svg>,
    wallet:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>,
    budget:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M12 6v6l4 2"/></svg>,
    edit:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    seed:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><ellipse cx={12} cy={5} rx={9} ry={3}/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    download:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1={12} y1={15} x2={12} y2={3}/></svg>,
}

/* ── Toast Component ─────────────────────────────────────── */
type Toast = { id: number; type: ToastType; message: string }

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <span className="toast-icon">
                        {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
                    </span>
                    <span className="toast-msg">{t.message}</span>
                    <button className="toast-close" onClick={() => onRemove(t.id)}>{Icon.close}</button>
                </div>
            ))}
        </div>
    )
}

/* ── Add Expense Modal ───────────────────────────────────── */
type ExpenseFormState = {
    accountId: string
    amount: string
    type: "income" | "expense"
    category: string
    description: string
    date: string
    tags: string
}

const emptyExpenseForm = (): ExpenseFormState => ({
    accountId: "",
    amount: "",
    type: "expense",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    tags: ""
})

function AddExpenseModal({
    accounts,
    onClose,
    onSubmit,
    busy
}: {
    accounts: LedgerAccount[]
    onClose: () => void
    onSubmit: (form: ExpenseFormState) => Promise<void>
    busy: boolean
}) {
    const [form, setForm] = useState<ExpenseFormState>(emptyExpenseForm)
    const categories = Object.keys(CATEGORY_META)
    const overlayRef = useRef<HTMLDivElement>(null)

    function handleOverlayClick(e: React.MouseEvent) {
        if (e.target === overlayRef.current) onClose()
    }

    function set(field: keyof ExpenseFormState, value: string) {
        setForm(f => ({ ...f, [field]: value }))
    }

    return (
        <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
            <div className="modal" role="dialog" aria-modal="true" aria-label="Add Transaction">
                <div className="modal-header">
                    <h2 className="modal-title">Add Transaction</h2>
                    <button className="icon-btn" onClick={onClose} id="modal-close-btn">{Icon.close}</button>
                </div>

                {/* Type toggle */}
                <div className="type-toggle">
                    <button
                        id="type-expense-btn"
                        className={`type-btn type-expense ${form.type === "expense" ? "active" : ""}`}
                        onClick={() => { set("type", "expense"); if (!form.category || form.category === "Salary & Income") set("category", "") }}
                        type="button"
                    >
                        <span className="type-icon">{Icon.expense}</span> Expense
                    </button>
                    <button
                        id="type-income-btn"
                        className={`type-btn type-income ${form.type === "income" ? "active" : ""}`}
                        onClick={() => { set("type", "income"); set("category", "Salary & Income") }}
                        type="button"
                    >
                        <span className="type-icon">{Icon.income}</span> Income
                    </button>
                </div>

                <form
                    className="modal-form"
                    onSubmit={e => { e.preventDefault(); void onSubmit(form) }}
                >
                    {/* Amount */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-amount">Amount (₹)</label>
                        <div className="amount-input-wrap">
                            <span className="amount-prefix">₹</span>
                            <input
                                id="exp-amount"
                                className="form-input amount-input"
                                type="number"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={e => set("amount", e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Account */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-account">Account</label>
                        <select
                            id="exp-account"
                            className="form-input form-select"
                            value={form.accountId}
                            onChange={e => set("accountId", e.target.value)}
                            required
                        >
                            <option value="">Select account...</option>
                            {accounts.filter(a => a.status === "ACTIVE").map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.currency} · ...{a._id.slice(-8)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category */}
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <div className="category-grid">
                            {categories.map(cat => {
                                const meta = CATEGORY_META[cat]
                                const show = form.type === "income" ? ["Salary & Income", "Investments", "Others"].includes(cat) : !["Salary & Income"].includes(cat)
                                if (!show) return null
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        id={`cat-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                                        className={`cat-chip ${form.category === cat ? "selected" : ""}`}
                                        style={{ "--cat-color": meta.color } as React.CSSProperties}
                                        onClick={() => set("category", cat)}
                                    >
                                        <span>{meta.icon}</span>
                                        <span>{cat}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-desc">Description <span style={{opacity:0.5}}>(optional)</span></label>
                        <input
                            id="exp-desc"
                            className="form-input"
                            type="text"
                            placeholder="e.g. Lunch at Cafe Coffee Day"
                            value={form.description}
                            onChange={e => set("description", e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* Date */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-date">Date</label>
                        <input
                            id="exp-date"
                            className="form-input"
                            type="date"
                            value={form.date}
                            onChange={e => set("date", e.target.value)}
                            max={new Date().toISOString().split("T")[0]}
                            required
                        />
                    </div>

                    <button
                        id="modal-submit-btn"
                        className={`btn btn-full btn-lg ${form.type === "income" ? "btn-income" : "btn-expense"}`}
                        type="submit"
                        disabled={busy || !form.amount || !form.accountId || !form.category}
                    >
                        {busy
                            ? <><span className="spinner" /> Saving...</>
                            : form.type === "income"
                                ? <>{Icon.income} Record Income</>
                                : <>{Icon.expense} Add Expense</>
                        }
                    </button>
                </form>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   Main App
══════════════════════════════════════════════════════════ */
export default function App() {
    /* Auth */
    const [mode, setMode] = useState<AuthMode>("login")
    const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" })
    const [user, setUser] = useState<LedgerUser | null>(() => readStoredUser())
    const [token, setToken] = useState(() => localStorage.getItem(storageKeys.token) || "")

    /* Data */
    const [accounts, setAccounts] = useState<LedgerAccount[]>([])
    const [balances, setBalances] = useState<Record<string, number>>({})
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [summary, setSummary] = useState<ExpenseSummary | null>(null)
    const [health, setHealth] = useState<"checking" | "online" | "offline">("checking")

    /* Transfer form */
    const [transfer, setTransfer] = useState({ fromAccount: "", toAccount: "", amount: "" })

    /* UI */
    const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard")
    const [busyAction, setBusyAction] = useState<BusyAction>(null)
    const [showModal, setShowModal] = useState(false)
    const [toasts, setToasts] = useState<Toast[]>([])
    const [expenseFilter, setExpenseFilter] = useState<"all" | "income" | "expense">("all")
    const [budgets, setBudgets] = useState<Budget[]>(() => readBudgets())
    const [budgetEdit, setBudgetEdit] = useState<{ category: string; value: string } | null>(null)
    const [, startTransition] = useTransition()

    /* Derived */
    const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0)

    /* ── Toast ─────────────────────────────────────────── */
    function toast(type: ToastType, message: string) {
        const id = Date.now() + Math.random()
        setToasts(ts => [...ts, { id, type, message }])
        setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
    }
    function removeToast(id: number) { setToasts(ts => ts.filter(t => t.id !== id)) }

    /* ── Session ───────────────────────────────────────── */
    function persistSession(u: LedgerUser, t: string) {
        localStorage.setItem(storageKeys.user, JSON.stringify(u))
        localStorage.setItem(storageKeys.token, t)
        setUser(u); setToken(t)
    }

    function clearSession() {
        localStorage.removeItem(storageKeys.user)
        localStorage.removeItem(storageKeys.token)
        setUser(null); setToken(""); setAccounts([]); setBalances({})
        setExpenses([]); setSummary(null)
    }

    /* ── Health ────────────────────────────────────────── */
    async function runHealthCheck() {
        setHealth("checking")
        try {
            await ledgerApi.health()
            setHealth("online")
        } catch {
            setHealth("offline")
        }
    }

    /* ── Accounts ──────────────────────────────────────── */
    const loadAccounts = useCallback(async (activeToken = token) => {
        if (!activeToken) return
        try {
            const res = await ledgerApi.listAccounts(activeToken)
            setAccounts(res.accounts)
            // Load all balances
            const balanceMap: Record<string, number> = {}
            await Promise.all(res.accounts.map(async acc => {
                try {
                    const b = await ledgerApi.getBalance(activeToken, acc._id)
                    balanceMap[acc._id] = b.balance
                } catch { balanceMap[acc._id] = 0 }
            }))
            setBalances(balanceMap)
        } catch { /* silent */ }
    }, [token])

    async function handleCreateAccount() {
        if (!token) return
        setBusyAction("createAccount")
        try {
            const res = await ledgerApi.createAccount(token)
            setAccounts(cur => [res.account, ...cur])
            setBalances(cur => ({ ...cur, [res.account._id]: 0 }))
            toast("success", "New account created!")
        } catch (e) {
            toast("error", e instanceof Error ? e.message : "Failed to create account")
        } finally {
            setBusyAction(null)
        }
    }

    /* ── Expenses ──────────────────────────────────────── */
    const loadExpenses = useCallback(async (activeToken = token) => {
        if (!activeToken) return
        try {
            const res = await ledgerApi.listExpenses(activeToken, { limit: 100 })
            startTransition(() => setExpenses(res.expenses))
        } catch { /* silent */ }
    }, [token])

    const loadSummary = useCallback(async (activeToken = token) => {
        if (!activeToken) return
        try {
            const res = await ledgerApi.getExpenseSummary(activeToken)
            startTransition(() => setSummary(res))
        } catch { /* silent */ }
    }, [token])

    async function handleAddExpense(form: ExpenseFormState) {
        setBusyAction("addExpense")
        try {
            await ledgerApi.createExpense(token, {
                accountId: form.accountId,
                amount: parseFloat(form.amount),
                type: form.type,
                category: form.category,
                description: form.description,
                date: form.date,
                tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : []
            })
            toast("success", `${form.type === "income" ? "Income" : "Expense"} recorded!`)
            setShowModal(false)
            await Promise.all([loadExpenses(), loadSummary(), loadAccounts()])
        } catch (e) {
            toast("error", e instanceof Error ? e.message : "Failed to save")
        } finally {
            setBusyAction(null)
        }
    }

    async function handleDeleteExpense(id: string) {
        if (!confirm("Delete this entry? The balance will be reversed.")) return
        try {
            await ledgerApi.deleteExpense(token, id)
            toast("success", "Entry deleted and balance reversed.")
            await Promise.all([loadExpenses(), loadSummary(), loadAccounts()])
        } catch (e) {
            toast("error", e instanceof Error ? e.message : "Failed to delete")
        }
    }

    /* -- Seed demo data ---------------------------------------- */
    async function handleSeedData() {
        if (!accounts.length) return toast('error', 'Create an account first!')
        const acc = accounts.find(a => a.status === 'ACTIVE')
        if (!acc) return toast('error', 'No active account')
        setBusyAction('seeding')
        const seeds: Array<{ type: 'income' | 'expense'; category: string; amount: number; description: string; daysAgo: number }> = [
            { type: 'income',  category: 'Salary & Income',   amount: 75000, description: 'Monthly salary',        daysAgo: 1  },
            { type: 'expense', category: 'Rent & Housing',    amount: 18000, description: 'Monthly rent',           daysAgo: 1  },
            { type: 'expense', category: 'Food & Dining',     amount: 3200,  description: 'Groceries & dining',     daysAgo: 2  },
            { type: 'expense', category: 'Transport',         amount: 1500,  description: 'Uber & metro',           daysAgo: 3  },
            { type: 'expense', category: 'Bills & Utilities', amount: 2100,  description: 'Electricity & internet', daysAgo: 5  },
            { type: 'expense', category: 'Entertainment',     amount: 800,   description: 'Netflix & Hotstar',      daysAgo: 7  },
            { type: 'expense', category: 'Shopping',          amount: 4500,  description: 'Clothes & accessories',  daysAgo: 8  },
            { type: 'income',  category: 'Investments',       amount: 5000,  description: 'Dividend payout',        daysAgo: 10 },
            { type: 'expense', category: 'Health & Medical',  amount: 1200,  description: 'Pharmacy & checkup',     daysAgo: 12 },
            { type: 'expense', category: 'Education',         amount: 2500,  description: 'Udemy courses',          daysAgo: 15 },
        ]
        let added = 0
        for (const s of seeds) {
            const d = new Date(); d.setDate(d.getDate() - s.daysAgo)
            try {
                await ledgerApi.createExpense(token, {
                    accountId: acc._id, amount: s.amount, type: s.type,
                    category: s.category, description: s.description,
                    date: d.toISOString().split('T')[0]
                })
                added++
            } catch { /* skip if balance too low */ }
        }
        await Promise.all([loadExpenses(), loadSummary(), loadAccounts()])
        toast('success', added + ' demo transactions added!')
        setBusyAction(null)
    }

    /* -- CSV Export --------------------------------------------- */
    function handleExportCSV() {
        if (!expenses.length) return toast('info', 'No transactions to export')
        const headers = ['Date','Type','Category','Description','Amount (INR)']
        const rows = expenses.map(e => [
            new Date(e.date).toLocaleDateString('en-IN'),
            e.type, e.category,
            "\"" + e.description.replace(/\"/g, "\"\"") + "\"",
            e.amount
        ])
        const csv = [headers, ...rows].map(r => r.join(',')).join('\\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url
        a.download = 'spendwise-' + new Date().toISOString().split('T')[0] + '.csv'
        a.click(); URL.revokeObjectURL(url)
        toast('success', 'CSV downloaded!')
    }

    /* -- Budget helpers ----------------------------------------- */
    function handleSaveBudget(category: string, value: string) {
        const limit = parseFloat(value)
        if (isNaN(limit) || limit <= 0) { toast('error', 'Enter a valid amount'); return }
        const updated = budgets.filter(b => b.category !== category)
        updated.push({ category, limit })
        setBudgets(updated); saveBudgets(updated)
        setBudgetEdit(null); toast('success', 'Budget saved for ' + category)
    }

    function handleRemoveBudget(category: string) {
        const updated = budgets.filter(b => b.category !== category)
        setBudgets(updated); saveBudgets(updated)
        toast('info', 'Budget removed')
    }

    /* ── Auth ──────────────────────────────────────────── */
    async function handleAuthSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const { name, email, password } = authForm
        if (mode === "register" && !name.trim()) return toast("error", "Name is required")
        if (!email.trim() || !password) return toast("error", "Email and password are required")
        setBusyAction(mode)
        try {
            const res = mode === "register"
                ? await ledgerApi.register({ name: name.trim(), email: email.trim().toLowerCase(), password })
                : await ledgerApi.login({ email: email.trim().toLowerCase(), password })
            persistSession(res.user, res.token)
            setAuthForm({ name: "", email: "", password: "" })
            toast("success", `Welcome, ${res.user.name}!`)
            await Promise.all([loadAccounts(res.token), loadExpenses(res.token), loadSummary(res.token)])
            setActiveTab("dashboard")
        } catch (e) {
            toast("error", e instanceof Error ? e.message : "Authentication failed")
        } finally {
            setBusyAction(null)
        }
    }

    async function handleLogout() {
        setBusyAction("logout")
        try { if (token) await ledgerApi.logout(token) } catch { /* ignore */ }
        clearSession()
        toast("info", "Logged out. See you next time!")
        setBusyAction(null)
    }

    /* ── Transfer ──────────────────────────────────────── */
    async function handleTransfer(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const { fromAccount, toAccount, amount } = transfer
        if (!fromAccount || !toAccount || !amount) return toast("error", "Fill all fields")
        if (fromAccount === toAccount) return toast("error", "From and To must differ")
        const amt = parseFloat(amount)
        if (isNaN(amt) || amt <= 0) return toast("error", "Enter a valid amount")
        setBusyAction("transfer")
        try {
            await ledgerApi.transfer(token, { fromAccount, toAccount, amount: amt, idempotencyKey: genIdem() })
            toast("success", `${fmt(amt)} transferred successfully!`)
            setTransfer({ fromAccount: "", toAccount: "", amount: "" })
            await loadAccounts()
        } catch (e) {
            toast("error", e instanceof Error ? e.message : "Transfer failed")
        } finally {
            setBusyAction(null)
        }
    }

    /* ── Effects ───────────────────────────────────────── */
    useEffect(() => { void runHealthCheck() }, [])
    useEffect(() => {
        if (token && user) {
            void loadAccounts(token)
            void loadExpenses(token)
            void loadSummary(token)
        }
    }, [token, user])

    /* ══════════════════════════════════════════════════
       AUTH SCREEN
    ══════════════════════════════════════════════════ */
    if (!user) {
        return (
            <div className="auth-page">
                <ToastContainer toasts={toasts} onRemove={removeToast} />
                <div className="auth-left">
                    <div className="auth-brand">
                        <div className="brand-logo">
                            <span>💰</span>
                        </div>
                        <h1 className="brand-name">SpendWise</h1>
                        <p className="brand-tagline">Your personal finance tracker,<br/>built on a production ledger engine.</p>
                        <div className="brand-features">
                            {[
                                { icon: "📊", text: "Visual analytics & insights" },
                                { icon: "🏷️", text: "Category-based tracking" },
                                { icon: "🔐", text: "JWT auth + secure sessions" },
                                { icon: "⚡", text: "Real-time balance from ledger" },
                                { icon: "🔄", text: "Account-to-account transfers" },
                                { icon: "🗂️", text: "Double-entry bookkeeping" },
                            ].map(f => (
                                <div className="brand-feature" key={f.text}>
                                    <span className="bf-icon">{f.icon}</span>
                                    <span>{f.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="brand-stack">
                            {["Node.js", "Express", "MongoDB", "React", "TypeScript"].map(t => (
                                <span className="stack-chip" key={t}>{t}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="auth-right">
                    <div className="auth-card">
                        <div className="auth-tabs">
                            <button
                                id="auth-login-tab"
                                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                                onClick={() => setMode("login")} type="button"
                            >Sign In</button>
                            <button
                                id="auth-register-tab"
                                className={`auth-tab ${mode === "register" ? "active" : ""}`}
                                onClick={() => setMode("register")} type="button"
                            >Register</button>
                        </div>

                        <div className="auth-header">
                            <p className="auth-title">{mode === "login" ? "Welcome back 👋" : "Create account"}</p>
                            <p className="auth-sub">{mode === "login" ? "Sign in to your workspace" : "Join SpendWise today"}</p>
                        </div>

                        <form onSubmit={e => void handleAuthSubmit(e)} className="auth-form">
                            {mode === "register" && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-name">Full Name</label>
                                    <input
                                        id="reg-name" className="form-input" type="text"
                                        placeholder="Kaushik Sharma"
                                        value={authForm.name}
                                        onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))}
                                        autoComplete="name"
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label" htmlFor="auth-email">Email Address</label>
                                <input
                                    id="auth-email" className="form-input" type="email"
                                    placeholder="you@example.com"
                                    value={authForm.email}
                                    onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))}
                                    autoComplete="email"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                                <label className="form-label" htmlFor="auth-password">Password</label>
                                <input
                                    id="auth-password" className="form-input" type="password"
                                    placeholder="••••••••"
                                    value={authForm.password}
                                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                                />
                            </div>
                            <button
                                id="auth-submit-btn"
                                className="btn btn-primary btn-full btn-lg"
                                type="submit"
                                disabled={busyAction === "register" || busyAction === "login"}
                            >
                                {busyAction === mode
                                    ? <><span className="spinner" /> {mode === "register" ? "Creating..." : "Signing in..."}</>
                                    : mode === "register" ? "Create Account" : "Sign In"
                                }
                            </button>
                        </form>

                        <div className="auth-switch-row">
                            {mode === "login"
                                ? <>Don't have an account? <button onClick={() => setMode("register")}>Register</button></>
                                : <>Already have an account? <button onClick={() => setMode("login")}>Sign in</button></>
                            }
                        </div>

                        <div className="api-status-row" onClick={() => void runHealthCheck()} id="health-check-btn">
                            <span className={`status-dot dot-${health}`} />
                            <span>{health === "online" ? "API Online" : health === "offline" ? "API Offline" : "Connecting..."}</span>
                            <span className="api-url">{ledgerApi.baseUrl}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    /* ══════════════════════════════════════════════════
       DASHBOARD
    ══════════════════════════════════════════════════ */
    const filteredExpenses = expenseFilter === "all" ? expenses : expenses.filter(e => e.type === expenseFilter)

    /* Category breakdown for analytics */
    const categoryTotals: Record<string, { expense: number; income: number }> = {}
    expenses.forEach(e => {
        if (!categoryTotals[e.category]) categoryTotals[e.category] = { expense: 0, income: 0 }
        categoryTotals[e.category][e.type] += e.amount
    })

    const topExpenseCategories = Object.entries(categoryTotals)
        .map(([cat, t]) => ({ cat, total: t.expense }))
        .filter(x => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)

    const totalExpense = summary?.summary.totalExpense || 0
    const maxCatTotal = topExpenseCategories[0]?.total || 1

    /* Monthly trend */
    const monthlyMap: Record<string, { income: number; expense: number }> = {}
    summary?.monthlyTrend.forEach(m => {
        const key = `${m._id.year}-${String(m._id.month).padStart(2, "0")}`
        if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0 }
        monthlyMap[key][m._id.type as "income" | "expense"] += m.total
    })
    const monthlyData = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([key, v]) => {
            const [year, month] = key.split("-")
            return { label: MONTHS[parseInt(month) - 1], ...v, year }
        })
    const maxMonthlyVal = Math.max(...monthlyData.flatMap(m => [m.income, m.expense]), 1)

    const navItems: { id: ActiveTab; label: string; icon: React.ReactElement }[] = [
        { id: "dashboard", label: "Dashboard", icon: Icon.dashboard },
        { id: "expenses",  label: "Expenses",  icon: Icon.expenses },
        { id: "analytics", label: "Analytics", icon: Icon.analytics },
        { id: "accounts",  label: "Accounts",  icon: Icon.accounts },
        { id: "transfer",  label: "Transfer",  icon: Icon.transfer },
        { id: "budget",    label: "Budget",    icon: Icon.budget },
    ]

    return (
        <div className="app-shell">
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            {showModal && (
                <AddExpenseModal
                    accounts={accounts}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleAddExpense}
                    busy={busyAction === "addExpense"}
                />
            )}

            {/* ── Sidebar ──────────────────────────────── */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-mark">💰</div>
                    <div className="logo-text">
                        SpendWise
                        <span>Finance Tracker</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <span className="nav-section-label">Menu</span>
                    {navItems.map(n => (
                        <button
                            key={n.id}
                            id={`nav-${n.id}`}
                            className={`nav-item ${activeTab === n.id ? "active" : ""}`}
                            onClick={() => setActiveTab(n.id)}
                        >
                            <span className="nav-icon">{n.icon}</span>
                            <span>{n.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <button
                        id="sidebar-add-btn"
                        className="btn btn-primary btn-full sidebar-add-btn"
                        onClick={() => setShowModal(true)}
                    >
                        {Icon.plus} Add Transaction
                    </button>

                    <div className="sidebar-user">
                        <div className="user-avatar">{user.name[0].toUpperCase()}</div>
                        <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-email">{user.email}</div>
                        </div>
                    </div>

                    <div className="sidebar-status-row">
                        <div
                            className={`status-pill dot-${health}`}
                            onClick={() => void runHealthCheck()}
                            id="sidebar-health-pill"
                        >
                            <span className={`status-dot dot-${health}`} />
                            <span>{health === "online" ? "API Online" : health === "offline" ? "Offline" : "Connecting..."}</span>
                        </div>
                        <button
                            id="nav-logout"
                            className="icon-btn logout-btn"
                            onClick={() => void handleLogout()}
                            disabled={busyAction === "logout"}
                            title="Logout"
                        >{Icon.logout}</button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────── */}
            <main className="main-content">
                <div className="topbar">
                    <div className="topbar-info">
                        <h1 className="page-title">
                            {{ dashboard: "Dashboard", expenses: "Expenses", analytics: "Analytics", accounts: "Accounts", transfer: "Transfer", budget: "Budgets" }[activeTab]}
                        </h1>
                        <p className="page-subtitle">
                            {{ dashboard: `Good day, ${user.name.split(" ")[0]}!`, expenses: "All your transactions in one place", analytics: "Insights into your spending", accounts: "Manage your bank accounts", transfer: "Move funds between accounts", budget: "Set monthly limits per category" }[activeTab]}
                        </p>
                    </div>
                    <button
                        id="topbar-add-btn"
                        className="btn btn-primary"
                        onClick={() => setShowModal(true)}
                    >
                        {Icon.plus} Add Transaction
                    </button>
                </div>

                <div className="page-body">

                    {/* ════════════════════════════════
                        DASHBOARD TAB
                    ════════════════════════════════ */}
                    {activeTab === "dashboard" && (
                        <div className="page-enter">
                            {/* Balance hero */}
                            <div className="balance-hero">
                                <div className="balance-hero-inner">
                                    <div className="balance-label">Net Balance</div>
                                    <div className={`balance-amount ${(summary?.summary.netBalance || 0) >= 0 ? "positive" : "negative"}`}>
                                        {fmt(summary?.summary.netBalance || 0)}
                                    </div>
                                    <div className="balance-sub">
                                        Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
                                        {Object.keys(balances).length > 0 && ` · Ledger: ${fmt(totalBalance)}`}
                                    </div>
                                </div>
                                <div className="balance-hero-stats">
                                    <div className="hero-stat income">
                                        <span className="hs-icon">{Icon.income}</span>
                                        <div>
                                            <div className="hs-label">Income</div>
                                            <div className="hs-val">{fmt(summary?.summary.totalIncome || 0)}</div>
                                        </div>
                                    </div>
                                    <div className="hs-divider" />
                                    <div className="hero-stat expense">
                                        <span className="hs-icon">{Icon.expense}</span>
                                        <div>
                                            <div className="hs-label">Expenses</div>
                                            <div className="hs-val">{fmt(summary?.summary.totalExpense || 0)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats grid */}
                            <div className="stats-grid">
                                <div className="stat-card" style={{ "--accent": "var(--green)" } as React.CSSProperties}>
                                    <div className="stat-icon">💰</div>
                                    <div className="stat-info">
                                        <div className="stat-label">Total Income</div>
                                        <div className="stat-val">{fmt(summary?.summary.totalIncome || 0)}</div>
                                        <div className="stat-sub">{summary?.summary.incomeCount || 0} entries</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ "--accent": "var(--red)" } as React.CSSProperties}>
                                    <div className="stat-icon">💸</div>
                                    <div className="stat-info">
                                        <div className="stat-label">Total Expenses</div>
                                        <div className="stat-val">{fmt(summary?.summary.totalExpense || 0)}</div>
                                        <div className="stat-sub">{summary?.summary.expenseCount || 0} entries</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ "--accent": "var(--violet)" } as React.CSSProperties}>
                                    <div className="stat-icon">🏦</div>
                                    <div className="stat-info">
                                        <div className="stat-label">Accounts</div>
                                        <div className="stat-val">{accounts.length}</div>
                                        <div className="stat-sub">{accounts.filter(a => a.status === "ACTIVE").length} active</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ "--accent": "var(--amber)" } as React.CSSProperties}>
                                    <div className="stat-icon">📋</div>
                                    <div className="stat-info">
                                        <div className="stat-label">Transactions</div>
                                        <div className="stat-val">{expenses.length}</div>
                                        <div className="stat-sub">this period</div>
                                    </div>
                                </div>
                            </div>

                            <div className="two-col">
                                {/* Recent transactions */}
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">Recent Transactions</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("expenses")}>View all →</button>
                                    </div>
                                    <div className="card-body">
                                        {expenses.length === 0 ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">📝</div>
                                                <div className="empty-title">No transactions yet</div>
                                                <div className="empty-sub">Add your first income or expense to get started.</div>
                                                <button className="btn btn-primary" onClick={() => setShowModal(true)} id="dash-add-first-btn">
                                                    {Icon.plus} Add Transaction
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="tx-list">
                                                {expenses.slice(0, 6).map(exp => {
                                                    const meta = CATEGORY_META[exp.category] || { icon: "📦", color: "var(--text-muted)" }
                                                    return (
                                                        <div key={exp._id} className="tx-item">
                                                            <div className="tx-cat-icon" style={{ background: `${meta.color}20`, color: meta.color }}>
                                                                {meta.icon}
                                                            </div>
                                                            <div className="tx-info">
                                                                <div className="tx-title">{exp.description || exp.category}</div>
                                                                <div className="tx-sub">{exp.category} · {fmtRelative(exp.date)}</div>
                                                            </div>
                                                            <div className={`tx-amount ${exp.type}`}>
                                                                {exp.type === "income" ? "+" : "−"}{fmt(exp.amount)}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Top spending categories */}
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">Top Spending</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("analytics")}>Analytics →</button>
                                    </div>
                                    <div className="card-body">
                                        {topExpenseCategories.length === 0 ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">📊</div>
                                                <div className="empty-title">No spending data</div>
                                                <div className="empty-sub">Add expenses to see your spending breakdown.</div>
                                            </div>
                                        ) : (
                                            <div className="cat-bars">
                                                {topExpenseCategories.map(({ cat, total }) => {
                                                    const meta = CATEGORY_META[cat] || { icon: "📦", color: "var(--text-muted)" }
                                                    const pct = (total / maxCatTotal) * 100
                                                    return (
                                                        <div key={cat} className="cat-bar-row">
                                                            <div className="cat-bar-label">
                                                                <span>{meta.icon}</span>
                                                                <span>{cat}</span>
                                                            </div>
                                                            <div className="cat-bar-track">
                                                                <div className="cat-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
                                                            </div>
                                                            <div className="cat-bar-val">{fmt(total)}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════
                        EXPENSES TAB
                    ════════════════════════════════ */}
                    {activeTab === "expenses" && (
                        <div className="page-enter">
                            {/* Filter bar */}
                            <div className="filter-bar">
                                <div className="filter-tabs">
                                    {(["all", "expense", "income"] as const).map(f => (
                                        <button
                                            key={f}
                                            id={`filter-${f}`}
                                            className={`filter-tab ${expenseFilter === f ? "active" : ""}`}
                                            onClick={() => setExpenseFilter(f)}
                                        >
                                            {f === "all" ? "All" : f === "expense" ? "💸 Expenses" : "💰 Income"}
                                        </button>
                                    ))}
                                </div>
                                <div className="filter-count">
                                    {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? "s" : ""}
                                </div>
                            </div>

                            {filteredExpenses.length === 0 ? (
                                <div className="card">
                                    <div className="empty-state" style={{ padding: "4rem" }}>
                                        <div className="empty-icon">💳</div>
                                        <div className="empty-title">No transactions found</div>
                                        <div className="empty-sub">
                                            {expenseFilter === "all"
                                                ? "Add your first transaction to get started."
                                                : `No ${expenseFilter} entries yet.`}
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setShowModal(true)}
                                            id="expenses-add-btn"
                                        >
                                            {Icon.plus} Add Transaction
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="card">
                                    <div className="tx-list tx-list-full">
                                        {filteredExpenses.map(exp => {
                                            const meta = CATEGORY_META[exp.category] || { icon: "📦", color: "var(--text-muted)" }
                                            return (
                                                <div key={exp._id} className="tx-item tx-item-full" id={`tx-${exp._id}`}>
                                                    <div className="tx-cat-icon lg" style={{ background: `${meta.color}20`, color: meta.color }}>
                                                        {meta.icon}
                                                    </div>
                                                    <div className="tx-info">
                                                        <div className="tx-title">{exp.description || exp.category}</div>
                                                        <div className="tx-sub">
                                                            <span className="cat-tag" style={{ color: meta.color }}>{exp.category}</span>
                                                            <span>·</span>
                                                            <span>{fmtDate(exp.date)}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`tx-amount ${exp.type}`}>
                                                        {exp.type === "income" ? "+" : "−"}{fmt(exp.amount)}
                                                    </div>
                                                    <span className={`type-badge badge-${exp.type}`}>
                                                        {exp.type}
                                                    </span>
                                                    <button
                                                        className="icon-btn delete-btn"
                                                        onClick={() => void handleDeleteExpense(exp._id)}
                                                        title="Delete"
                                                        id={`delete-${exp._id}`}
                                                    >{Icon.trash}</button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════════════════════════════
                        ANALYTICS TAB
                    ════════════════════════════════ */}
                    {activeTab === "analytics" && (
                        <div className="page-enter">
                            {/* Summary cards */}
                            <div className="analytics-summary">
                                <div className="analytics-card income-card">
                                    <div className="ac-icon">{Icon.income}</div>
                                    <div className="ac-label">Total Income</div>
                                    <div className="ac-val">{fmt(summary?.summary.totalIncome || 0)}</div>
                                    <div className="ac-sub">{summary?.summary.incomeCount || 0} transactions</div>
                                </div>
                                <div className="analytics-card expense-card">
                                    <div className="ac-icon">{Icon.expense}</div>
                                    <div className="ac-label">Total Expenses</div>
                                    <div className="ac-val">{fmt(summary?.summary.totalExpense || 0)}</div>
                                    <div className="ac-sub">{summary?.summary.expenseCount || 0} transactions</div>
                                </div>
                                <div className={`analytics-card net-card ${(summary?.summary.netBalance || 0) >= 0 ? "positive" : "negative"}`}>
                                    <div className="ac-icon">{Icon.wallet}</div>
                                    <div className="ac-label">Net Savings</div>
                                    <div className="ac-val">{fmt(summary?.summary.netBalance || 0)}</div>
                                    <div className="ac-sub">
                                        {summary && summary.summary.totalIncome > 0
                                            ? `${Math.round((summary.summary.netBalance / summary.summary.totalIncome) * 100)}% savings rate`
                                            : "No income recorded"}
                                    </div>
                                </div>
                            </div>

                            <div className="two-col">
                                {/* Monthly trend */}
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">📅 Monthly Trend</span>
                                    </div>
                                    <div className="card-body">
                                        {monthlyData.length === 0 ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">📊</div>
                                                <div className="empty-title">No data yet</div>
                                                <div className="empty-sub">Add transactions to see your monthly trend.</div>
                                            </div>
                                        ) : (
                                            <div className="bar-chart">
                                                {monthlyData.map(m => (
                                                    <div key={`${m.label}-${m.year}`} className="bar-col">
                                                        <div className="bar-pair">
                                                            <div
                                                                className="bar bar-income"
                                                                style={{ height: `${(m.income / maxMonthlyVal) * 140}px` }}
                                                                title={`Income: ${fmt(m.income)}`}
                                                            />
                                                            <div
                                                                className="bar bar-expense"
                                                                style={{ height: `${(m.expense / maxMonthlyVal) * 140}px` }}
                                                                title={`Expense: ${fmt(m.expense)}`}
                                                            />
                                                        </div>
                                                        <div className="bar-label">{m.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="chart-legend">
                                            <div className="legend-item"><span className="legend-dot income" />Income</div>
                                            <div className="legend-item"><span className="legend-dot expense" />Expenses</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Category breakdown */}
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">🏷️ Spending by Category</span>
                                    </div>
                                    <div className="card-body">
                                        {topExpenseCategories.length === 0 ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">🏷️</div>
                                                <div className="empty-title">No spending data</div>
                                                <div className="empty-sub">Add expenses to see category breakdown.</div>
                                            </div>
                                        ) : (
                                            <div className="cat-breakdown">
                                                {topExpenseCategories.map(({ cat, total }) => {
                                                    const meta = CATEGORY_META[cat] || { icon: "📦", color: "var(--text-muted)" }
                                                    const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0
                                                    return (
                                                        <div key={cat} className="cat-breakdown-row">
                                                            <div className="cbr-icon" style={{ background: `${meta.color}20`, color: meta.color }}>
                                                                {meta.icon}
                                                            </div>
                                                            <div className="cbr-info">
                                                                <div className="cbr-name">{cat}</div>
                                                                <div className="cbr-bar-track">
                                                                    <div className="cbr-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
                                                                </div>
                                                            </div>
                                                            <div className="cbr-right">
                                                                <div className="cbr-val">{fmt(total)}</div>
                                                                <div className="cbr-pct">{pct}%</div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════
                        ACCOUNTS TAB
                    ════════════════════════════════ */}
                    {activeTab === "accounts" && (
                        <div className="page-enter">
                            <div className="accounts-actions">
                                <button
                                    id="accounts-refresh-btn"
                                    className="btn btn-secondary"
                                    onClick={() => void loadAccounts()}
                                    disabled={busyAction === "refreshAccounts"}
                                >
                                    {busyAction === "refreshAccounts" ? <span className="spinner" /> : Icon.refresh} Refresh
                                </button>
                                <button
                                    id="accounts-create-btn"
                                    className="btn btn-primary"
                                    onClick={() => void handleCreateAccount()}
                                    disabled={busyAction === "createAccount"}
                                >
                                    {busyAction === "createAccount" ? <span className="spinner" /> : Icon.plus} New Account
                                </button>
                            </div>

                            {accounts.length === 0 ? (
                                <div className="card">
                                    <div className="empty-state" style={{ padding: "4rem" }}>
                                        <div className="empty-icon">🏦</div>
                                        <div className="empty-title">No accounts yet</div>
                                        <div className="empty-sub">Create an account to start tracking.</div>
                                        <button
                                            id="accounts-create-first-btn"
                                            className="btn btn-primary"
                                            onClick={() => void handleCreateAccount()}
                                        >
                                            {Icon.plus} Create First Account
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="accounts-grid">
                                    {accounts.map((acc, i) => (
                                        <div key={acc._id} className={`account-card fade-up delay-${Math.min(i+1,4)}`} id={`account-${acc._id}`}>
                                            <div className="acc-header">
                                                <div className="acc-icon">🏦</div>
                                                <span className={`acc-status badge-${acc.status.toLowerCase()}`}>{acc.status}</span>
                                            </div>
                                            <div className="acc-balance">
                                                {balances[acc._id] !== undefined ? fmt(balances[acc._id]) : "—"}
                                            </div>
                                            <div className="acc-label">Current Balance</div>
                                            <div className="acc-meta">
                                                <span>{acc.currency}</span>
                                                <span>Opened {fmtDate(acc.createdAt)}</span>
                                            </div>
                                            <div className="acc-id">ID: ...{acc._id.slice(-12)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="card" style={{ marginTop: "1.5rem" }}>
                                <div className="card-header">
                                    <span className="card-title">🔑 Session</span>
                                </div>
                                <div className="card-body">
                                    <div className="token-row">
                                        <span className="token-label">JWT Token</span>
                                        <span className="token-val">{maskToken(token)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════
                        TRANSFER TAB
                    ════════════════════════════════ */}
                    {activeTab === "transfer" && (
                        <div className="page-enter">
                            <div className="transfer-layout">
                                <div className="card transfer-card">
                                    <div className="card-header">
                                        <span className="card-title">🔄 Transfer Funds</span>
                                    </div>
                                    <div className="card-body">
                                        {accounts.length < 2 ? (
                                            <div className="empty-state">
                                                <div className="empty-icon">🔄</div>
                                                <div className="empty-title">Need at least 2 accounts</div>
                                                <div className="empty-sub">Create more accounts to transfer between them.</div>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => setActiveTab("accounts")}
                                                >
                                                    Go to Accounts →
                                                </button>
                                            </div>
                                        ) : (
                                            <form onSubmit={e => void handleTransfer(e)} className="transfer-form">
                                                <div className="form-group">
                                                    <label className="form-label" htmlFor="from-account">From Account</label>
                                                    <select
                                                        id="from-account"
                                                        className="form-input form-select"
                                                        value={transfer.fromAccount}
                                                        onChange={e => setTransfer(t => ({ ...t, fromAccount: e.target.value }))}
                                                        required
                                                    >
                                                        <option value="">Select source account...</option>
                                                        {accounts.filter(a => a.status === "ACTIVE").map(a => (
                                                            <option key={a._id} value={a._id}>
                                                                {a.currency} · ...{a._id.slice(-8)} — {balances[a._id] !== undefined ? fmt(balances[a._id]) : "?"}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label" htmlFor="to-account">To Account</label>
                                                    <select
                                                        id="to-account"
                                                        className="form-input form-select"
                                                        value={transfer.toAccount}
                                                        onChange={e => setTransfer(t => ({ ...t, toAccount: e.target.value }))}
                                                        required
                                                    >
                                                        <option value="">Select destination account...</option>
                                                        {accounts.filter(a => a.status === "ACTIVE" && a._id !== transfer.fromAccount).map(a => (
                                                            <option key={a._id} value={a._id}>
                                                                {a.currency} · ...{a._id.slice(-8)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label" htmlFor="transfer-amount">Amount (₹)</label>
                                                    <div className="amount-input-wrap">
                                                        <span className="amount-prefix">₹</span>
                                                        <input
                                                            id="transfer-amount"
                                                            className="form-input amount-input"
                                                            type="number"
                                                            placeholder="0.00"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={transfer.amount}
                                                            onChange={e => setTransfer(t => ({ ...t, amount: e.target.value }))}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    id="transfer-submit-btn"
                                                    className="btn btn-primary btn-full btn-lg"
                                                    type="submit"
                                                    disabled={busyAction === "transfer"}
                                                    style={{ marginTop: "0.5rem" }}
                                                >
                                                    {busyAction === "transfer"
                                                        ? <><span className="spinner" /> Processing...</>
                                                        : <>{Icon.transfer} Transfer Now</>
                                                    }
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                <div className="transfer-info">
                                    <div className="card">
                                        <div className="card-header"><span className="card-title">ℹ️ How Transfers Work</span></div>
                                        <div className="card-body">
                                            <div className="info-list">
                                                {[
                                                    { icon: "⚡", title: "Instant", desc: "Transfers complete instantly via MongoDB sessions" },
                                                    { icon: "🔑", title: "Idempotent", desc: "Each transfer has a unique key to prevent duplicates" },
                                                    { icon: "⚛️", title: "ACID", desc: "Atomic transactions ensure no partial updates" },
                                                    { icon: "📒", title: "Double-entry", desc: "DEBIT from source, CREDIT to destination" },
                                                ].map(item => (
                                                    <div key={item.title} className="info-item">
                                                        <span className="info-icon">{item.icon}</span>
                                                        <div>
                                                            <div className="info-title">{item.title}</div>
                                                            <div className="info-desc">{item.desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* BUDGET TAB */}
                    {activeTab === "budget" && (
                        <div className="page-enter">
                            <div className="budget-toolbar">
                                <p className="budget-hint">Set monthly spending limits per category. Progress is calculated from this month's expenses.</p>
                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                    <button id="seed-data-btn" className="btn btn-secondary" onClick={() => void handleSeedData()} disabled={busyAction === "seeding"}>
                                        {busyAction === "seeding" ? <><span className="spinner" /> Seeding...</> : <>{Icon.seed} Load Demo Data</>}
                                    </button>
                                    <button id="export-csv-btn" className="btn btn-secondary" onClick={handleExportCSV}>
                                        {Icon.download} Export CSV
                                    </button>
                                </div>
                            </div>

                            <div className="budget-grid">
                                {Object.entries(CATEGORY_META)
                                    .filter(([cat]) => !["Salary & Income", "Investments"].includes(cat))
                                    .map(([cat, meta]) => {
                                        const budget = budgets.find(b => b.category === cat)
                                        const spent = categoryTotals[cat]?.expense || 0
                                        const pct = budget ? Math.min((spent / budget.limit) * 100, 100) : 0
                                        const over = budget ? spent > budget.limit : false
                                        const isEditing = budgetEdit?.category === cat

                                        return (
                                            <div key={cat} className={`budget-card ${over ? "over-budget" : ""}`} id={`budget-${cat.replace(/\s+/g, "-").toLowerCase()}`}>
                                                <div className="budget-card-header">
                                                    <div className="budget-cat-info">
                                                        <span className="budget-cat-icon" style={{ background: `${meta.color}20`, color: meta.color }}>{meta.icon}</span>
                                                        <span className="budget-cat-name">{cat}</span>
                                                    </div>
                                                    <div className="budget-actions">
                                                        {budget && (
                                                            <button className="icon-btn" onClick={() => handleRemoveBudget(cat)} title="Remove budget">{Icon.trash}</button>
                                                        )}
                                                        <button
                                                            className="icon-btn"
                                                            onClick={() => setBudgetEdit(isEditing ? null : { category: cat, value: budget ? String(budget.limit) : "" })}
                                                            title={budget ? "Edit budget" : "Set budget"}
                                                        >{budget ? Icon.edit : Icon.plus}</button>
                                                    </div>
                                                </div>

                                                {isEditing && (
                                                    <div className="budget-edit-row">
                                                        <div className="amount-input-wrap" style={{ flex: 1 }}>
                                                            <span className="amount-prefix">?</span>
                                                            <input
                                                                className="form-input amount-input"
                                                                type="number"
                                                                placeholder="Monthly limit"
                                                                value={budgetEdit.value}
                                                                onChange={e => setBudgetEdit({ category: cat, value: e.target.value })}
                                                                autoFocus
                                                                onKeyDown={e => { if (e.key === "Enter") handleSaveBudget(cat, budgetEdit.value); if (e.key === "Escape") setBudgetEdit(null) }}
                                                            />
                                                        </div>
                                                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveBudget(cat, budgetEdit.value)}>Save</button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setBudgetEdit(null)}>Cancel</button>
                                                    </div>
                                                )}

                                                <div className="budget-amounts">
                                                    <div>
                                                        <div className="budget-spent">{fmt(spent)}</div>
                                                        <div className="budget-spent-label">spent</div>
                                                    </div>
                                                    {budget ? (
                                                        <div style={{ textAlign: "right" }}>
                                                            <div className={`budget-limit ${over ? "over" : ""}`}>{fmt(budget.limit)}</div>
                                                            <div className="budget-spent-label">limit</div>
                                                        </div>
                                                    ) : (
                                                        <div className="budget-no-limit">No limit set</div>
                                                    )}
                                                </div>

                                                {budget && (
                                                    <div className="budget-progress-track">
                                                        <div
                                                            className={`budget-progress-fill ${over ? "over" : ""}`}
                                                            style={{ width: `${pct}%`, background: over ? "var(--red)" : meta.color }}
                                                        />
                                                    </div>
                                                )}

                                                {budget && (
                                                    <div className={`budget-status ${over ? "over" : "ok"}`}>
                                                        {over
                                                            ? `? Over by ${fmt(spent - budget.limit)}`
                                                            : `? ${fmt(budget.limit - spent)} remaining`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    )
}