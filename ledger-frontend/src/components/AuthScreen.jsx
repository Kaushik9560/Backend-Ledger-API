import { AUTH_FEATURES, TECH_STACK } from "../constants"
import { ledgerApi } from "../api"

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
    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-brand">
                    <div className="brand-logo">
                        <span>💰</span>
                    </div>
                    <h1 className="brand-name">SpendWise</h1>
                    <p className="brand-tagline">Your personal finance tracker,<br />built on a production ledger engine.</p>
                    <div className="brand-features">
                        {AUTH_FEATURES.map((feature) => (
                            <div className="brand-feature" key={feature.text}>
                                <span className="bf-icon">{feature.icon}</span>
                                <span>{feature.text}</span>
                            </div>
                        ))}
                    </div>
                    <div className="brand-stack">
                        {TECH_STACK.map((item) => (
                            <span className="stack-chip" key={item}>{item}</span>
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
                            onClick={() => setMode("login")}
                            type="button"
                        >
                            Sign In
                        </button>
                        <button
                            id="auth-register-tab"
                            className={`auth-tab ${mode === "register" ? "active" : ""}`}
                            onClick={() => setMode("register")}
                            type="button"
                        >
                            Register
                        </button>
                    </div>

                    <div className="auth-header">
                        <p className="auth-title">{mode === "login" ? "Welcome back 👋" : "Create account"}</p>
                        <p className="auth-sub">{mode === "login" ? "Sign in to your workspace" : "Join SpendWise today"}</p>
                    </div>

                    <form onSubmit={onSubmit} className="auth-form">
                        {mode === "register" && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-name">Full Name</label>
                                <input
                                    id="reg-name"
                                    className="form-input"
                                    type="text"
                                    placeholder="Kaushik Sharma"
                                    value={authForm.name}
                                    onChange={(event) => setAuthForm((form) => ({ ...form, name: event.target.value }))}
                                    autoComplete="name"
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-email">Email Address</label>
                            <input
                                id="auth-email"
                                className="form-input"
                                type="email"
                                placeholder="you@example.com"
                                value={authForm.email}
                                onChange={(event) => setAuthForm((form) => ({ ...form, email: event.target.value }))}
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                            <label className="form-label" htmlFor="auth-password">Password</label>
                            <input
                                id="auth-password"
                                className="form-input"
                                type="password"
                                placeholder="••••••••"
                                value={authForm.password}
                                onChange={(event) => setAuthForm((form) => ({ ...form, password: event.target.value }))}
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
                                : mode === "register" ? "Create Account" : "Sign In"}
                        </button>
                    </form>

                    <div className="auth-switch-row">
                        {mode === "login"
                            ? <>Don't have an account? <button onClick={() => setMode("register")}>Register</button></>
                            : <>Already have an account? <button onClick={() => setMode("login")}>Sign in</button></>}
                    </div>

                    <div className="api-status-row" onClick={() => void onHealthCheck()} id="health-check-btn">
                        <span className={`status-dot dot-${health}`} />
                        <span>{health === "online" ? "API Online" : health === "offline" ? "API Offline" : "Connecting..."}</span>
                        <span className="api-url">{ledgerApi.baseUrl}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
