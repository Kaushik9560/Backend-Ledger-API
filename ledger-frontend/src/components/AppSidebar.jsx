import { Icon } from "../icons"

export default function AppSidebar({
    user,
    activeTab,
    navItems,
    health,
    busyAction,
    onSetActiveTab,
    onShowModal,
    onHealthCheck,
    onLogout
}) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">💰</div>
                <div className="logo-text">
                    SpendWise
                    <span>Finance Tracker</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <span className="nav-section-label">Menu</span>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        id={`nav-${item.id}`}
                        className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                        onClick={() => onSetActiveTab(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <button
                    id="sidebar-add-btn"
                    className="btn btn-primary btn-full sidebar-add-btn"
                    onClick={onShowModal}
                >
                    {Icon.plus} Add Transaction
                </button>

                <div className="sidebar-user">
                    <div className="user-avatar">{user.name[0].toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                    </div>
                </div>

                <div className="sidebar-status-row">
                    <div
                        className={`status-pill dot-${health}`}
                        onClick={() => void onHealthCheck()}
                        id="sidebar-health-pill"
                    >
                        <span className={`status-dot dot-${health}`} />
                        <span>{health === "online" ? "API Online" : health === "offline" ? "Offline" : "Connecting..."}</span>
                    </div>
                    <button
                        id="nav-logout"
                        className="icon-btn logout-btn"
                        onClick={() => void onLogout()}
                        disabled={busyAction === "logout"}
                        title="Logout"
                    >
                        {Icon.logout}
                    </button>
                </div>
            </div>
        </aside>
    )
}
