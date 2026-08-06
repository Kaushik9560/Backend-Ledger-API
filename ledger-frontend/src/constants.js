export const CATEGORY_META = {
    "Food & Dining": { icon: "FD", color: "var(--cat-food)" },
    Transport: { icon: "TR", color: "var(--cat-transport)" },
    Shopping: { icon: "SH", color: "var(--cat-shopping)" },
    "Bills & Utilities": { icon: "BU", color: "var(--cat-bills)" },
    Entertainment: { icon: "EN", color: "var(--cat-entertainment)" },
    "Health & Medical": { icon: "HM", color: "var(--cat-health)" },
    Education: { icon: "ED", color: "var(--cat-education)" },
    Travel: { icon: "TV", color: "var(--cat-travel)" },
    "Salary & Income": { icon: "IN", color: "var(--cat-salary)" },
    Investments: { icon: "IV", color: "var(--cat-investments)" },
    "Rent & Housing": { icon: "RH", color: "var(--cat-rent)" },
    Others: { icon: "OT", color: "var(--cat-others)" }
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const PAGE_TITLES = {
    dashboard: "Dashboard",
    expenses: "Expenses",
    analytics: "Analytics",
    accounts: "Accounts",
    transfer: "Transfer",
    budget: "Budget"
}

export function getPageSubtitle(activeTab, user) {
    const firstName = user.name.split(" ")[0]
    const subtitles = {
        dashboard: `Good to see you, ${firstName}`,
        expenses: "Review income and spending in one place",
        analytics: "Understand where your money goes",
        accounts: "Manage your linked accounts",
        transfer: "Move money between your accounts",
        budget: "Plan monthly spending by category"
    }

    return subtitles[activeTab]
}
