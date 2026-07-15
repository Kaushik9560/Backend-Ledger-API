import { useCallback, useEffect, useState, useTransition } from "react"
import { ledgerApi } from "./api"
import { CATEGORY_META } from "./constants"
import { Icon } from "./icons"
import { buildCategoryTotals, buildMonthlyData, buildTopExpenseCategories } from "./lib/analytics"
import { fmt, genIdem } from "./lib/formatters"
import {
    clearStoredSession,
    persistStoredSession,
    readBudgets,
    readStoredToken,
    readStoredUser,
    saveBudgets
} from "./lib/storage"
import AddExpenseModal from "./components/AddExpenseModal"
import AppSidebar from "./components/AppSidebar"
import AppTopbar from "./components/AppTopbar"
import AuthScreen from "./components/AuthScreen"
import ToastContainer from "./components/ToastContainer"
import AccountsSection from "./sections/AccountsSection"
import AnalyticsSection from "./sections/AnalyticsSection"
import BudgetSection from "./sections/BudgetSection"
import DashboardSection from "./sections/DashboardSection"
import ExpensesSection from "./sections/ExpensesSection"
import TransferSection from "./sections/TransferSection"
import "./style.css"

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icon.dashboard },
    { id: "expenses", label: "Expenses", icon: Icon.expenses },
    { id: "analytics", label: "Analytics", icon: Icon.analytics },
    { id: "accounts", label: "Accounts", icon: Icon.accounts },
    { id: "transfer", label: "Transfer", icon: Icon.transfer },
    { id: "budget", label: "Budget", icon: Icon.budget }
]

export default function App() {
    const [mode, setMode] = useState("login")
    const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" })
    const [user, setUser] = useState(() => readStoredUser())
    const [token, setToken] = useState(() => readStoredToken())

    const [accounts, setAccounts] = useState([])
    const [balances, setBalances] = useState({})
    const [expenses, setExpenses] = useState([])
    const [summary, setSummary] = useState(null)
    const [health, setHealth] = useState("checking")

    const [transfer, setTransfer] = useState({ fromAccount: "", toAccount: "", amount: "" })

    const [activeTab, setActiveTab] = useState("dashboard")
    const [busyAction, setBusyAction] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [toasts, setToasts] = useState([])
    const [expenseFilter, setExpenseFilter] = useState("all")
    const [budgets, setBudgets] = useState(() => readBudgets())
    const [budgetEdit, setBudgetEdit] = useState(null)
    const [, startTransition] = useTransition()

    const totalBalance = Object.values(balances).reduce((sum, value) => sum + value, 0)
    const filteredExpenses = expenseFilter === "all"
        ? expenses
        : expenses.filter((expense) => expense.type === expenseFilter)

    const categoryTotals = buildCategoryTotals(expenses)
    const topExpenseCategories = buildTopExpenseCategories(categoryTotals)
    const totalExpense = summary?.summary.totalExpense || 0
    const maxCatTotal = topExpenseCategories[0]?.total || 1

    const monthlyData = buildMonthlyData(summary?.monthlyTrend || [])
    const maxMonthlyVal = Math.max(...monthlyData.flatMap((month) => [month.income, month.expense]), 1)

    function toast(type, message) {
        const id = Date.now() + Math.random()
        setToasts((currentToasts) => [...currentToasts, { id, type, message }])
        setTimeout(() => {
            setToasts((currentToasts) => currentToasts.filter((currentToast) => currentToast.id !== id))
        }, 4000)
    }

    function removeToast(id) {
        setToasts((currentToasts) => currentToasts.filter((toastItem) => toastItem.id !== id))
    }

    function persistSession(nextUser, nextToken) {
        persistStoredSession(nextUser, nextToken)
        setUser(nextUser)
        setToken(nextToken)
    }

    function clearSession() {
        clearStoredSession()
        setUser(null)
        setToken("")
        setAccounts([])
        setBalances({})
        setExpenses([])
        setSummary(null)
        setActiveTab("dashboard")
    }

    async function runHealthCheck() {
        setHealth("checking")
        try {
            await ledgerApi.health()
            setHealth("online")
        } catch {
            setHealth("offline")
        }
    }

    const loadAccounts = useCallback(async (activeToken = token) => {
        if (!activeToken) {
            return
        }

        try {
            const response = await ledgerApi.listAccounts(activeToken)
            setAccounts(response.accounts)

            const balanceMap = {}

            await Promise.all(response.accounts.map(async (account) => {
                try {
                    const balanceResponse = await ledgerApi.getBalance(activeToken, account._id)
                    balanceMap[account._id] = balanceResponse.balance
                } catch {
                    balanceMap[account._id] = 0
                }
            }))

            setBalances(balanceMap)
        } catch {
            // Keep the current UI state if the refresh fails.
        }
    }, [token])

    async function handleRefreshAccounts() {
        if (!token) {
            return
        }

        setBusyAction("refreshAccounts")
        try {
            await loadAccounts(token)
            toast("success", "Accounts refreshed")
        } catch {
            toast("error", "Unable to refresh accounts right now")
        } finally {
            setBusyAction(null)
        }
    }

    async function handleCreateAccount() {
        if (!token) {
            return
        }

        setBusyAction("createAccount")
        try {
            const response = await ledgerApi.createAccount(token)
            setAccounts((currentAccounts) => [response.account, ...currentAccounts])
            setBalances((currentBalances) => ({ ...currentBalances, [response.account._id]: 0 }))
            toast("success", "New account created!")
        } catch (error) {
            toast("error", error instanceof Error ? error.message : "Failed to create account")
        } finally {
            setBusyAction(null)
        }
    }

    const loadExpenses = useCallback(async (activeToken = token) => {
        if (!activeToken) {
            return
        }

        try {
            const response = await ledgerApi.listExpenses(activeToken, { limit: 100 })
            startTransition(() => setExpenses(response.expenses))
        } catch {
            // Keep the current UI state if the refresh fails.
        }
    }, [token])

    const loadSummary = useCallback(async (activeToken = token) => {
        if (!activeToken) {
            return
        }

        try {
            const response = await ledgerApi.getExpenseSummary(activeToken)
            startTransition(() => setSummary(response))
        } catch {
            // Keep the current UI state if the refresh fails.
        }
    }, [token])

    async function handleAddExpense(form) {
        setBusyAction("addExpense")
        try {
            await ledgerApi.createExpense(token, {
                accountId: form.accountId,
                amount: Number.parseFloat(form.amount),
                type: form.type,
                category: form.category,
                description: form.description,
                date: form.date,
                tags: form.tags ? form.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : []
            })
            toast("success", `${form.type === "income" ? "Income" : "Expense"} recorded!`)
            setShowModal(false)
            await Promise.all([loadExpenses(), loadSummary(), loadAccounts()])
        } catch (error) {
            toast("error", error instanceof Error ? error.message : "Failed to save")
        } finally {
            setBusyAction(null)
        }
    }

    async function handleDeleteExpense(id) {
        if (!confirm("Delete this entry? The balance will be reversed.")) {
            return
        }

        try {
            await ledgerApi.deleteExpense(token, id)
            toast("success", "Entry deleted and balance reversed.")
            await Promise.all([loadExpenses(), loadSummary(), loadAccounts()])
        } catch (error) {
            toast("error", error instanceof Error ? error.message : "Failed to delete")
        }
    }

    async function handleSeedData() {
        if (!accounts.length) {
            toast("error", "Create an account first!")
            return
        }

        const activeAccount = accounts.find((account) => account.status === "ACTIVE")
        if (!activeAccount) {
            toast("error", "No active account")
            return
        }

        setBusyAction("seeding")

        const seeds = [
            { type: "income", category: "Salary & Income", amount: 75000, description: "Monthly salary", daysAgo: 1 },
            { type: "expense", category: "Rent & Housing", amount: 18000, description: "Monthly rent", daysAgo: 1 },
            { type: "expense", category: "Food & Dining", amount: 3200, description: "Groceries & dining", daysAgo: 2 },
            { type: "expense", category: "Transport", amount: 1500, description: "Uber & metro", daysAgo: 3 },
            { type: "expense", category: "Bills & Utilities", amount: 2100, description: "Electricity & internet", daysAgo: 5 },
            { type: "expense", category: "Entertainment", amount: 800, description: "Netflix & Hotstar", daysAgo: 7 },
            { type: "expense", category: "Shopping", amount: 4500, description: "Clothes & accessories", daysAgo: 8 },
            { type: "income", category: "Investments", amount: 5000, description: "Dividend payout", daysAgo: 10 },
            { type: "expense", category: "Health & Medical", amount: 1200, description: "Pharmacy & checkup", daysAgo: 12 },
            { type: "expense", category: "Education", amount: 2500, description: "Udemy courses", daysAgo: 15 }
        ]

        let addedCount = 0
        for (const seed of seeds) {
            const date = new Date()
            date.setDate(date.getDate() - seed.daysAgo)

            try {
                await ledgerApi.createExpense(token, {
                    accountId: activeAccount._id,
                    amount: seed.amount,
                    type: seed.type,
                    category: seed.category,
                    description: seed.description,
                    date: date.toISOString().split("T")[0]
                })
                addedCount += 1
            } catch {
                // Skip entries that cannot be added, usually due to balance checks.
            }
        }

        await Promise.all([loadExpenses(), loadSummary(), loadAccounts()])
        toast("success", `${addedCount} demo transactions added!`)
        setBusyAction(null)
    }

    function handleExportCSV() {
        if (!expenses.length) {
            toast("info", "No transactions to export")
            return
        }

        const headers = ["Date", "Type", "Category", "Description", "Amount (INR)"]
        const rows = expenses.map((expense) => [
            new Date(expense.date).toLocaleDateString("en-IN"),
            expense.type,
            expense.category,
            `"${expense.description.replace(/"/g, "\"\"")}"`,
            expense.amount
        ])

        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `spendwise-${new Date().toISOString().split("T")[0]}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
        toast("success", "CSV downloaded!")
    }

    function handleSaveBudget(category, value) {
        const limit = Number.parseFloat(value)
        if (Number.isNaN(limit) || limit <= 0) {
            toast("error", "Enter a valid amount")
            return
        }

        const updatedBudgets = budgets.filter((budget) => budget.category !== category)
        updatedBudgets.push({ category, limit })
        setBudgets(updatedBudgets)
        saveBudgets(updatedBudgets)
        setBudgetEdit(null)
        toast("success", `Budget saved for ${category}`)
    }

    function handleRemoveBudget(category) {
        const updatedBudgets = budgets.filter((budget) => budget.category !== category)
        setBudgets(updatedBudgets)
        saveBudgets(updatedBudgets)
        toast("info", "Budget removed")
    }

    async function handleAuthSubmit(event) {
        event.preventDefault()

        const { name, email, password } = authForm
        if (mode === "register" && !name.trim()) {
            toast("error", "Name is required")
            return
        }

        if (!email.trim() || !password) {
            toast("error", "Email and password are required")
            return
        }

        setBusyAction(mode)

        try {
            const response = mode === "register"
                ? await ledgerApi.register({ name: name.trim(), email: email.trim().toLowerCase(), password })
                : await ledgerApi.login({ email: email.trim().toLowerCase(), password })

            persistSession(response.user, response.token)
            setAuthForm({ name: "", email: "", password: "" })
            toast("success", `Welcome, ${response.user.name}!`)
            await Promise.all([
                loadAccounts(response.token),
                loadExpenses(response.token),
                loadSummary(response.token)
            ])
            setActiveTab("dashboard")
        } catch (error) {
            toast("error", error instanceof Error ? error.message : "Authentication failed")
        } finally {
            setBusyAction(null)
        }
    }

    async function handleLogout() {
        setBusyAction("logout")

        try {
            if (token) {
                await ledgerApi.logout(token)
            }
        } catch {
            // Logging out locally is enough if the request fails.
        }

        clearSession()
        toast("info", "Logged out. See you next time!")
        setBusyAction(null)
    }

    async function handleTransfer(event) {
        event.preventDefault()

        const { fromAccount, toAccount, amount } = transfer
        if (!fromAccount || !toAccount || !amount) {
            toast("error", "Fill all fields")
            return
        }

        if (fromAccount === toAccount) {
            toast("error", "From and To must differ")
            return
        }

        const parsedAmount = Number.parseFloat(amount)
        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            toast("error", "Enter a valid amount")
            return
        }

        setBusyAction("transfer")

        try {
            await ledgerApi.transfer(token, {
                fromAccount,
                toAccount,
                amount: parsedAmount,
                idempotencyKey: genIdem()
            })
            toast("success", `${fmt(parsedAmount)} transferred successfully!`)
            setTransfer({ fromAccount: "", toAccount: "", amount: "" })
            await loadAccounts()
        } catch (error) {
            toast("error", error instanceof Error ? error.message : "Transfer failed")
        } finally {
            setBusyAction(null)
        }
    }

    useEffect(() => {
        void runHealthCheck()
    }, [])

    useEffect(() => {
        function handleUnauthorized(event) {
            if (!readStoredToken()) {
                return
            }

            clearSession()
            setMode("login")
            toast("info", event.detail?.message || "Session expired. Please sign in again.")
        }

        window.addEventListener("ledger:unauthorized", handleUnauthorized)

        return () => {
            window.removeEventListener("ledger:unauthorized", handleUnauthorized)
        }
    }, [])

    useEffect(() => {
        if (token && user) {
            void loadAccounts(token)
            void loadExpenses(token)
            void loadSummary(token)
        }
    }, [token, user, loadAccounts, loadExpenses, loadSummary])

    if (!user) {
        return (
            <>
                <ToastContainer toasts={toasts} onRemove={removeToast} />
                <AuthScreen
                    mode={mode}
                    setMode={setMode}
                    authForm={authForm}
                    setAuthForm={setAuthForm}
                    busyAction={busyAction}
                    onSubmit={handleAuthSubmit}
                    health={health}
                    onHealthCheck={runHealthCheck}
                />
            </>
        )
    }

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

            <AppSidebar
                user={user}
                activeTab={activeTab}
                navItems={navItems}
                health={health}
                busyAction={busyAction}
                onSetActiveTab={setActiveTab}
                onShowModal={() => setShowModal(true)}
                onHealthCheck={runHealthCheck}
                onLogout={handleLogout}
            />

            <main className="main-content">
                <AppTopbar activeTab={activeTab} user={user} onShowModal={() => setShowModal(true)} />

                <div className="page-body">
                    {activeTab === "dashboard" && (
                        <DashboardSection
                            summary={summary}
                            accounts={accounts}
                            balances={balances}
                            totalBalance={totalBalance}
                            expenses={expenses}
                            topExpenseCategories={topExpenseCategories}
                            maxCatTotal={maxCatTotal}
                            onShowModal={() => setShowModal(true)}
                            onSetActiveTab={setActiveTab}
                        />
                    )}

                    {activeTab === "expenses" && (
                        <ExpensesSection
                            expenseFilter={expenseFilter}
                            filteredExpenses={filteredExpenses}
                            onSetExpenseFilter={setExpenseFilter}
                            onShowModal={() => setShowModal(true)}
                            onDeleteExpense={handleDeleteExpense}
                        />
                    )}

                    {activeTab === "analytics" && (
                        <AnalyticsSection
                            summary={summary}
                            monthlyData={monthlyData}
                            maxMonthlyVal={maxMonthlyVal}
                            topExpenseCategories={topExpenseCategories}
                            totalExpense={totalExpense}
                        />
                    )}

                    {activeTab === "accounts" && (
                        <AccountsSection
                            accounts={accounts}
                            balances={balances}
                            token={token}
                            busyAction={busyAction}
                            onRefreshAccounts={handleRefreshAccounts}
                            onCreateAccount={handleCreateAccount}
                        />
                    )}

                    {activeTab === "transfer" && (
                        <TransferSection
                            accounts={accounts}
                            balances={balances}
                            transfer={transfer}
                            setTransfer={setTransfer}
                            busyAction={busyAction}
                            onSubmit={handleTransfer}
                            onGoToAccounts={() => setActiveTab("accounts")}
                        />
                    )}

                    {activeTab === "budget" && (
                        <BudgetSection
                            budgets={budgets}
                            budgetEdit={budgetEdit}
                            setBudgetEdit={setBudgetEdit}
                            categoryTotals={categoryTotals}
                            busyAction={busyAction}
                            onSeedData={handleSeedData}
                            onExportCSV={handleExportCSV}
                            onSaveBudget={handleSaveBudget}
                            onRemoveBudget={handleRemoveBudget}
                        />
                    )}
                </div>
            </main>
        </div>
    )
}
