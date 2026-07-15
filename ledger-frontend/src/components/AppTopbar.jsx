import { getPageSubtitle, PAGE_TITLES } from "../constants"
import { Icon } from "../icons"

export default function AppTopbar({ activeTab, user, onShowModal }) {
    return (
        <div className="topbar">
            <div className="topbar-info">
                <h1 className="page-title">{PAGE_TITLES[activeTab]}</h1>
                <p className="page-subtitle">{getPageSubtitle(activeTab, user)}</p>
            </div>
            <button id="topbar-add-btn" className="btn btn-primary" onClick={onShowModal}>
                {Icon.plus} Add Transaction
            </button>
        </div>
    )
}
