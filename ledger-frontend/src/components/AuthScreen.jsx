import { ledgerApi } from "../api"
import BrandMark from "./BrandMark"

export default function AuthScreen({
    mode,
    setMode,
    authForm,
    setAuthForm,
    busyAction,
    onSubmit,
    health,
    onHealthCheck
}) {
    const isRegister = mode === "register"

    return (
        <div className="auth-page">
            <section className="auth-left" aria-label="SpendWise product overview">
                <div className="auth-brand">
                    <div className="brand-header">
                        <span className="brand-logo"><BrandMark /></span>
                        <span className="brand-name">SpendWise</span>
                    </div>

                    <div className="brand-copy">
                        <p className="brand-eyebrow">Personal finance, without the noise</p>
                        <h1>A clearer view of your money.</h1>
                        <p className="brand-tagline">
                            Track income, spending, and account balances in one calm workspace.
                        </p>
                    </div>

                    <div className="product-preview" aria-label="Example monthly overview">
                        <div className="preview-header">
                            <div>
                                <p className="preview-kicker">Monthly overview</p>
                                <p className="preview-period">August 2026</p>
                            </div>
                            <span className="preview-sample">Example data</span>
                        </div>

                        <div className="preview-balance">
                            <span>Available balance</span>
                            <strong>₹84,320</strong>
                            <small>Across two accounts</small>
                        </div>

                        <div className="preview-metrics">
                            <div>
                                <span>Income</span>
                                <strong className="metric-positive">₹1,20,000</strong>
                            </div>
                            <div>
                                <span>Spent</span>
                                <strong>₹35,680</strong>
                            </div>
                        </div>

                        <div className="preview-plan">
                            <div className="preview-plan-head">
                                <span>Monthly spending</span>
                                <strong>40% used</strong>
                            </div>
                            <div className="preview-progress"><span /></div>
                            <div className="preview-categories">
                                <span>Housing</span>
                                <span>Food & dining</span>
                                <span>Transport</span>
                            </div>
                        </div>
                    </div>

                    <div className="brand-proof" aria-label="Product capabilities">
                        <span><b>✓</b> Ledger-based balances</span>
                        <span><b>✓</b> Private account</span>
                        <span><b>✓</b> CSV export</span>
                    </div>
                </div>
            </section>

            <main className="auth-right">
                <div className="auth-card">
                    <div className="auth-mobile-brand">
                        <span className="brand-logo"><BrandMark /></span>
                        <span className="brand-name">SpendWise</span>
                    </div>

                    <div className="auth-mode-row">
                        <span>{isRegister ? "Already have an account?" : "New to SpendWise?"}</span>
                        <button type="button" onClick={() => setMode(isRegister ? "login" : "register")}>
                            {isRegister ? "Sign in" : "Create account"}
                        </button>
                    </div>

                    <header className="auth-header">
                        <p className="auth-eyebrow">{isRegister ? "Get started" : "Welcome back"}</p>
                        <h2 className="auth-title">
                            {isRegister ? "Create your account" : "Sign in to SpendWise"}
                        </h2>
                        <p className="auth-sub">
                            {isRegister
                                ? "Set up your personal workspace in under a minute."
                                : "Enter your details to continue to your dashboard."}
                        </p>
                    </header>

                    <form onSubmit={onSubmit} className="auth-form">
                        {isRegister && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-name">Full name</label>
                                <input
                                    id="reg-name"
                                    className="form-input"
                                    type="text"
                                    placeholder="Your name"
                                    value={authForm.name}
                                    onChange={(event) => setAuthForm((form) => ({ ...form, name: event.target.value }))}
                                    autoComplete="name"
                                    maxLength={100}
                                    required
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-email">Email address</label>
                            <input
                                id="auth-email"
                                className="form-input"
                                type="email"
                                placeholder="name@example.com"
                                value={authForm.email}
                                onChange={(event) => setAuthForm((form) => ({ ...form, email: event.target.value }))}
                                autoComplete="email"
                                maxLength={254}
                                required
                            />
                        </div>
                        <div className="form-group auth-password-group">
                            <div className="auth-label-row">
                                <label className="form-label" htmlFor="auth-password">Password</label>
                                {isRegister && <span>6 characters minimum</span>}
                            </div>
                            <input
                                id="auth-password"
                                className="form-input"
                                type="password"
                                placeholder="Enter your password"
                                value={authForm.password}
                                onChange={(event) => setAuthForm((form) => ({ ...form, password: event.target.value }))}
                                autoComplete={isRegister ? "new-password" : "current-password"}
                                minLength={6}
                                maxLength={128}
                                required
                            />
                        </div>
                        <button
                            id="auth-submit-btn"
                            className="btn btn-primary btn-full btn-lg auth-submit"
                            type="submit"
                            disabled={busyAction === "register" || busyAction === "login"}
                        >
                            {busyAction === mode
                                ? <><span className="spinner" /> {isRegister ? "Creating account..." : "Signing in..."}</>
                                : isRegister ? "Create account" : "Sign in"}
                        </button>
                    </form>

                    <p className="auth-privacy-note">
                        Your session is protected with a secure, HttpOnly cookie.
                    </p>

                    <button
                        className="api-status-row"
                        onClick={() => void onHealthCheck()}
                        id="health-check-btn"
                        type="button"
                        aria-label="Check service status"
                    >
                        <span className={`status-dot dot-${health}`} />
                        <span aria-live="polite">
                            {health === "online" ? "Service available" : health === "offline" ? "Service unavailable" : "Checking service"}
                        </span>
                        <span className="api-url">{ledgerApi.baseUrl}</span>
                    </button>
                </div>
            </main>
        </div>
    )
}
