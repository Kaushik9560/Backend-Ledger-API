export const CATEGORY_META = {
    "Food & Dining": { icon: "🍔", color: "var(--cat-food)" },
    Transport: { icon: "🚗", color: "var(--cat-transport)" },
    Shopping: { icon: "🛍️", color: "var(--cat-shopping)" },
    "Bills & Utilities": { icon: "⚡", color: "var(--cat-bills)" },
    Entertainment: { icon: "🎬", color: "var(--cat-entertainment)" },
    "Health & Medical": { icon: "🏥", color: "var(--cat-health)" },
    Education: { icon: "📚", color: "var(--cat-education)" },
    Travel: { icon: "✈️", color: "var(--cat-travel)" },
    "Salary & Income": { icon: "💼", color: "var(--cat-salary)" },
    Investments: { icon: "📈", color: "var(--cat-investments)" },
    "Rent & Housing": { icon: "🏠", color: "var(--cat-rent)" },
    Others: { icon: "📦", color: "var(--cat-others)" }
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const AUTH_FEATURES = [
    { icon: "📊", text: "Visual analytics & insights" },
    { icon: "🏷️", text: "Category-based tracking" },
    { icon: "🔐", text: "JWT auth + secure sessions" },
    { icon: "⚡", text: "Real-time balance from ledger" },
    { icon: "🔄", text: "Account-to-account transfers" },
    { icon: "🗂️", text: "Double-entry bookkeeping" }
]

export const TECH_STACK = ["Node.js", "Express", "MongoDB", "React", "JavaScript"]

export const PAGE_TITLES = {
    dashboard: "Dashboard",
    expenses: "Expenses",
    analytics: "Analytics",
    accounts: "Accounts",
    transfer: "Transfer",
    budget: "Budgets"
}

export function getPageSubtitle(activeTab, user) {
    const firstName = user.name.split(" ")[0]
    const subtitles = {
        dashboard: `Good day, ${firstName}!`,
        expenses: "All your transactions in one place",
        analytics: "Insights into your spending",
        accounts: "Manage your bank accounts",
        transfer: "Move funds between accounts",
        budget: "Set monthly limits per category"
    }

    return subtitles[activeTab]
}
