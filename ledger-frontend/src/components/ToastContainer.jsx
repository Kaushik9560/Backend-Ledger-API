import { Icon } from "../icons"

export default function ToastContainer({ toasts, onRemove }) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
                    </span>
                    <span className="toast-msg">{toast.message}</span>
                    <button className="toast-close" onClick={() => onRemove(toast.id)}>
                        {Icon.close}
                    </button>
                </div>
            ))}
        </div>
    )
}
