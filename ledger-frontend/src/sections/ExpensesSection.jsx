import { CATEGORY_META } from "../constants"
import { fmt, fmtDate } from "../lib/formatters"
import { Icon } from "../icons"

const FILTERS = ["all", "expense", "income"]

export default function ExpensesSection({
    expenseFilter,
    filteredExpenses,
    onSetExpenseFilter,
    onShowModal,
    onDeleteExpense
}) {
    return (
        <div className="page-enter">
            <div className="filter-bar">
                <div className="filter-tabs">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter}
                            id={`filter-${filter}`}
                            className={`filter-tab ${expenseFilter === filter ? "active" : ""}`}
                            onClick={() => onSetExpenseFilter(filter)}
                        >
                            {filter === "all" ? "All" : filter === "expense" ? "Expenses" : "Income"}
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
                        <div className="empty-icon">{Icon.expenses}</div>
                        <div className="empty-title">No transactions found</div>
                        <div className="empty-sub">
                            {expenseFilter === "all"
                                ? "Add your first transaction to get started."
                                : `No ${expenseFilter} entries yet.`}
                        </div>
                        <button className="btn btn-primary" onClick={onShowModal} id="expenses-add-btn">
                            {Icon.plus} Add transaction
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="tx-list tx-list-full">
                        {filteredExpenses.map((expense) => {
                            const meta = CATEGORY_META[expense.category] || { icon: "OT", color: "var(--text-2)" }

                            return (
                                <div key={expense._id} className="tx-item tx-item-full" id={`tx-${expense._id}`}>
                                    <div className="tx-cat-icon lg" style={{ background: `${meta.color}20`, color: meta.color }}>
                                        {meta.icon}
                                    </div>
                                    <div className="tx-info">
                                        <div className="tx-title">{expense.description || expense.category}</div>
                                        <div className="tx-sub">
                                            <span className="cat-tag" style={{ color: meta.color }}>{expense.category}</span>
                                            <span>·</span>
                                            <span>{fmtDate(expense.date)}</span>
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${expense.type}`}>
                                        {expense.type === "income" ? "+" : "−"}{fmt(expense.amount)}
                                    </div>
                                    <span className={`type-badge badge-${expense.type}`}>{expense.type}</span>
                                    <button
                                        className="icon-btn delete-btn"
                                        onClick={() => void onDeleteExpense(expense._id)}
                                        title="Delete"
                                        id={`delete-${expense._id}`}
                                    >
                                        {Icon.trash}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
