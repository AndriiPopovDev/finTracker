"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Download, Plus, Trash2, Upload, X } from "lucide-react"
import {
  CATEGORIES,
  type CurrencyCode,
  formatPeriod,
  formatShortDate,
  formatUAH,
  getMonthKey,
  getPlanKey,
  type Transaction,
} from "@/lib/finance"
import { exportAllData, importDataFromFile } from "@/lib/data-transfer"
import { FinanceHeader } from "@/components/finance-header"
import { BalanceCard } from "@/components/balance-card"
import { SummaryCards } from "@/components/summary-cards"
import { TransactionForm } from "@/components/transaction-form"
import { SpendingChart } from "@/components/spending-chart"
import { TransactionList } from "@/components/transaction-list"

const DEFAULT_PLAN = 25000
const RECURRING_KEY = "recurring_transactions_v1"
const CURRENCY_KEY = "active_currency_v1"
const QUICK_TEMPLATES_KEY = "quick_templates_v1"

type RecurringTemplate = {
  id: string
  amount: number
  category: string
  type: "income" | "expense"
  name?: string
}

type QuickTemplate = {
  id: string
  label: string
  amount: number
  category: string
}

function parseAmount(raw: string): number {
  const normalized = raw.replace(/,/g, ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  { id: "coffee", label: "Coffee", amount: 80, category: "Restaurants" },
  { id: "grocery", label: "Grocery", amount: 500, category: "Grocery" },
  { id: "transport", label: "Transport", amount: 30, category: "Personal" },
]

export function FinanceTracker() {
  const [date, setDate] = useState<Date>(() => new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [plan, setPlan] = useState<number>(DEFAULT_PLAN)
  const [hydrated, setHydrated] = useState(false)

  const [isIncome, setIsIncome] = useState(false)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0].name)
  const [showHistory, setShowHistory] = useState(false)
  const [name, setName] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([])
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(DEFAULT_QUICK_TEMPLATES)
  const [currency, setCurrency] = useState<CurrencyCode>("UAH")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  // FAB + sheet state
  const [sheetOpen, setSheetOpen] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)

  const monthKey = useMemo(() => getMonthKey(date), [date])
  const planKey = useMemo(() => getPlanKey(date), [date])
  const periodLabel = useMemo(() => formatPeriod(date), [date])

  // Load transactions + plan for the active month
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedTx = window.localStorage.getItem(monthKey)
    let nextTransactions = savedTx ? (JSON.parse(savedTx) as Transaction[]) : []
    const savedRecurring = window.localStorage.getItem(RECURRING_KEY)
    const recurring = savedRecurring ? (JSON.parse(savedRecurring) as RecurringTemplate[]) : []
    setRecurringTemplates(recurring)
    const savedTemplates = window.localStorage.getItem(QUICK_TEMPLATES_KEY)
    setQuickTemplates(savedTemplates ? (JSON.parse(savedTemplates) as QuickTemplate[]) : DEFAULT_QUICK_TEMPLATES)
    const savedCurrency = window.localStorage.getItem(CURRENCY_KEY) as CurrencyCode | null
    if (savedCurrency === "UAH" || savedCurrency === "USD" || savedCurrency === "EUR") {
      setCurrency(savedCurrency)
    } else {
      setCurrency("UAH")
    }
    if (recurring.length > 0) {
      const existingRecurringIds = new Set(nextTransactions.map((t) => t.recurringId).filter(Boolean))
      const generated = recurring
        .filter((template) => !existingRecurringIds.has(template.id))
        .map((template) => ({
          id: Date.now() + Math.floor(Math.random() * 100000),
          amount: template.amount,
          category: template.category,
          type: template.type,
          date: formatShortDate(new Date()),
          name: template.name,
          recurringId: template.id,
        } satisfies Transaction))
      if (generated.length > 0) nextTransactions = [...generated, ...nextTransactions]
    }
    setTransactions(nextTransactions)
    const savedPlan = window.localStorage.getItem(planKey)
    setPlan(savedPlan ? Number(savedPlan) : DEFAULT_PLAN)
    setHydrated(true)
  }, [monthKey, planKey])

  // Persist transactions
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    if (transactions.length === 0) {
      window.localStorage.removeItem(monthKey)
    } else {
      window.localStorage.setItem(monthKey, JSON.stringify(transactions))
    }
  }, [transactions, monthKey, hydrated])

  // Persist plan
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    if (plan === DEFAULT_PLAN) {
      window.localStorage.removeItem(planKey)
    } else {
      window.localStorage.setItem(planKey, String(plan))
    }
  }, [plan, planKey, hydrated])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(CURRENCY_KEY, currency)
  }, [currency, hydrated])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    window.localStorage.setItem(QUICK_TEMPLATES_KEY, JSON.stringify(quickTemplates))
  }, [quickTemplates, hydrated])

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((a, b) => a + b.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((a, b) => a + b.amount, 0)

  const chartData = CATEGORIES.expense
    .map((cat) => ({
      name: cat.name,
      value: transactions
        .filter((t) => t.type === "expense" && t.category === cat.name)
        .reduce((a, b) => a + b.amount, 0),
    }))
    .filter((item) => item.value > 0)

  const forecastValue = useMemo(() => {
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth()
    const dayOfMonth = isCurrentMonth ? now.getDate() : 1
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const daysLeft = Math.max(0, daysInMonth - dayOfMonth)
    const avgDaily = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0
    return (plan - totalExpense) - avgDaily * daysLeft
  }, [date, plan, totalExpense])

  const applyTemplate = (template: QuickTemplate) => {
    setAmount(String(template.amount))
    setCategory(template.category)
    setName(template.label)
    setIsIncome(false)
  }

  const addTransaction = () => {
    const parsed = parseAmount(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return
    let recurringId: string | undefined
    if (isRecurring) {
      const recurringKey = `${isIncome ? "income" : "expense"}|${category}|${parsed}|${name.trim().toLowerCase()}`
      const existing = recurringTemplates.find(
        (r) =>
          `${r.type}|${r.category}|${r.amount}|${(r.name ?? "").trim().toLowerCase()}` === recurringKey
      )
      if (existing) {
        recurringId = existing.id
      } else {
        recurringId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`
        const nextTemplate: RecurringTemplate = {
          id: recurringId,
          amount: parsed,
          category,
          type: isIncome ? "income" : "expense",
          name: name.trim() || undefined,
        }
        const nextRecurring = [...recurringTemplates, nextTemplate]
        setRecurringTemplates(nextRecurring)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RECURRING_KEY, JSON.stringify(nextRecurring))
        }
      }
    }
    const newTx: Transaction = {
      id: Date.now(),
      amount: parsed,
      category,
      type: isIncome ? "income" : "expense",
      date: formatShortDate(new Date()),
      name: name.trim() || undefined,
      recurringId,
    }
    setTransactions([newTx, ...transactions])
    setAmount("")
    setName("")
    setIsRecurring(false)
    setSheetOpen(false)
  }

  const updateTransaction = () => {
    if (editingId === null) return
    const parsed = parseAmount(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? { ...t, amount: parsed, category, type: isIncome ? "income" : "expense", name: name.trim() || undefined }
          : t
      )
    )
    setEditingId(null)
    setAmount("")
    setName("")
    setIsRecurring(false)
    setSheetOpen(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAmount("")
    setName("")
    setIsRecurring(false)
    setIsIncome(false)
    setCategory(CATEGORIES.expense[0].name)
    setSheetOpen(false)
  }

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setAmount(String(tx.amount))
    setName(tx.name ?? "")
    setIsIncome(tx.type === "income")
    setCategory(tx.category)
    setIsRecurring(Boolean(tx.recurringId))
    setSheetOpen(true)
  }

  const deleteTransaction = (id: number) => {
    setTransactions(transactions.filter((t) => t.id !== id))
    if (editingId === id) cancelEdit()
  }

  const goToMonth = (offset: number) => {
    const next = new Date(date)
    next.setDate(1)
    next.setMonth(next.getMonth() + offset)
    setDate(next)
  }

  const openSheetForNew = () => {
    setEditingId(null)
    setAmount("")
    setName("")
    setIsRecurring(false)
    setIsIncome(false)
    setCategory(CATEGORIES.expense[0].name)
    setSheetOpen(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1120] text-slate-200 font-sans">
      {/* ambient page gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-blue-600/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -left-40 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 -right-32 h-80 w-80 rounded-full bg-rose-600/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-md px-4 pb-24 pt-3 space-y-5">
        <FinanceHeader
          periodLabel={periodLabel}
          currentDate={date}
          onDateChange={setDate}
          historyOpen={showHistory}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleHistory={() => setShowHistory((v) => !v)}
        />

        <BalanceCard
          plan={plan}
          totalExpense={totalExpense}
          currency={currency}
          onCurrencyChange={setCurrency}
        />

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} currency={currency} />

        <SpendingChart data={chartData} totalExpense={totalExpense} currency={currency} forecastValue={forecastValue} />

        {showHistory && <HistoryView currentMonthKey={monthKey} onSelect={setDate} currency={currency} />}

        <TransactionList
          transactions={transactions}
          periodLabel={periodLabel}
          onDelete={deleteTransaction}
          onEdit={startEdit}
          currency={currency}
        />
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={openSheetForNew}
        aria-label="Add transaction"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-xl shadow-rose-600/50 transition-transform hover:scale-110 active:scale-95"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Bottom Sheet / Modal */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={cancelEdit}
              aria-hidden="true"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
              className="fixed inset-x-0 bottom-10 z-50 mx-auto w-full max-w-md max-h-[68dvh] overflow-visible rounded-3xl border border-slate-700 bg-slate-950/98 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
              {/* Drag handle */}
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-700" aria-hidden="true" />

              {/* Close button */}
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              <TransactionForm
                isIncome={isIncome}
                setIsIncome={setIsIncome}
                amount={amount}
                setAmount={setAmount}
                name={name}
                setName={setName}
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
                currency={currency}
                quickTemplates={quickTemplates}
                onApplyTemplate={applyTemplate}
                category={category}
                setCategory={setCategory}
                onAdd={editingId !== null ? updateTransaction : addTransaction}
                onCancelEdit={cancelEdit}
                isEditing={editingId !== null}
              />
            </motion.div>

          </>
        )}
      </AnimatePresence>

      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
          setTemplatesOpen(false)
        }}
        plan={plan}
        setPlan={setPlan}
        currency={currency}
        recurringTemplates={recurringTemplates}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onCloseTemplates={() => setTemplatesOpen(false)}
        quickTemplates={quickTemplates}
        setQuickTemplates={setQuickTemplates}
        templatesOpen={templatesOpen}
        onImportSuccess={() => {
          const savedTx = window.localStorage.getItem(monthKey)
          setTransactions(savedTx ? (JSON.parse(savedTx) as Transaction[]) : [])
          const savedPlan = window.localStorage.getItem(planKey)
          setPlan(savedPlan ? Number(savedPlan) : DEFAULT_PLAN)
        }}
        onImportError={(msg) => window.alert(`Import failed: ${msg}`)}
      />
    </main>
  )
}

function SettingsModal({
  open,
  onClose,
  plan,
  setPlan,
  currency,
  recurringTemplates,
  onOpenTemplates,
  onCloseTemplates,
  quickTemplates,
  setQuickTemplates,
  templatesOpen,
  onImportSuccess,
  onImportError,
}: {
  open: boolean
  onClose: () => void
  plan: number
  setPlan: (value: number) => void
  currency: CurrencyCode
  recurringTemplates: RecurringTemplate[]
  onOpenTemplates: () => void
  onCloseTemplates: () => void
  quickTemplates: QuickTemplate[]
  setQuickTemplates: Dispatch<SetStateAction<QuickTemplate[]>>
  templatesOpen: boolean
  onImportSuccess: () => void
  onImportError: (message: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [planDraft, setPlanDraft] = useState(String(plan))

  useEffect(() => {
    if (open) setPlanDraft(String(plan))
  }, [open, plan])

  const handleImportClick = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    importDataFromFile(file, onImportSuccess, onImportError)
    e.target.value = ""
  }

  const saveSettings = () => {
    const parsed = Number(planDraft)
    if (Number.isFinite(parsed) && parsed > 0) setPlan(parsed)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-md rounded-t-3xl border border-slate-700 bg-slate-950/98 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-700" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Settings</p>

            {templatesOpen ? (
              <TemplateManager
                templates={quickTemplates}
                setTemplates={setQuickTemplates}
                currency={currency}
                onDone={onCloseTemplates}
              />
            ) : (
              <div className="mt-3 space-y-4">
                <label className="space-y-1.5">
                  <span className="text-sm text-slate-300">Planned income (default)</span>
                  <input
                    value={planDraft}
                    onChange={(e) => setPlanDraft(e.target.value)}
                    type="text"
                    inputMode="decimal"
                    className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/50 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600"
                >
                  Manage Templates
                </button>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleImportClick}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-slate-300 transition-colors hover:text-white"
                    aria-label="Import backup JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={exportAllData}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-slate-300 transition-colors hover:text-white"
                    aria-label="Export backup JSON"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                <div className="space-y-2">
                  <p className="text-sm text-slate-300">Recurring Transactions</p>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-400">
                    {recurringTemplates.length === 0 ? (
                      "No monthly rules yet."
                    ) : (
                      <ul className="space-y-1.5">
                        {recurringTemplates.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-2">
                            <span className="truncate">{item.name ?? item.category}</span>
                            <span className="shrink-0 text-slate-300">
                              {formatUAH(item.amount, undefined, currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="h-11 w-full rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-700/30"
                >
                  Save Settings
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function TemplateManager({
  templates,
  setTemplates,
  currency,
  onDone,
}: {
  templates: QuickTemplate[]
  setTemplates: Dispatch<SetStateAction<QuickTemplate[]>>
  currency: CurrencyCode
  onDone: () => void
}) {
  const updateTemplate = (id: string, patch: Partial<QuickTemplate>) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const addTemplate = () => {
    setTemplates((prev) => [
      ...prev,
      { id: `${Date.now()}`, label: "New template", amount: 100, category: "Personal" },
    ])
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Manage Templates</p>
      <div className="max-h-[46dvh] space-y-2 overflow-y-auto pr-1">
        {templates.map((template) => (
          <div key={template.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="space-y-2">
              <input
                type="text"
                value={template.label}
                onChange={(e) => updateTemplate(template.id, { label: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={template.amount}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n)) updateTemplate(template.id, { amount: n })
                  }}
                  className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => setTemplates((prev) => prev.filter((t) => t.id !== template.id))}
                  className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:text-rose-400"
                  aria-label={`Delete template ${template.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={addTemplate}
          className="h-10 rounded-xl border border-slate-700 bg-slate-900/50 text-sm font-medium text-slate-200"
        >
          Add Template
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-10 rounded-xl border border-slate-700 bg-slate-900/50 text-sm font-medium text-slate-200"
        >
          Done
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Template amounts are stored in base ₴ and rendered in the selected currency.
      </p>
    </div>
  )
}

function HistoryView({
  currentMonthKey,
  onSelect,
  currency,
}: {
  currentMonthKey: string
  onSelect: (date: Date) => void
  currency: CurrencyCode
}) {
  const [months, setMonths] = useState<
    { key: string; year: number; month: number; income: number; expense: number }[]
  >([])
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null)

  const loadMonths = useCallback(() => {
    if (typeof window === "undefined") return
    const entries: { key: string; year: number; month: number; income: number; expense: number }[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith("finance_")) continue
      try {
        const txs = JSON.parse(window.localStorage.getItem(key) || "[]") as Transaction[]
        const income = txs.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0)
        const expense = txs.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0)
        const [, y, m] = key.split("_")
        entries.push({ key, year: Number(y), month: Number(m), income, expense })
      } catch {
        // skip invalid entries
      }
    }
    entries.sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))
    setMonths(entries)
  }, [])

  useEffect(() => {
    loadMonths()
  }, [loadMonths, currentMonthKey])

  const deleteMonth = (financeKey: string) => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(financeKey)
    const planKey = financeKey.replace(/^finance_/, "plan_")
    window.localStorage.removeItem(planKey)
    setPendingDeleteKey(null)
    loadMonths()
  }

  if (months.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
        No history yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Past Months
      </h3>
      {months.map((m) => {
        const isCurrent = m.key === currentMonthKey
        const label = formatPeriod(new Date(m.year, m.month - 1, 1))
        const isPendingDelete = pendingDeleteKey === m.key

        return (
          <div
            key={m.key}
            className={`group flex items-stretch gap-2 rounded-2xl border bg-slate-900/40 p-2 transition-colors ${
              isCurrent
                ? "border-blue-500/60"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(new Date(m.year, m.month - 1, 1))}
              className="flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-800/40"
            >
              <div>
                <p className="text-sm font-bold text-slate-100">{label}</p>
                <p className="text-[11px] text-slate-500">
                  {isCurrent ? "Current period" : "Tap to view"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-emerald-500">
                  {formatUAH(m.income, "plus", currency)}
                </p>
                <p className="text-xs font-semibold text-rose-500">
                  {formatUAH(m.expense, "minus", currency)}
                </p>
              </div>
            </button>

            {!isCurrent && (
              isPendingDelete ? (
                <div className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => deleteMonth(m.key)}
                    className="rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-transform hover:scale-105 active:scale-95"
                    aria-label={`Confirm delete ${label}`}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteKey(null)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:bg-slate-800"
                    aria-label={`Cancel deleting ${label}`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingDeleteKey(m.key)}
                  aria-label={`Delete ${label}`}
                  className="flex w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
