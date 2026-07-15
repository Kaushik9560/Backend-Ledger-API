import { fmt } from "../lib/formatters"
import { Icon } from "../icons"

export default function TransferSection({
    accounts,
    balances,
    transfer,
    setTransfer,
    busyAction,
    onSubmit,
    onGoToAccounts
}) {
    const activeAccounts = accounts.filter((account) => account.status === "ACTIVE")

    return (
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
                                <button className="btn btn-primary" onClick={onGoToAccounts}>
                                    Go to Accounts →
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={onSubmit} className="transfer-form">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="from-account">From Account</label>
                                    <select
                                        id="from-account"
                                        className="form-input form-select"
                                        value={transfer.fromAccount}
                                        onChange={(event) => setTransfer((currentTransfer) => ({ ...currentTransfer, fromAccount: event.target.value }))}
                                        required
                                    >
                                        <option value="">Select source account...</option>
                                        {activeAccounts.map((account) => (
                                            <option key={account._id} value={account._id}>
                                                {account.currency} · ...{account._id.slice(-8)} — {balances[account._id] !== undefined ? fmt(balances[account._id]) : "?"}
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
                                        onChange={(event) => setTransfer((currentTransfer) => ({ ...currentTransfer, toAccount: event.target.value }))}
                                        required
                                    >
                                        <option value="">Select destination account...</option>
                                        {activeAccounts.filter((account) => account._id !== transfer.fromAccount).map((account) => (
                                            <option key={account._id} value={account._id}>
                                                {account.currency} · ...{account._id.slice(-8)}
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
                                            onChange={(event) => setTransfer((currentTransfer) => ({ ...currentTransfer, amount: event.target.value }))}
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
                                        : <>{Icon.transfer} Transfer Now</>}
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
                                    { icon: "📒", title: "Double-entry", desc: "DEBIT from source, CREDIT to destination" }
                                ].map((item) => (
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
    )
}
