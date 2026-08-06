export function fmt(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0
    }).format(amount)
}

export function fmtDate(dateStr) {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date)
}

export function fmtRelative(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000)

    if (diff === 0) return "Today"
    if (diff === 1) return "Yesterday"
    if (diff < 7) return `${diff} days ago`
    return fmtDate(dateStr)
}

export function genIdem() {
    return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
