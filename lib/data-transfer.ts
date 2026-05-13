import type { Transaction, TransactionDestination, CurrencyCode } from "@/lib/finance"

// ============================================================
// BACKUP SCHEMA v2 - Complete user state serialization
// ============================================================

export type BackupMetadata = {
  version: 2
  exportedAt: string
  appVersion?: string
  exportedFrom?: string
}

export type AccountBalances = {
  card: number
  cash: number
  savings: number
}

export type RecurringTemplate = {
  id: string
  amount: number
  category: string
  type: "income" | "expense"
  name?: string
  destination?: TransactionDestination
  dayOfMonth?: number // Day of month for auto-deduction (1-31)
}

export type QuickTemplate = {
  id: string
  label: string
  amount: number
  category: string
}

export type UserSettings = {
  currency: CurrencyCode
  monthlyPlan: number
  quickTemplates: QuickTemplate[]
}

export type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  icon: string
  color: string
  createdAt: string
  monthlyContribution?: number
}

export type FinanceBackupV2 = {
  metadata: BackupMetadata
  accounts: AccountBalances
  transactions: {
    [monthKey: string]: Transaction[]
  }
  recurring: RecurringTemplate[]
  savingsGoals: SavingsGoal[]
  plans: {
    [planKey: string]: number
  }
  settings: UserSettings
}

// Legacy v1 schema (for migration)
export type FinanceBackupV1 = {
  version: 1
  exportedAt: string
  data: {
    [monthKey: string]: Transaction[]
  }
  plans: {
    [planKey: string]: number
  }
}

export type FinanceBackup = FinanceBackupV1 | FinanceBackupV2

// ============================================================
// EXPORT SERVICE
// ============================================================

const BALANCES_KEY = "balances_v1"
const RECURRING_KEY = "recurring_transactions_v1"
const SAVINGS_GOALS_KEY = "savings_goals_v1"
const CURRENCY_KEY = "active_currency_v1"
const QUICK_TEMPLATES_KEY = "quick_templates_v1"
const DEFAULT_PLAN = 25000

export function collectAllLocalStorageData(): {
  balances: AccountBalances
  transactions: FinanceBackupV2["transactions"]
  recurring: RecurringTemplate[]
  savingsGoals: SavingsGoal[]
  plans: { [planKey: string]: number }
  settings: UserSettings
  entityCounts: {
    months: number
    totalTransactions: number
    recurring: number
    savingsGoals: number
  }
} {
  if (typeof window === "undefined") {
    return {
      balances: { card: 0, cash: 0, savings: 0 },
      transactions: {},
      recurring: [],
      savingsGoals: [],
      plans: {},
      settings: { currency: "UAH", monthlyPlan: DEFAULT_PLAN, quickTemplates: [] },
      entityCounts: { months: 0, totalTransactions: 0, recurring: 0, savingsGoals: 0 },
    }
  }

  // Collect balances
  const balancesRaw = window.localStorage.getItem(BALANCES_KEY)
  const balances: AccountBalances = balancesRaw
    ? JSON.parse(balancesRaw)
    : { card: 0, cash: 0, savings: 0 }

  // Collect all monthly transactions
  const transactions: FinanceBackupV2["transactions"] = {}
  let totalTransactions = 0
  let monthCount = 0

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith("finance_")) continue

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]")
      if (Array.isArray(parsed)) {
        transactions[key] = parsed
        totalTransactions += parsed.length
        monthCount++
      }
    } catch {
      // skip malformed entries
    }
  }

  // Collect recurring templates
  const recurringRaw = window.localStorage.getItem(RECURRING_KEY)
  const recurring: RecurringTemplate[] = recurringRaw
    ? JSON.parse(recurringRaw)
    : []

  // Collect savings goals
  const savingsGoalsRaw = window.localStorage.getItem(SAVINGS_GOALS_KEY)
  const savingsGoals: SavingsGoal[] = savingsGoalsRaw
    ? JSON.parse(savingsGoalsRaw)
    : []

  // Collect settings
  const currencyRaw = window.localStorage.getItem(CURRENCY_KEY)
  const currency: CurrencyCode =
    currencyRaw === "UAH" || currencyRaw === "USD" || currencyRaw === "EUR"
      ? currencyRaw
      : "UAH"

  const templatesRaw = window.localStorage.getItem(QUICK_TEMPLATES_KEY)
  const quickTemplates: QuickTemplate[] = templatesRaw
    ? JSON.parse(templatesRaw)
    : []

  // Collect ALL monthly plans
  const plans: { [planKey: string]: number } = {}
  const currentMonth = new Date()
  const allKeys = Object.keys(window.localStorage)
  const planKeys = allKeys.filter(key => key.startsWith('plan_'))
  
  planKeys.forEach(key => {
    const planRaw = window.localStorage.getItem(key)
    if (planRaw) {
      plans[key] = Number(planRaw)
    }
  })

  return {
    balances,
    transactions,
    recurring,
    savingsGoals,
    plans,
    settings: {
      currency,
      monthlyPlan: plans[`plan_${currentMonth.getFullYear()}_${String(currentMonth.getMonth() + 1).padStart(2, "0")}`] || DEFAULT_PLAN,
      quickTemplates,
    },
    entityCounts: {
      months: monthCount,
      totalTransactions,
      recurring: recurring.length,
      savingsGoals: savingsGoals.length,
    },
  }
}

export function exportAllData(): void {
  if (typeof window === "undefined") return

  const collected = collectAllLocalStorageData()

  const backup: FinanceBackupV2 = {
    metadata: {
      version: 2,
      exportedAt: new Date().toISOString(),
      appVersion: "2.0.0",
    },
    accounts: collected.balances,
    transactions: collected.transactions,
    recurring: collected.recurring,
    savingsGoals: collected.savingsGoals,
    plans: collected.plans,
    settings: collected.settings,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url

  const dateStr = new Date().toISOString().split("T")[0]
  a.download = `fintracker-backup-${dateStr}.json`

  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// MIGRATION SERVICE
// ============================================================

function migrateV1ToV2(backup: FinanceBackupV1): FinanceBackupV2 {
  // Extract balances from v1 (not available, use defaults)
  const balances: AccountBalances = { card: 0, cash: 0, savings: 0 }

  // Extract currency (default to UAH)
  const currency: CurrencyCode = "UAH"

  // Extract monthly plan from most recent month
  const planKeys = Object.keys(backup.plans).sort().reverse()
  const monthlyPlan = planKeys.length > 0 ? backup.plans[planKeys[0]] : 25000

  return {
    metadata: {
      version: 2,
      exportedAt: backup.exportedAt,
      appVersion: "migrated-from-v1",
    },
    accounts: balances,
    transactions: backup.data,
    recurring: [],
    savingsGoals: [],
    plans: backup.plans || {},
    settings: {
      currency,
      monthlyPlan,
      quickTemplates: [],
    },
  }
}

// ============================================================
// VALIDATION LAYER
// ============================================================

function validateBackupV2(backup: unknown): { valid: true; data: FinanceBackupV2 } | { valid: false; error: string } {
  if (typeof backup !== "object" || backup === null) {
    return { valid: false, error: "Invalid backup format: not an object" }
  }

  const b = backup as Record<string, unknown>

  // Check metadata
  if (typeof b.metadata !== "object" || b.metadata === null) {
    return { valid: false, error: "Missing metadata section" }
  }

  const meta = b.metadata as Record<string, unknown>
  if (meta.version !== 2) {
    return { valid: false, error: `Unsupported backup version: ${meta.version}` }
  }

  if (typeof meta.exportedAt !== "string") {
    return { valid: false, error: "Missing export timestamp" }
  }

  // Check accounts
  if (typeof b.accounts !== "object" || b.accounts === null) {
    return { valid: false, error: "Missing accounts section" }
  }

  const accounts = b.accounts as Record<string, unknown>
  if (typeof accounts.card !== "number" || typeof accounts.cash !== "number" || typeof accounts.savings !== "number") {
    return { valid: false, error: "Invalid account balances" }
  }

  // Check transactions
  if (typeof b.transactions !== "object" || b.transactions === null) {
    return { valid: false, error: "Missing transactions section" }
  }

  const transactions = b.transactions as Record<string, unknown>
  for (const [key, txs] of Object.entries(transactions)) {
    if (!key.startsWith("finance_") || !Array.isArray(txs)) {
      return { valid: false, error: `Invalid transaction entry: ${key}` }
    }
  }

  // Check recurring
  if (!Array.isArray(b.recurring)) {
    return { valid: false, error: "Missing recurring transactions" }
  }

  // Check settings
  if (typeof b.settings !== "object" || b.settings === null) {
    return { valid: false, error: "Missing settings section" }
  }

  const settings = b.settings as Record<string, unknown>
  if (typeof settings.currency !== "string") {
    return { valid: false, error: "Missing currency setting" }
  }

  if (!["UAH", "USD", "EUR"].includes(settings.currency as string)) {
    return { valid: false, error: `Unsupported currency: ${settings.currency}` }
  }

  return { valid: true, data: backup as FinanceBackupV2 }
}

function validateBackupV1(backup: unknown): { valid: true; data: FinanceBackupV1 } | { valid: false; error: string } {
  if (typeof backup !== "object" || backup === null) {
    return { valid: false, error: "Invalid backup format: not an object" }
  }

  const b = backup as Record<string, unknown>
  if (b.version !== 1) {
    return { valid: false, error: "Not a version 1 backup" }
  }

  if (typeof b.data !== "object" || typeof b.plans !== "object") {
    return { valid: false, error: "Missing required sections (data, plans)" }
  }

  return { valid: true, data: backup as FinanceBackupV1 }
}

// ============================================================
// IMPORT SERVICE
// ============================================================

export type ImportSummary = {
  version: number
  exportedAt: string
  months: number
  totalTransactions: number
  recurring: number
  balances: AccountBalances
  currency: CurrencyCode
  monthlyPlan: number
}

export function importDataFromFile(
  file: File,
  onSuccess: (summary: ImportSummary) => void,
  onError: (message: string) => void
): void {
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const raw = e.target?.result
      if (typeof raw !== "string") throw new Error("Could not read file.")

      const parsed: unknown = JSON.parse(raw)

      // Try v2 first
      const v2Validation = validateBackupV2(parsed)
      if (v2Validation.valid) {
        importBackupV2(v2Validation.data, onSuccess)
        return
      }

      // Fallback to v1
      const v1Validation = validateBackupV1(parsed)
      if (v1Validation.valid) {
        const migrated = migrateV1ToV2(v1Validation.data)
        importBackupV2(migrated, onSuccess)
        return
      }

      // Both validations failed
      onError(v2Validation.error)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to import file.")
    }
  }

  reader.onerror = () => onError("Failed to read the file.")
  reader.readAsText(file)
}

function importBackupV2(
  backup: FinanceBackupV2,
  onSuccess: (summary: ImportSummary) => void
): void {
  if (typeof window === "undefined") return

  // Clear all existing finance data
  const keysToRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k && (k.startsWith("finance_") || k.startsWith("plan_") || k === BALANCES_KEY || k === RECURRING_KEY || k === SAVINGS_GOALS_KEY || k === CURRENCY_KEY || k === QUICK_TEMPLATES_KEY)) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach((k) => window.localStorage.removeItem(k))

  // Restore account balances
  window.localStorage.setItem(BALANCES_KEY, JSON.stringify(backup.accounts))

  // Restore transactions
  for (const [key, txs] of Object.entries(backup.transactions)) {
    window.localStorage.setItem(key, JSON.stringify(txs))
  }

  // Restore recurring templates
  if (backup.recurring.length > 0) {
    window.localStorage.setItem(RECURRING_KEY, JSON.stringify(backup.recurring))
  }

  // Restore savings goals
  if (backup.savingsGoals && backup.savingsGoals.length > 0) {
    window.localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(backup.savingsGoals))
  }

  // Restore settings
  window.localStorage.setItem(CURRENCY_KEY, backup.settings.currency)
  window.localStorage.setItem(QUICK_TEMPLATES_KEY, JSON.stringify(backup.settings.quickTemplates))

  // Restore ALL monthly plans from backup
  if (backup.plans && Object.keys(backup.plans).length > 0) {
    for (const [planKey, planValue] of Object.entries(backup.plans)) {
      window.localStorage.setItem(planKey, String(planValue))
    }
  } else {
    // Fallback: restore current month's plan from settings
    const currentMonth = new Date()
    const planKey = `plan_${currentMonth.getFullYear()}_${String(currentMonth.getMonth() + 1).padStart(2, "0")}`
    window.localStorage.setItem(planKey, String(backup.settings.monthlyPlan))
  }

  // Calculate import summary
  const monthCount = Object.keys(backup.transactions).length
  const totalTransactions = Object.values(backup.transactions).reduce(
    (sum, txs) => sum + txs.length,
    0
  )

  const summary: ImportSummary = {
    version: 2,
    exportedAt: backup.metadata.exportedAt,
    months: monthCount,
    totalTransactions,
    recurring: backup.recurring.length,
    balances: backup.accounts,
    currency: backup.settings.currency,
    monthlyPlan: backup.settings.monthlyPlan,
  }

  onSuccess(summary)
}
