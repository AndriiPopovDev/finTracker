export type CategoryInfo = { name: string; emoji: string; iconName: CategoryIconName; color: string }

export type CategoryIconName =
  | "cart"
  | "utensils"
  | "film"
  | "home"
  | "gift"
  | "gamepad"
  | "user"
  | "briefcase"
  | "star"
  | "laptop"
  | "pin"
  | "pill"

export const CATEGORIES: {
  expense: readonly CategoryInfo[]
  income: readonly CategoryInfo[]
} = {
  expense: [
    { name: "Grocery", emoji: "🛒", iconName: "cart", color: "#8b5cf6" },
    { name: "Restaurants", emoji: "🍽️", iconName: "utensils", color: "#f59e0b" },
    { name: "Entertainment", emoji: "🎬", iconName: "film", color: "#ec4899" },
    { name: "Housing & Utilities", emoji: "🏠", iconName: "home", color: "#3b82f6" },
    { name: "Medicine", emoji: "💊", iconName: "pill", color: "#06b6d4" },
    { name: "Gifts", emoji: "🎁", iconName: "gift", color: "#10b981" },
    { name: "Games", emoji: "🎮", iconName: "gamepad", color: "#84cc16" },
    { name: "Personal", emoji: "👤", iconName: "user", color: "#a78bfa" },
  ],
  income: [
    { name: "Salary", emoji: "💼", iconName: "briefcase", color: "#10b981" },
    { name: "Bonus", emoji: "⭐", iconName: "star", color: "#f59e0b" },
    { name: "Freelance", emoji: "💻", iconName: "laptop", color: "#3b82f6" },
    { name: "Other", emoji: "📌", iconName: "pin", color: "#94a3b8" },
  ],
}

export const COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e", "#f59e0b", "#06b6d4", "#ec4899",
  "#84cc16", "#f97316", "#14b8a6", "#a855f7", "#ef4444", "#6366f1", "#e11d48",
  "#0ea5e9", "#d946ef", "#22c55e", "#eab308", "#64748b"
]

// Generate a color for categories not in CATEGORIES
const categoryColorCache = new Map<string, string>()
let colorIndex = 0

export function getCategoryColor(categoryName: string, index?: number): string {
  // Check if it's a predefined category
  const predefined = CATEGORIES.expense.find(c => c.name === categoryName) || 
                     CATEGORIES.income.find(c => c.name === categoryName)
  if (predefined) return predefined.color
  
  // Return cached color if exists
  if (categoryColorCache.has(categoryName)) {
    return categoryColorCache.get(categoryName)!
  }
  
  // Assign new color from extended palette
  const color = COLORS[(index ?? colorIndex++) % COLORS.length]
  categoryColorCache.set(categoryName, color)
  return color
}

export type TransactionType = "income" | "expense" | "transfer"
export type CurrencyCode = "UAH" | "USD" | "EUR"
export type TransactionDestination = "card" | "cash" | "savings"

export type Transaction = {
  id: number
  amount: number
  category: string
  type: TransactionType
  date: string
  name?: string
  recurringId?: string
  destination?: TransactionDestination
  transferFrom?: TransactionDestination
  transferTo?: TransactionDestination
}

export function getCategoryEmoji(type: TransactionType, name: string): string {
  const list = type === "income" ? CATEGORIES.income : CATEGORIES.expense
  return list.find((c) => c.name === name)?.emoji ?? "📌"
}

export function getMonthKey(date: Date) {
  return `finance_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function getPlanKey(date: Date) {
  return `plan_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}`
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function formatPeriod(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

export function formatShortDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  UAH: "₴",
  USD: "$",
  EUR: "€",
}

const CURRENCY_RATE: Record<CurrencyCode, number> = {
  UAH: 1,
  USD: 0.025,
  EUR: 0.023,
}

export function convertFromUAH(value: number, currency: CurrencyCode): number {
  return value * CURRENCY_RATE[currency]
}

export function formatUAH(
  value: number,
  withSign?: "plus" | "minus",
  currency: CurrencyCode = "UAH"
) {
  const converted = convertFromUAH(value, currency)
  const formatted = converted.toLocaleString("uk-UA", {
    minimumFractionDigits: converted % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  const symbol = CURRENCY_SYMBOL[currency]
  if (withSign === "plus") return `+${formatted} ${symbol}`
  if (withSign === "minus") return `-${formatted} ${symbol}`
  return `${formatted} ${symbol}`
}
