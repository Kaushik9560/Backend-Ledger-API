import { useRef, useState } from "react"
import { CATEGORY_META } from "../constants"
import { Icon } from "../icons"

function emptyExpenseForm() {
    return {
        accountId: "",
        amount: "",
        type: "expense",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        tags: ""
    }
}

export default function AddExpenseModal({ accounts, onClose, onSubmit, busy }) {
    const [form, setForm] = useState(emptyExpenseForm)
    const overlayRef = useRef(null)
    const categories = Object.keys(CATEGORY_META)

    function handleOverlayClick(event) {
        if (event.target === overlayRef.current) {
            onClose()
        }
    }

    function setField(field, value) {
        setForm((currentForm) => ({ ...currentForm, [field]: value }))
    }

    return (
        <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
            <div className="modal" role="dialog" aria-modal="true" aria-label="Add Transaction">
                <div className="modal-header">
                    <h2 className="modal-title">Add Transaction</h2>
                    <button className="icon-btn" onClick={onClose} id="modal-close-btn">
                        {Icon.close}
                    </button>
                </div>

                <div className="type-toggle">
                    <button
                        id="type-expense-btn"
                        className={`type-btn type-expense ${form.type === "expense" ? "active" : ""}`}
                        onClick={() => {
                            setField("type", "expense")
                            if (!form.category || form.category === "Salary & Income") {
                                setField("category", "")
                            }
                        }}
                        type="button"
                    >
                        <span className="type-icon">{Icon.expense}</span> Expense
                    </button>
                    <button
                        id="type-income-btn"
                        className={`type-btn type-income ${form.type === "income" ? "active" : ""}`}
                        onClick={() => {
                            setField("type", "income")
                            setField("category", "Salary & Income")
                        }}
                        type="button"
                    >
                        <span className="type-icon">{Icon.income}</span> Income
                    </button>
                </div>

                <form
                    className="modal-form"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void onSubmit(form)
                    }}
                >
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
                                onChange={(event) => setField("amount", event.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-account">Account</label>
                        <select
                            id="exp-account"
                            className="form-input form-select"
                            value={form.accountId}
                            onChange={(event) => setField("accountId", event.target.value)}
                            required
                        >
                            <option value="">Select account...</option>
                            {accounts.filter((account) => account.status === "ACTIVE").map((account) => (
                                <option key={account._id} value={account._id}>
                                    {account.currency} · ...{account._id.slice(-8)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <div className="category-grid">
                            {categories.map((category) => {
                                const meta = CATEGORY_META[category]
                                const showCategory = form.type === "income"
                                    ? ["Salary & Income", "Investments", "Others"].includes(category)
                                    : category !== "Salary & Income"

                                if (!showCategory) {
                                    return null
                                }

                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        id={`cat-${category.replace(/\s+/g, "-").toLowerCase()}`}
                                        className={`cat-chip ${form.category === category ? "selected" : ""}`}
                                        style={{ "--cat-color": meta.color }}
                                        onClick={() => setField("category", category)}
                                    >
                                        <span>{meta.icon}</span>
                                        <span>{category}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-desc">
                            Description <span style={{ opacity: 0.5 }}>(optional)</span>
                        </label>
                        <input
                            id="exp-desc"
                            className="form-input"
                            type="text"
                            placeholder="e.g. Lunch at Cafe Coffee Day"
                            value={form.description}
                            onChange={(event) => setField("description", event.target.value)}
                            maxLength={200}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="exp-date">Date</label>
                        <input
                            id="exp-date"
                            className="form-input"
                            type="date"
                            value={form.date}
                            onChange={(event) => setField("date", event.target.value)}
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
                                : <>{Icon.expense} Add Expense</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
