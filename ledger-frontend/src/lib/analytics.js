import { MONTHS } from "../constants"

export function buildCategoryTotals(expenses) {
    const categoryTotals = {}

    expenses.forEach((expense) => {
        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = { expense: 0, income: 0 }
        }

        categoryTotals[expense.category][expense.type] += expense.amount
    })

    return categoryTotals
}

export function buildTopExpenseCategories(categoryTotals) {
    return Object.entries(categoryTotals)
        .map(([category, totals]) => ({ cat: category, total: totals.expense }))
        .filter((item) => item.total > 0)
        .sort((left, right) => right.total - left.total)
        .slice(0, 6)
}

export function buildMonthlyData(monthlyTrend = []) {
    const monthlyMap = {}

    monthlyTrend.forEach((monthEntry) => {
        const key = `${monthEntry._id.year}-${String(monthEntry._id.month).padStart(2, "0")}`

        if (!monthlyMap[key]) {
            monthlyMap[key] = { income: 0, expense: 0 }
        }

        monthlyMap[key][monthEntry._id.type] += monthEntry.total
    })

    return Object.entries(monthlyMap)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-6)
        .map(([key, values]) => {
            const [, month] = key.split("-")
            return {
                label: MONTHS[Number.parseInt(month, 10) - 1],
                year: key.split("-")[0],
                ...values
            }
        })
}
