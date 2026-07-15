import { CATEGORY_META } from "../constants"
import { fmt } from "../lib/formatters"
import { Icon } from "../icons"

export default function BudgetSection({
    budgets,
    budgetEdit,
    setBudgetEdit,
    categoryTotals,
    busyAction,
    onSeedData,
    onExportCSV,
    onSaveBudget,
    onRemoveBudget
}) {
    return (
        <div className="page-enter">
            <div className="budget-toolbar">
                <p className="budget-hint">Set monthly spending limits per category. Progress is calculated from this month's expenses.</p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button id="seed-data-btn" className="btn btn-secondary" onClick={() => void onSeedData()} disabled={busyAction === "seeding"}>
                        {busyAction === "seeding" ? <><span className="spinner" /> Seeding...</> : <>{Icon.seed} Load Demo Data</>}
                    </button>
                    <button id="export-csv-btn" className="btn btn-secondary" onClick={onExportCSV}>
                        {Icon.download} Export CSV
                    </button>
                </div>
            </div>

            <div className="budget-grid">
                {Object.entries(CATEGORY_META)
                    .filter(([category]) => !["Salary & Income", "Investments"].includes(category))
                    .map(([category, meta]) => {
                        const budget = budgets.find((item) => item.category === category)
                        const spent = categoryTotals[category]?.expense || 0
                        const percent = budget ? Math.min((spent / budget.limit) * 100, 100) : 0
                        const isOverBudget = budget ? spent > budget.limit : false
                        const isEditing = budgetEdit?.category === category

                        return (
                            <div
                                key={category}
                                className={`budget-card ${isOverBudget ? "over-budget" : ""}`}
                                id={`budget-${category.replace(/\s+/g, "-").toLowerCase()}`}
                            >
                                <div className="budget-card-header">
                                    <div className="budget-cat-info">
                                        <span className="budget-cat-icon" style={{ background: `${meta.color}20`, color: meta.color }}>
                                            {meta.icon}
                                        </span>
                                        <span className="budget-cat-name">{category}</span>
                                    </div>
                                    <div className="budget-actions">
                                        {budget && (
                                            <button className="icon-btn" onClick={() => onRemoveBudget(category)} title="Remove budget">
                                                {Icon.trash}
                                            </button>
                                        )}
                                        <button
                                            className="icon-btn"
                                            onClick={() => setBudgetEdit(isEditing ? null : { category, value: budget ? String(budget.limit) : "" })}
                                            title={budget ? "Edit budget" : "Set budget"}
                                        >
                                            {budget ? Icon.edit : Icon.plus}
                                        </button>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="budget-edit-row">
                                        <div className="amount-input-wrap" style={{ flex: 1 }}>
                                            <span className="amount-prefix">₹</span>
                                            <input
                                                className="form-input amount-input"
                                                type="number"
                                                placeholder="Monthly limit"
                                                value={budgetEdit.value}
                                                onChange={(event) => setBudgetEdit({ category, value: event.target.value })}
                                                autoFocus
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") onSaveBudget(category, budgetEdit.value)
                                                    if (event.key === "Escape") setBudgetEdit(null)
                                                }}
                                            />
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={() => onSaveBudget(category, budgetEdit.value)}>Save</button>
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
                                            <div className={`budget-limit ${isOverBudget ? "over" : ""}`}>{fmt(budget.limit)}</div>
                                            <div className="budget-spent-label">limit</div>
                                        </div>
                                    ) : (
                                        <div className="budget-no-limit">No limit set</div>
                                    )}
                                </div>

                                {budget && (
                                    <div className="budget-progress-track">
                                        <div
                                            className={`budget-progress-fill ${isOverBudget ? "over" : ""}`}
                                            style={{ width: `${percent}%`, background: isOverBudget ? "var(--red)" : meta.color }}
                                        />
                                    </div>
                                )}

                                {budget && (
                                    <div className={`budget-status ${isOverBudget ? "over" : "ok"}`}>
                                        {isOverBudget
                                            ? `₹ Over by ${fmt(spent - budget.limit)}`
                                            : `₹ ${fmt(budget.limit - spent)} remaining`}
                                    </div>
                                )}
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
