"use client"

import { useEffect, useState } from "react"
import {
  CircleArrowDown as ArrowDownCircle,
  CircleArrowUp as ArrowUpCircle,
  Check,
  ChevronDown,
  ClipboardPaste,
  Coffee,
  Plus,
  ShoppingCart,
  TrendingUp,
  TrainFront as Transport,
  Utensils,
  X,
} from "lucide-react"
import { CATEGORIES, formatUAH } from "@/lib/finance"
import { CategorySelect } from "@/components/category-select"

// --- Inline calculator ---
// Safely evaluates simple math expressions (numbers, +, -, *, /, parentheses, commas as dots).
// Only allows numeric characters and basic operators to prevent code injection.
function evaluateExpression(raw: string): number | null {
  const normalized = raw.replace(/,/g, ".")
  // Allow digits, dots, operators, parens, spaces
  if (!/^[\d\s+\-*/().]+$/.test(normalized)) return null
  try {
    // Use Function constructor for safe eval of math-only expressions
    const result = new Function(`"use strict"; return (${normalized})`)()
    if (typeof result === "number" && Number.isFinite(result) && result > 0) return result
    return null
  } catch {
    return null
  }
}

// --- Smart paste RegEx ---
// Matches patterns like "150.00 UAH", "₴150", "150,00 UAH", "Transaction: 150.00 UAH at Silpo"
const AMOUNT_REGEX = /(?:UAH|₴|грн)\s*(\d[\d,.]*)|(\d[\d,.]*)\s*(?:UAH|₴|грн)/i
const MERCHANT_KEYWORDS: Record<string, string> = {
  silpo: "Grocery",
  ашан: "Grocery",
 Auchan: "Grocery",
  grocery: "Grocery",
  supermarket: "Grocery",
  coffee: "Restaurants",
  cafe: "Restaurants",
  restaurant: "Restaurants",
  mcdonald: "Restaurants",
  uber: "Transport",
  bolt: "Transport",
  taxi: "Transport",
  metro: "Transport",
  transport: "Transport",
  cinema: "Entertainment",
  netflix: "Entertainment",
  steam: "Games",
  gift: "Gifts",
  salary: "Salary",
  bonus: "Bonus",
  freelance: "Freelance",
}

function parseClipboard(text: string): { amount: number; category: string } | null {
  const match = text.match(AMOUNT_REGEX)
  if (!match) return null
  const rawAmount = (match[1] || match[2]).replace(/,/g, ".")
  const amount = Number.parseFloat(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  // Try to guess category from merchant keywords
  const lower = text.toLowerCase()
  let category = CATEGORIES.expense[0].name
  for (const [keyword, cat] of Object.entries(MERCHANT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      category = cat
      break
    }
  }

  return { amount, category }
}

// --- Quick templates ---
const QUICK_TEMPLATES = [
  { label: "Coffee", icon: Coffee, amount: 80, category: "Restaurants" },
  { label: "Grocery", icon: ShoppingCart, amount: 500, category: "Grocery" },
  { label: "Transport", icon: Transport, amount: 30, category: "Personal" },
  { label: "Lunch", icon: Utensils, amount: 200, category: "Restaurants" },
] as const

type Props = {
  isIncome: boolean
  setIsIncome: (v: boolean) => void
  amount: string
  setAmount: (v: string) => void
  category: string
  setCategory: (v: string) => void
  onAdd: () => void
  onCancelEdit?: () => void
  isEditing: boolean
  plan: number
  setPlan: (v: number) => void
  totalActualIncome: number
}

export function PlanAndForm({
  isIncome,
  setIsIncome,
  amount,
  setAmount,
  category,
  setCategory,
  onAdd,
  onCancelEdit,
  isEditing,
  plan,
  setPlan,
  totalActualIncome,
}: Props) {
  const categories = isIncome ? CATEGORIES.income : CATEGORIES.expense

  const [planEditing, setPlanEditing] = useState(false)
  const [planDraft, setPlanDraft] = useState(String(plan))
  const [calcPreview, setCalcPreview] = useState<string | null>(null)

  useEffect(() => {
    setPlanDraft(String(plan))
  }, [plan])

  const commitPlan = () => {
    const normalized = planDraft.replace(/,/g, ".")
    const parsed = Number.parseFloat(normalized)
    setPlan(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
    setPlanEditing(false)
  }

  // Evaluate math expression in the amount field for live preview
  useEffect(() => {
    if (!amount) {
      setCalcPreview(null)
      return
    }
    const result = evaluateExpression(amount)
    setCalcPreview(result !== null ? formatUAH(result) : null)
  }, [amount])

  const resolveAndSubmit = () => {
    // If the amount contains an expression, resolve it first
    if (amount) {
      const result = evaluateExpression(amount)
      if (result !== null) {
        setAmount(String(result))
      }
    }
    // Use a micro-delay so setAmount applies before onAdd reads it
    setTimeout(onAdd, 0)
  }

  const handleAmountBlur = () => {
    if (!amount) return
    const result = evaluateExpression(amount)
    if (result !== null) {
      setAmount(String(result))
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  const handleSmartPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = parseClipboard(text)
      if (parsed) {
        setAmount(String(parsed.amount))
        setCategory(parsed.category)
        setIsIncome(false)
      } else {
        // Fallback: try to find any number in the clipboard
        const numMatch = text.match(/(\d[\d,.]*)/)
        if (numMatch) {
          const raw = numMatch[1].replace(/,/g, ".")
          const num = Number.parseFloat(raw)
          if (Number.isFinite(num) && num > 0) {
            setAmount(String(num))
          }
        }
      }
    } catch {
      // Clipboard API not available or permission denied
    }
  }

  const applyTemplate = (template: (typeof QUICK_TEMPLATES)[number]) => {
    setAmount(String(template.amount))
    setCategory(template.category)
    setIsIncome(false)
  }

  return (
    <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/60 p-5 space-y-5 shadow-xl shadow-slate-950/40">
      {/* Plan vs Actual */}
      <div>
        <div className="flex items-center gap-2 text-slate-300">
          <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Income — Plan vs Actual
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Total Plan
            </p>
            {planEditing ? (
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                onBlur={commitPlan}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitPlan()
                  if (e.key === "Escape") {
                    setPlanDraft(String(plan))
                    setPlanEditing(false)
                  }
                }}
                className="mt-1 w-full bg-transparent text-2xl font-extrabold text-white outline-none [font-size:16px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlanEditing(true)}
                className="mt-1 flex items-center gap-1 text-2xl font-extrabold text-white"
              >
                {formatUAH(plan)}
                <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Total Actual
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-500">
              {formatUAH(totalActualIncome)}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-800" aria-hidden="true" />

      {/* Add / Edit Transaction */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {isEditing ? "Edit Transaction" : "Add Transaction"}
        </p>

        {/* Type toggle */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsIncome(false)
              setCategory(CATEGORIES.expense[0].name)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
              !isIncome
                ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
            Expense
          </button>
          <button
            type="button"
            onClick={() => {
              setIsIncome(true)
              setCategory(CATEGORIES.income[0].name)
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors ${
              isIncome
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
            Income
          </button>
        </div>

        {/* Amount + Category + Submit */}
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <label className="relative">
            <span className="sr-only">Amount</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              {isIncome ? (
                <ArrowUpCircle className="h-4 w-4 text-emerald-500/80" aria-hidden="true" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-rose-500/80" aria-hidden="true" />
              )}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount..."
              value={amount}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") resolveAndSubmit()
                if (e.key === "Escape" && isEditing && onCancelEdit) onCancelEdit()
              }}
              className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-3 text-[16px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
            {/* Calculator preview */}
            {calcPreview && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-blue-400/80">
                = {calcPreview}
              </span>
            )}
          </label>

          <CategorySelect
            categories={categories}
            value={category}
            onChange={setCategory}
          />

          {isEditing ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={resolveAndSubmit}
                aria-label="Update transaction"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/40 transition-transform hover:scale-105 hover:from-blue-400 hover:to-blue-600 active:scale-95"
              >
                <Check className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                aria-label="Cancel editing"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={resolveAndSubmit}
              aria-label="Add transaction"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-600/40 transition-transform hover:scale-105 hover:from-rose-400 hover:to-rose-600 active:scale-95"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Quick Templates + Smart Paste */}
        {!isEditing && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Smart Paste button */}
            <button
              type="button"
              onClick={handleSmartPaste}
              aria-label="Paste amount from clipboard"
              title="Paste from clipboard"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              Paste
            </button>

            {/* Quick template buttons */}
            {QUICK_TEMPLATES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  aria-label={`Quick add ${t.label}: ${t.amount} UAH`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                  <span className="text-slate-500">{t.amount}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
