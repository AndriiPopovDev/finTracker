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
  type TransactionDestination,
  type TransactionType,
} from "@/lib/finance"
import { exportAllData, importDataFromFile, type ImportSummary, collectAllLocalStorageData } from "@/lib/data-transfer"
import { generateSmartInsights, type SmartInsight } from "@/lib/smart-insights"
import { triggerHaptic } from "@/lib/haptic"
import { FinanceHeader } from "@/components/finance-header"
import { BalanceCard } from "@/components/balance-card"
import { SummaryCards } from "@/components/summary-cards"
import { TransactionForm } from "@/components/transaction-form"
import { SpendingChart } from "@/components/spending-chart"
import { TransactionList } from "@/components/transaction-list"
import { SmartInsightCard, ErrorBoundary } from "@/components/ui"

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
  destination?: TransactionDestination
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
  const [card, setCard] = useState<number>(0)
  const [cash, setCash] = useState<number>(0)
  const [savings, setSavings] = useState<number>(0)
  const [hydrated, setHydrated] = useState(false)
  const [fabVisible, setFabVisible] = useState(true)
  const lastScrollY = useRef(0)

  const [transactionType, setTransactionType] = useState<TransactionType>("expense")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0].name)
  const [destination, setDestination] = useState<TransactionDestination>("card")
  const [transferFrom, setTransferFrom] = useState<TransactionDestination>("card")
  const [transferTo, setTransferTo] = useState<TransactionDestination>("cash")
  const [showHistory, setShowHistory] = useState(false)
  const [name, setName] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([])
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(DEFAULT_QUICK_TEMPLATES)
  const [currency, setCurrency] = useState<CurrencyCode>("UAH")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [monthlySubsOpen, setMonthlySubsOpen] = useState(false)

  // FAB + sheet state
  const [sheetOpen, setSheetOpen] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)

  // Calculate total monthly subscriptions
  const monthlyTotal = recurringTemplates.reduce((sum, t) => sum + t.amount, 0)

  const monthKey = useMemo(() => getMonthKey(date), [date])
  const planKey = useMemo(() => getPlanKey(date), [date])
  const periodLabel = useMemo(() => formatPeriod(date), [date])

  const BALANCES_KEY = "balances_v1"

  // Load balances
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(BALANCES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setCard(parsed.card ?? 0)
        setCash(parsed.cash ?? 0)
        setSavings(parsed.savings ?? 0)
      }
    } catch (error) {
      console.error('[FinanceTracker] Failed to load balances:', error)
    }
  }, [])

  // Persist balances
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      window.localStorage.setItem(BALANCES_KEY, JSON.stringify({ card, cash, savings }))
    } catch (error) {
      console.error('[FinanceTracker] Failed to persist balances:', error)
    }
  }, [card, cash, savings, hydrated])

  // Load transactions + plan for the active month
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
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
            destination: template.destination ?? "card",
          } satisfies Transaction))
        if (generated.length > 0) nextTransactions = [...generated, ...nextTransactions]
      }
      setTransactions(nextTransactions)
      const savedPlan = window.localStorage.getItem(planKey)
      setPlan(savedPlan ? Number(savedPlan) : DEFAULT_PLAN)
      setHydrated(true)
    } catch (error) {
      console.error('[FinanceTracker] Failed to load month data:', error)
      setHydrated(true) // Still mark as hydrated to prevent infinite loops
    }
  }, [monthKey, planKey])

  // Persist transactions
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      if (transactions.length === 0) {
        window.localStorage.removeItem(monthKey)
      } else {
        window.localStorage.setItem(monthKey, JSON.stringify(transactions))
      }
    } catch (error) {
      console.error('[FinanceTracker] Failed to persist transactions:', error)
    }
  }, [transactions, monthKey, hydrated])

  // Persist plan
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      if (plan === DEFAULT_PLAN) {
        window.localStorage.removeItem(planKey)
      } else {
        window.localStorage.setItem(planKey, String(plan))
      }
    } catch (error) {
      console.error('[FinanceTracker] Failed to persist plan:', error)
    }
  }, [plan, planKey, hydrated])

  // Persist recurring templates (sync from auto-detection in transaction form)
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      if (recurringTemplates.length === 0) {
        window.localStorage.removeItem(RECURRING_KEY)
      } else {
        window.localStorage.setItem(RECURRING_KEY, JSON.stringify(recurringTemplates))
      }
    } catch (error) {
      console.error('[FinanceTracker] Failed to persist recurring templates:', error)
    }
  }, [recurringTemplates, hydrated])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      window.localStorage.setItem(CURRENCY_KEY, currency)
    } catch (error) {
      console.error('[FinanceTracker] Failed to persist currency:', error)
    }
  }, [currency, hydrated])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    try {
      window.localStorage.setItem(QUICK_TEMPLATES_KEY, JSON.stringify(quickTemplates))
    } catch (error) {
      console.error('[FinanceTracker] Failed to persist quick templates:', error)
    }
  }, [quickTemplates, hydrated])

  // FAB auto-hide on scroll
  useEffect(() => {
    if (typeof window === "undefined") return
    
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollingDown = currentScrollY > lastScrollY.current && currentScrollY > 100
          const scrollingUp = currentScrollY < lastScrollY.current
          
          if (scrollingDown) setFabVisible(false)
          if (scrollingUp) setFabVisible(true)
          
          lastScrollY.current = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Smart insights calculation
  const smartInsights = useMemo(() => {
    if (!hydrated) return []

    // Get previous month's data
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    const prevMonthKey = getMonthKey(prevMonth)
    const prevMonthData = window.localStorage.getItem(prevMonthKey)
    const prevTransactions: Transaction[] = prevMonthData ? JSON.parse(prevMonthData) : []

    // Get historical data (last 3 months)
    const historicalTransactions: Transaction[] = []
    for (let i = 1; i <= 3; i++) {
      const histMonth = new Date(date.getFullYear(), date.getMonth() - i, 1)
      const histKey = getMonthKey(histMonth)
      const histData = window.localStorage.getItem(histKey)
      if (histData) {
        historicalTransactions.push(...JSON.parse(histData))
      }
    }

    return generateSmartInsights(
      transactions,
      prevTransactions,
      historicalTransactions,
      date,
      plan
    )
  }, [transactions, date, plan, hydrated])

  const applyTemplate = (template: QuickTemplate) => {
    setAmount(String(template.amount))
    setCategory(template.category)
    setName(template.label)
    setTransactionType("expense")
    setDestination("card")
  }

  const addTransaction = () => {
    const parsed = parseAmount(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return
    
    // Handle transfers
    if (transactionType === "transfer") {
      if (transferFrom === transferTo) return
      
      // Subtract from source
      if (transferFrom === "card") setCard((prev) => Math.max(0, prev - parsed))
      else if (transferFrom === "cash") setCash((prev) => Math.max(0, prev - parsed))
      else if (transferFrom === "savings") setSavings((prev) => Math.max(0, prev - parsed))
      
      // Add to destination
      if (transferTo === "card") setCard((prev) => prev + parsed)
      else if (transferTo === "cash") setCash((prev) => prev + parsed)
      else if (transferTo === "savings") setSavings((prev) => prev + parsed)
      
      const newTx: Transaction = {
        id: Date.now(),
        amount: parsed,
        category: "Transfer",
        type: "transfer",
        date: formatShortDate(new Date()),
        name: name.trim() || undefined,
        transferFrom,
        transferTo,
      }
      setTransactions([newTx, ...transactions])
      setAmount("")
      setName("")
      setSheetOpen(false)
      return
    }
    
    let recurringId: string | undefined
    if (isRecurring) {
      const recurringKey = `${transactionType}|${category}|${parsed}|${name.trim().toLowerCase()}`
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
          type: transactionType as "income" | "expense",
          name: name.trim() || undefined,
          destination,
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
      type: transactionType,
      date: formatShortDate(new Date()),
      name: name.trim() || undefined,
      recurringId,
      destination,
    }
    setTransactions([newTx, ...transactions])

    // Adjust balances
    if (transactionType === "income") {
      if (destination === "card") setCard((prev) => prev + parsed)
      else if (destination === "cash") setCash((prev) => prev + parsed)
      else if (destination === "savings") setSavings((prev) => prev + parsed)
    } else {
      if (destination === "card") setCard((prev) => Math.max(0, prev - parsed))
      else if (destination === "cash") setCash((prev) => Math.max(0, prev - parsed))
    }

    setAmount("")
    setName("")
    setIsRecurring(false)
    setSheetOpen(false)
  }

  const updateTransaction = () => {
    if (editingId === null) return
    const parsed = parseAmount(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return
    
    // Find old transaction to reverse its balance changes
    const oldTx = transactions.find((t) => t.id === editingId)
    if (oldTx) {
      if (oldTx.type === "income") {
        if (oldTx.destination === "card") setCard((prev) => Math.max(0, prev - oldTx.amount))
        else if (oldTx.destination === "cash") setCash((prev) => Math.max(0, prev - oldTx.amount))
        else if (oldTx.destination === "savings") setSavings((prev) => Math.max(0, prev - oldTx.amount))
      } else if (oldTx.type === "expense") {
        if (oldTx.destination === "card") setCard((prev) => prev + oldTx.amount)
        else if (oldTx.destination === "cash") setCash((prev) => prev + oldTx.amount)
      } else if (oldTx.type === "transfer") {
        // Reverse transfer
        if (oldTx.transferFrom === "card") setCard((prev) => prev + oldTx.amount)
        else if (oldTx.transferFrom === "cash") setCash((prev) => prev + oldTx.amount)
        else if (oldTx.transferFrom === "savings") setSavings((prev) => prev + oldTx.amount)
        if (oldTx.transferTo === "card") setCard((prev) => Math.max(0, prev - oldTx.amount))
        else if (oldTx.transferTo === "cash") setCash((prev) => Math.max(0, prev - oldTx.amount))
        else if (oldTx.transferTo === "savings") setSavings((prev) => Math.max(0, prev - oldTx.amount))
      }
    }

    // Handle transfer edits
    if (transactionType === "transfer") {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, amount: parsed, category: "Transfer", type: "transfer" as const, name: name.trim() || undefined, transferFrom, transferTo }
            : t
        )
      )
      // Apply new transfer
      if (transferFrom === "card") setCard((prev) => Math.max(0, prev - parsed))
      else if (transferFrom === "cash") setCash((prev) => Math.max(0, prev - parsed))
      else if (transferFrom === "savings") setSavings((prev) => Math.max(0, prev - parsed))
      if (transferTo === "card") setCard((prev) => prev + parsed)
      else if (transferTo === "cash") setCash((prev) => prev + parsed)
      else if (transferTo === "savings") setSavings((prev) => prev + parsed)
    } else {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, amount: parsed, category, type: transactionType, name: name.trim() || undefined, destination }
            : t
        )
      )

      // Apply new balance changes
      if (transactionType === "income") {
        if (destination === "card") setCard((prev) => prev + parsed)
        else if (destination === "cash") setCash((prev) => prev + parsed)
        else if (destination === "savings") setSavings((prev) => prev + parsed)
      } else {
        if (destination === "card") setCard((prev) => Math.max(0, prev - parsed))
        else if (destination === "cash") setCash((prev) => Math.max(0, prev - parsed))
      }
    }

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
    setTransactionType("expense")
    setDestination("card")
    setCategory(CATEGORIES.expense[0].name)
    setSheetOpen(false)
  }

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setAmount(String(tx.amount))
    setName(tx.name ?? "")
    setTransactionType(tx.type)
    if (tx.type === "transfer") {
      setTransferFrom(tx.transferFrom ?? "card")
      setTransferTo(tx.transferTo ?? "cash")
    } else {
      setDestination(tx.destination ?? "card")
      setCategory(tx.category)
    }
    setIsRecurring(Boolean(tx.recurringId))
    setSheetOpen(true)
  }

  const deleteTransaction = (id: number) => {
    const tx = transactions.find((t) => t.id === id)
    if (tx) {
      // Reverse balance changes
      if (tx.type === "income") {
        if (tx.destination === "card") setCard((prev) => Math.max(0, prev - tx.amount))
        else if (tx.destination === "cash") setCash((prev) => Math.max(0, prev - tx.amount))
        else if (tx.destination === "savings") setSavings((prev) => Math.max(0, prev - tx.amount))
      } else if (tx.type === "expense") {
        if (tx.destination === "card") setCard((prev) => prev + tx.amount)
        else if (tx.destination === "cash") setCash((prev) => prev + tx.amount)
      } else if (tx.type === "transfer") {
        // Reverse transfer
        if (tx.transferFrom === "card") setCard((prev) => prev + tx.amount)
        else if (tx.transferFrom === "cash") setCash((prev) => prev + tx.amount)
        else if (tx.transferFrom === "savings") setSavings((prev) => prev + tx.amount)
        if (tx.transferTo === "card") setCard((prev) => Math.max(0, prev - tx.amount))
        else if (tx.transferTo === "cash") setCash((prev) => Math.max(0, prev - tx.amount))
        else if (tx.transferTo === "savings") setSavings((prev) => Math.max(0, prev - tx.amount))
      }
    }
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
    setTransactionType("expense")
    setDestination("card")
    setCategory(CATEGORIES.expense[0].name)
    setSheetOpen(true)
  }

  return (
    <main className="scroll-smooth relative min-h-screen overflow-hidden bg-[#0b1120] text-slate-200 font-sans">
      {/* ambient page gradients - optimized for mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 -left-32 h-56 w-56 rounded-full bg-cyan-500/6 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 -right-24 h-64 w-64 rounded-full bg-rose-600/6 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-md px-4 pb-28 pt-3 space-y-3">
        <ErrorBoundary>
          <FinanceHeader
            periodLabel={periodLabel}
            currentDate={date}
            onDateChange={setDate}
            historyOpen={showHistory}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleHistory={() => setShowHistory((v) => !v)}
          />

          <BalanceCard
            card={card}
            cash={cash}
            savings={savings}
            monthlyTotal={monthlyTotal}
            currency={currency}
            onCurrencyChange={setCurrency}
          />

          <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} currency={currency} />

          <SmartInsightCard insights={smartInsights} />

          <SpendingChart 
            data={chartData} 
            totalExpense={totalExpense} 
            currency={currency} 
            forecastValue={forecastValue}
            currentDate={date}
            allTransactions={transactions}
          />

          {showHistory && <HistoryView currentMonthKey={monthKey} onSelect={setDate} currency={currency} />}

          <TransactionList
            transactions={transactions}
            periodLabel={periodLabel}
            onDelete={deleteTransaction}
            onEdit={startEdit}
            currency={currency}
          />
        </ErrorBoundary>
      </div>

      {/* FAB */}
      <motion.button
        type="button"
        onClick={() => {
          triggerHaptic('medium')
          openSheetForNew()
        }}
        aria-label="Add transaction"
        initial={false}
        animate={{ 
          y: fabVisible ? 0 : 100,
          opacity: fabVisible ? 1 : 0,
          pointerEvents: fabVisible ? "auto" : "none"
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          mass: 0.8 
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 left-4 max-w-md mx-auto z-30 flex h-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </motion.button>

      {/* Bottom Sheet / Modal */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={cancelEdit}
              aria-hidden="true"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ 
                type: "spring", 
                stiffness: 350, 
                damping: 30, 
                mass: 0.8,
                restDelta: 0.001
              }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[75dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-slate-800/50 bg-slate-950/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl shadow-black/50"
            >
              {/* Drag handle */}
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700" aria-hidden="true" />

              {/* Close button */}
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              <TransactionForm
                transactionType={transactionType}
                setTransactionType={setTransactionType}
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
                destination={destination}
                setDestination={setDestination}
                transferFrom={transferFrom}
                setTransferFrom={setTransferFrom}
                transferTo={transferTo}
                setTransferTo={setTransferTo}
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
          setMonthlySubsOpen(false)
        }}
        plan={plan}
        setPlan={setPlan}
        card={card}
        setCard={setCard}
        cash={cash}
        setCash={setCash}
        savings={savings}
        setSavings={setSavings}
        currency={currency}
        recurringTemplates={recurringTemplates}
        setRecurringTemplates={setRecurringTemplates}
        onOpenMonthlySubs={() => setMonthlySubsOpen(true)}
        onCloseMonthlySubs={() => setMonthlySubsOpen(false)}
        monthlySubsOpen={monthlySubsOpen}
        quickTemplates={quickTemplates}
        setQuickTemplates={setQuickTemplates}
        onImportSuccess={(summary) => {
          // Reload all state from localStorage
          const savedTx = window.localStorage.getItem(monthKey)
          setTransactions(savedTx ? (JSON.parse(savedTx) as Transaction[]) : [])
          const savedPlan = window.localStorage.getItem(planKey)
          setPlan(savedPlan ? Number(savedPlan) : DEFAULT_PLAN)
          
          // Reload balances
          const balancesRaw = window.localStorage.getItem("balances_v1")
          if (balancesRaw) {
            const parsed = JSON.parse(balancesRaw)
            setCard(parsed.card ?? 0)
            setCash(parsed.cash ?? 0)
            setSavings(parsed.savings ?? 0)
          }
          
          // Show success summary
          window.alert(
            `✓ Import Successful!\n\n` +
            `📅 Exported: ${new Date(summary.exportedAt).toLocaleString()}\n` +
            `📊 ${summary.totalTransactions} transactions\n` +
            `📆 ${summary.months} months\n` +
            `🔄 ${summary.recurring} recurring payments\n` +
            `💰 Card: ${formatUAH(summary.balances.card, undefined, summary.currency)}\n` +
            `💵 Cash: ${formatUAH(summary.balances.cash, undefined, summary.currency)}\n` +
            `🏦 Savings: ${formatUAH(summary.balances.savings, undefined, summary.currency)}`
          )
        }}
        onImportError={(message: string) => window.alert(`✗ Import Failed: ${message}`)}
      />
    </main>
  )
}

function SettingsModal({
  open,
  onClose,
  plan,
  setPlan,
  card,
  setCard,
  cash,
  setCash,
  savings,
  setSavings,
  currency,
  recurringTemplates,
  setRecurringTemplates,
  onOpenMonthlySubs,
  onCloseMonthlySubs,
  quickTemplates,
  setQuickTemplates,
  monthlySubsOpen,
  onImportSuccess,
  onImportError,
}: {
  open: boolean
  onClose: () => void
  plan: number
  setPlan: (value: number) => void
  card: number
  setCard: (value: number) => void
  cash: number
  setCash: (value: number) => void
  savings: number
  setSavings: (value: number) => void
  currency: CurrencyCode
  recurringTemplates: RecurringTemplate[]
  setRecurringTemplates: Dispatch<SetStateAction<RecurringTemplate[]>>
  onOpenMonthlySubs: () => void
  onCloseMonthlySubs: () => void
  quickTemplates: QuickTemplate[]
  setQuickTemplates: Dispatch<SetStateAction<QuickTemplate[]>>
  monthlySubsOpen: boolean
  onImportSuccess: (summary: ImportSummary) => void
  onImportError: (message: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [planDraft, setPlanDraft] = useState(String(plan))
  const [cardDraft, setCardDraft] = useState(String(card))
  const [cashDraft, setCashDraft] = useState(String(cash))
  const [savingsDraft, setSavingsDraft] = useState(String(savings))

  useEffect(() => {
    if (open) {
      setPlanDraft(String(plan))
      setCardDraft(String(card))
      setCashDraft(String(cash))
      setSavingsDraft(String(savings))
    }
  }, [open, plan, card, cash, savings])

  const handleImportClick = () => fileInputRef.current?.click()
  const handleExportClick = () => {
    // Collect data for summary
    const collected = collectAllLocalStorageData()
    
    // Trigger download
    exportAllData()
    
    // Show summary after export
    setTimeout(() => {
      window.alert(
        `✓ Export Complete!\n\n` +
        `📊 ${collected.entityCounts.totalTransactions} transactions\n` +
        `📆 ${collected.entityCounts.months} months\n` +
        `🔄 ${collected.entityCounts.recurring} recurring payments\n` +
        `💰 Card: ${formatUAH(collected.balances.card)}\n` +
        `💵 Cash: ${formatUAH(collected.balances.cash)}\n` +
        `🏦 Savings: ${formatUAH(collected.balances.savings)}`
      )
    }, 300)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    importDataFromFile(file, onImportSuccess, onImportError)
    e.target.value = ""
  }

  const saveSettings = () => {
    const parsedPlan = Number(planDraft)
    if (Number.isFinite(parsedPlan) && parsedPlan > 0) setPlan(parsedPlan)
    const parsedCard = Number(cardDraft)
    if (Number.isFinite(parsedCard) && parsedCard >= 0) setCard(parsedCard)
    const parsedCash = Number(cashDraft)
    if (Number.isFinite(parsedCash) && parsedCash >= 0) setCash(parsedCash)
    const parsedSavings = Number(savingsDraft)
    if (Number.isFinite(parsedSavings) && parsedSavings >= 0) setSavings(parsedSavings)
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
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-md rounded-t-2xl border border-slate-800/50 bg-slate-950/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-800" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Settings</p>

            {monthlySubsOpen ? (
              <MonthlySubscriptionsManager
                templates={recurringTemplates}
                setTemplates={setRecurringTemplates}
                currency={currency}
                onDone={onCloseMonthlySubs}
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

                <div className="grid grid-cols-3 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs text-slate-400">Card</span>
                    <input
                      value={cardDraft}
                      onChange={(e) => setCardDraft(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-slate-400">Cash</span>
                    <input
                      value={cashDraft}
                      onChange={(e) => setCashDraft(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-slate-400">Savings</span>
                    <input
                      value={savingsDraft}
                      onChange={(e) => setSavingsDraft(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={onOpenMonthlySubs}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-800/50 bg-slate-900/30 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-700/50 hover:bg-slate-900/40"
                >
                  Manage Monthly Subscriptions
                </button>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleImportClick}
                    className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-3 text-slate-400 transition-colors hover:border-slate-700/50 hover:text-slate-300"
                    aria-label="Import backup JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportClick}
                    className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-3 text-slate-400 transition-colors hover:border-slate-700/50 hover:text-slate-300"
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

function MonthlySubscriptionsManager({
  templates,
  setTemplates,
  currency,
  onDone,
}: {
  templates: RecurringTemplate[]
  setTemplates: Dispatch<SetStateAction<RecurringTemplate[]>>
  currency: CurrencyCode
  onDone: () => void
}) {
  const updateTemplate = (id: string, patch: Partial<RecurringTemplate>) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const addTemplate = () => {
    setTemplates((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        name: "New subscription",
        amount: 100,
        category: "Personal",
        type: "expense" as const,
        destination: "card" as const,
      },
    ])
  }

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Monthly Subscriptions</p>
      <div className="max-h-[46dvh] space-y-2 overflow-y-auto pr-1">
        {templates.map((template) => (
          <div key={template.id} className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="space-y-2">
              <input
                type="text"
                value={template.name ?? ""}
                onChange={(e) => updateTemplate(template.id, { name: e.target.value || undefined })}
                placeholder="Subscription name"
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
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
                  className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                />
                <select
                  value={template.destination ?? "card"}
                  onChange={(e) => updateTemplate(template.id, { destination: e.target.value as TransactionDestination })}
                  className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs text-slate-300"
                >
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
                <button
                  type="button"
                  onClick={() => deleteTemplate(template.id)}
                  className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:text-rose-400"
                  aria-label={`Delete subscription ${template.name}`}
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
          className="h-10 rounded-xl border border-purple-500/20 bg-purple-500/5 text-sm font-medium text-purple-400 transition-colors hover:bg-purple-500/10 active:scale-95"
        >
          Add Subscription
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
        These subscriptions auto-deduct monthly. Total: {formatUAH(templates.reduce((sum, t) => sum + t.amount, 0), undefined, currency)}
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
                  className="flex w-11 items-center justify-center rounded-xl border border-slate-800/50 bg-slate-900/30 text-slate-500 transition-colors hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-400 active:scale-95"
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
