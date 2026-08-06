import { CATEGORY_META } from "../constants"
import { fmt } from "../lib/formatters"
import { Icon } from "../icons"

export default function AnalyticsSection({
    summary,
    monthlyData,
    maxMonthlyVal,
    topExpenseCategories,
    totalExpense
}) {
    const totalIncome = summary?.summary.totalIncome || 0
    const totalExpenseValue = summary?.summary.totalExpense || 0
    const netBalance = summary?.summary.netBalance || 0
    const incomeCount = summary?.summary.incomeCount || 0
    const expenseCount = summary?.summary.expenseCount || 0
    const savingsRate = summary && summary.summary.totalIncome > 0
        ? `${Math.round((summary.summary.netBalance / summary.summary.totalIncome) * 100)}% savings rate`
        : "No income recorded"

    return (
        <div className="page-enter">
            <div className="analytics-summary">
                <div className="analytics-card income-card">
                    <div className="ac-icon">{Icon.income}</div>
                    <div className="ac-label">Total income</div>
                    <div className="ac-val">{fmt(totalIncome)}</div>
                    <div className="ac-sub">{incomeCount} transactions</div>
                </div>
                <div className="analytics-card expense-card">
                    <div className="ac-icon">{Icon.expense}</div>
                    <div className="ac-label">Total expenses</div>
                    <div className="ac-val">{fmt(totalExpenseValue)}</div>
                    <div className="ac-sub">{expenseCount} transactions</div>
                </div>
                <div className={`analytics-card net-card ${netBalance >= 0 ? "positive" : "negative"}`}>
                    <div className="ac-icon">{Icon.wallet}</div>
                    <div className="ac-label">Net savings</div>
                    <div className="ac-val">{fmt(netBalance)}</div>
                    <div className="ac-sub">{savingsRate}</div>
                </div>
            </div>

            <div className="two-col">
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Monthly trend</span>
                    </div>
                    <div className="card-body">
                        {monthlyData.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">{Icon.analytics}</div>
                                <div className="empty-title">No data yet</div>
                                <div className="empty-sub">Add transactions to see your monthly trend.</div>
                            </div>
                        ) : (
                            <div className="bar-chart">
                                {monthlyData.map((month) => (
                                    <div key={`${month.label}-${month.year}`} className="bar-col">
                                        <div className="bar-pair">
                                            <div
                                                className="bar bar-income"
                                                style={{ height: `${(month.income / maxMonthlyVal) * 140}px` }}
                                                title={`Income: ${fmt(month.income)}`}
                                            />
                                            <div
                                                className="bar bar-expense"
                                                style={{ height: `${(month.expense / maxMonthlyVal) * 140}px` }}
                                                title={`Expense: ${fmt(month.expense)}`}
                                            />
                                        </div>
                                        <div className="bar-label">{month.label}</div>
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

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Spending by category</span>
                    </div>
                    <div className="card-body">
                        {topExpenseCategories.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">{Icon.expenses}</div>
                                <div className="empty-title">No spending data</div>
                                <div className="empty-sub">Add expenses to see category breakdown.</div>
                            </div>
                        ) : (
                            <div className="cat-breakdown">
                                {topExpenseCategories.map(({ cat, total }) => {
                                    const meta = CATEGORY_META[cat] || { icon: "OT", color: "var(--text-2)" }
                                    const percent = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0

                                    return (
                                        <div key={cat} className="cat-breakdown-row">
                                            <div className="cbr-icon" style={{ background: `${meta.color}20`, color: meta.color }}>
                                                {meta.icon}
                                            </div>
                                            <div className="cbr-info">
                                                <div className="cbr-name">{cat}</div>
                                                <div className="cbr-bar-track">
                                                    <div className="cbr-bar-fill" style={{ width: `${percent}%`, background: meta.color }} />
                                                </div>
                                            </div>
                                            <div className="cbr-right">
                                                <div className="cbr-val">{fmt(total)}</div>
                                                <div className="cbr-pct">{percent}%</div>
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
    )
}
