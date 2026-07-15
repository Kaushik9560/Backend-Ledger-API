import { CATEGORY_META } from "../constants"
import { fmt, fmtRelative } from "../lib/formatters"
import { Icon } from "../icons"

export default function DashboardSection({
    summary,
    accounts,
    balances,
    totalBalance,
    expenses,
    topExpenseCategories,
    maxCatTotal,
    onShowModal,
    onSetActiveTab
}) {
    const netBalance = summary?.summary.netBalance || 0
    const totalIncome = summary?.summary.totalIncome || 0
    const totalExpense = summary?.summary.totalExpense || 0
    const incomeCount = summary?.summary.incomeCount || 0
    const expenseCount = summary?.summary.expenseCount || 0

    return (
        <div className="page-enter">
            <div className="balance-hero">
                <div className="balance-hero-inner">
                    <div className="balance-label">Net Balance</div>
                    <div className={`balance-amount ${netBalance >= 0 ? "positive" : "negative"}`}>
                        {fmt(netBalance)}
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
                            <div className="hs-val">{fmt(totalIncome)}</div>
                        </div>
                    </div>
                    <div className="hs-divider" />
                    <div className="hero-stat expense">
                        <span className="hs-icon">{Icon.expense}</span>
                        <div>
                            <div className="hs-label">Expenses</div>
                            <div className="hs-val">{fmt(totalExpense)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card" style={{ "--accent": "var(--green)" }}>
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <div className="stat-label">Total Income</div>
                        <div className="stat-val">{fmt(totalIncome)}</div>
                        <div className="stat-sub">{incomeCount} entries</div>
                    </div>
                </div>
                <div className="stat-card" style={{ "--accent": "var(--red)" }}>
                    <div className="stat-icon">💸</div>
                    <div className="stat-info">
                        <div className="stat-label">Total Expenses</div>
                        <div className="stat-val">{fmt(totalExpense)}</div>
                        <div className="stat-sub">{expenseCount} entries</div>
                    </div>
                </div>
                <div className="stat-card" style={{ "--accent": "var(--violet)" }}>
                    <div className="stat-icon">🏦</div>
                    <div className="stat-info">
                        <div className="stat-label">Accounts</div>
                        <div className="stat-val">{accounts.length}</div>
                        <div className="stat-sub">{accounts.filter((account) => account.status === "ACTIVE").length} active</div>
                    </div>
                </div>
                <div className="stat-card" style={{ "--accent": "var(--amber)" }}>
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                        <div className="stat-label">Transactions</div>
                        <div className="stat-val">{expenses.length}</div>
                        <div className="stat-sub">this period</div>
                    </div>
                </div>
            </div>

            <div className="two-col">
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Recent Transactions</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => onSetActiveTab("expenses")}>View all →</button>
                    </div>
                    <div className="card-body">
                        {expenses.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📝</div>
                                <div className="empty-title">No transactions yet</div>
                                <div className="empty-sub">Add your first income or expense to get started.</div>
                                <button className="btn btn-primary" onClick={onShowModal} id="dash-add-first-btn">
                                    {Icon.plus} Add Transaction
                                </button>
                            </div>
                        ) : (
                            <div className="tx-list">
                                {expenses.slice(0, 6).map((expense) => {
                                    const meta = CATEGORY_META[expense.category] || { icon: "📦", color: "var(--text-muted)" }

                                    return (
                                        <div key={expense._id} className="tx-item">
                                            <div className="tx-cat-icon" style={{ background: `${meta.color}20`, color: meta.color }}>
                                                {meta.icon}
                                            </div>
                                            <div className="tx-info">
                                                <div className="tx-title">{expense.description || expense.category}</div>
                                                <div className="tx-sub">{expense.category} · {fmtRelative(expense.date)}</div>
                                            </div>
                                            <div className={`tx-amount ${expense.type}`}>
                                                {expense.type === "income" ? "+" : "−"}{fmt(expense.amount)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Top Spending</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => onSetActiveTab("analytics")}>Analytics →</button>
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
                                    const width = (total / maxCatTotal) * 100

                                    return (
                                        <div key={cat} className="cat-bar-row">
                                            <div className="cat-bar-label">
                                                <span>{meta.icon}</span>
                                                <span>{cat}</span>
                                            </div>
                                            <div className="cat-bar-track">
                                                <div className="cat-bar-fill" style={{ width: `${width}%`, background: meta.color }} />
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
    )
}
