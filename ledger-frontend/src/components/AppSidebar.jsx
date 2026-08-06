import { Icon } from "../icons"
import BrandMark from "./BrandMark"

export default function AppSidebar({
    user,
    activeTab,
    navItems,
    health,
    busyAction,
    onSetActiveTab,
    onHealthCheck,
    onLogout
}) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark"><BrandMark /></div>
                <div className="logo-text">
                    SpendWise
                    <span>Personal finance</span>
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
                <div className="sidebar-user">
                    <div className="user-avatar">{user.name[0].toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                    </div>
                </div>

                <div className="sidebar-status-row">
                    <button
                        className="status-pill"
                        onClick={() => void onHealthCheck()}
                        id="sidebar-health-pill"
                        type="button"
                        aria-label="Check service status"
                    >
                        <span className={`status-dot dot-${health}`} />
                        <span>{health === "online" ? "Service online" : health === "offline" ? "Offline" : "Connecting..."}</span>
                    </button>
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
