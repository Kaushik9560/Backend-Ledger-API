import { Icon } from "../icons"
import { fmt, fmtDate, maskToken } from "../lib/formatters"

export default function AccountsSection({
    accounts,
    balances,
    token,
    busyAction,
    onRefreshAccounts,
    onCreateAccount
}) {
    return (
        <div className="page-enter">
            <div className="accounts-actions">
                <button
                    id="accounts-refresh-btn"
                    className="btn btn-secondary"
                    onClick={() => void onRefreshAccounts()}
                    disabled={busyAction === "refreshAccounts"}
                >
                    {busyAction === "refreshAccounts" ? <span className="spinner" /> : Icon.refresh} Refresh
                </button>
                <button
                    id="accounts-create-btn"
                    className="btn btn-primary"
                    onClick={() => void onCreateAccount()}
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
                        <button id="accounts-create-first-btn" className="btn btn-primary" onClick={() => void onCreateAccount()}>
                            {Icon.plus} Create First Account
                        </button>
                    </div>
                </div>
            ) : (
                <div className="accounts-grid">
                    {accounts.map((account, index) => (
                        <div
                            key={account._id}
                            className={`account-card fade-up delay-${Math.min(index + 1, 4)}`}
                            id={`account-${account._id}`}
                        >
                            <div className="acc-header">
                                <div className="acc-icon">🏦</div>
                                <span className={`acc-status badge-${account.status.toLowerCase()}`}>{account.status}</span>
                            </div>
                            <div className="acc-balance">
                                {balances[account._id] !== undefined ? fmt(balances[account._id]) : "—"}
                            </div>
                            <div className="acc-label">Current Balance</div>
                            <div className="acc-meta">
                                <span>{account.currency}</span>
                                <span>Opened {fmtDate(account.createdAt)}</span>
                            </div>
                            <div className="acc-id">ID: ...{account._id.slice(-12)}</div>
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
    )
}
