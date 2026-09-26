import { useState } from "react"
import { Icon } from "../icons"

export default function CreateAccountModal({ busy, onClose, onSubmit }) {
    const [name, setName] = useState("")
    const trimmedName = name.trim()

    function handleSubmit(event) {
        event.preventDefault()

        if (trimmedName) {
            void onSubmit(trimmedName)
        }
    }

    function handleOverlayClick(event) {
        if (event.target === event.currentTarget && !busy) {
            onClose()
        }
    }

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
                <div className="modal-header">
                    <h2 className="modal-title" id="account-modal-title">Create account</h2>
                    <button className="icon-btn" type="button" onClick={onClose} disabled={busy} aria-label="Close">
                        {Icon.close}
                    </button>
                </div>

                <p className="modal-description">
                    Add a name you can easily recognize in expenses and transfers.
                </p>

                <form className="modal-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="account-name">Account name</label>
                        <input
                            id="account-name"
                            className="form-input"
                            type="text"
                            placeholder="e.g. SBI Salary or Cash Wallet"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={50}
                            disabled={busy}
                            autoFocus
                            required
                        />
                        <span className="form-hint">Maximum 50 characters</span>
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-secondary" type="button" onClick={onClose} disabled={busy}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" type="submit" disabled={busy || !trimmedName}>
                            {busy ? <><span className="spinner" /> Creating...</> : <>{Icon.plus} Create account</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
