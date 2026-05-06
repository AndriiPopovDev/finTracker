"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react"
import {
  CATEGORIES,
  formatPeriod,
  formatShortDate,
  formatUAH,
  getMonthKey,
  getPlanKey,
  type Transaction,
} from "@/lib/finance"
import { FinanceHeader } from "@/components/finance-header"
import { BalanceCard } from "@/components/balance-card"
import { SummaryCards } from "@/components/summary-cards"
import { TransactionForm } from "@/components/transaction-form"
import { SpendingChart } from "@/components/spending-chart"
import { TransactionList } from "@/components/transaction-list"

const DEFAULT_PLAN = 25000

function parseAmount(raw: string): number {
  const normalized = raw.replace(/,/g, ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

export function FinanceTracker() {
  const [date, setDate] = useState<Date>(() => new Date())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [plan, setPlan] = useState<number>(DEFAULT_PLAN)
  const [hydrated, setHydrated] = useState(false)

  const [isIncome, setIsIncome] = useState(false)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0].name)
  const [showHistory, setShowHistory] = useState(false)

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
    setTransactions(savedTx ? (JSON.parse(savedTx) as Transaction[]) : [])
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

  const addTransaction = () => {
    const parsed = parseAmount(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return
    const newTx: Transaction = {
      id: Date.now(),
      amount: parsed,
      category,
      type: isIncome ? "income" : "expense",
      date: formatShortDate(new Date()),
    }
    setTransactions([newTx, ...transactions])
    setAmount("")
    setSheetOpen(false)
  }

  const updateTransaction = () => {
    if (editingId === null) return
    const parsed = parseAmount(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) return
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? { ...t, amount: parsed, category, type: isIncome ? "income" : "expense" }
          : t
      )
    )
    setEditingId(null)
    setAmount("")
    setSheetOpen(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAmount("")
    setIsIncome(false)
    setCategory(CATEGORIES.expense[0].name)
    setSheetOpen(false)
  }

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setAmount(String(tx.amount))
    setIsIncome(tx.type === "income")
    setCategory(tx.category)
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
          onToggleHistory={() => setShowHistory((v) => !v)}
          onImportSuccess={() => {
            const savedTx = window.localStorage.getItem(monthKey)
            setTransactions(savedTx ? (JSON.parse(savedTx) as Transaction[]) : [])
            const savedPlan = window.localStorage.getItem(planKey)
            setPlan(savedPlan ? Number(savedPlan) : DEFAULT_PLAN)
          }}
          onImportError={(msg) => {
            window.alert(`Import failed: ${msg}`)
          }}
        />

        {/* Compact date nav — merged into one line */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Prev
          </button>
          <span className="whitespace-nowrap text-sm font-bold text-slate-200">{periodLabel}</span>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <BalanceCard plan={plan} totalExpense={totalExpense} />

        <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} />

        <SpendingChart data={chartData} totalExpense={totalExpense} />

        {showHistory && <HistoryView currentMonthKey={monthKey} onSelect={setDate} />}

        <TransactionList
          transactions={transactions}
          periodLabel={periodLabel}
          onDelete={deleteTransaction}
          onEdit={startEdit}
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
              className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border border-slate-700 bg-slate-950/98 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
              {/* Drag handle */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700" aria-hidden="true" />

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
    </main>
  )
}

function HistoryView({
  currentMonthKey,
  onSelect,
}: {
  currentMonthKey: string
  onSelect: (date: Date) => void
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
                  {formatUAH(m.income, "plus")}
                </p>
                <p className="text-xs font-semibold text-rose-500">
                  {formatUAH(m.expense, "minus")}
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
