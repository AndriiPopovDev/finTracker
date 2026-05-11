"use client"

import { useEffect, useRef, useState } from "react"
import {
  CircleArrowDown as ArrowDownCircle,
  CircleArrowUp as ArrowUpCircle,
  ArrowLeftRight,
  Check,
  ClipboardPaste,
  Coffee,
  Plus,
  ShoppingCart,
  Bus,
  Utensils,
  X,
  Repeat,
  CreditCard,
  Wallet,
  PiggyBank,
  type LucideIcon,
} from "lucide-react"
import { CATEGORIES, formatUAH, type CurrencyCode, type TransactionDestination, type TransactionType } from "@/lib/finance"
import { CategorySelect } from "@/components/category-select"

function evaluateExpression(raw: string): number | null {
  const normalized = raw.replace(/,/g, ".")
  if (!/^[\d\s+\-*/().]+$/.test(normalized)) return null
  try {
    const result = new Function(`"use strict"; return (${normalized})`)()
    if (typeof result === "number" && Number.isFinite(result) && result > 0) return result
    return null
  } catch {
    return null
  }
}

const AMOUNT_REGEX = /(?:UAH|₴|грн)\s*(\d[\d,.]*)|(\d[\d,.]*)\s*(?:UAH|₴|грн)/i
const MERCHANT_KEYWORDS: Record<string, string> = {
  silpo: "Grocery", ашан: "Grocery", auchan: "Grocery", grocery: "Grocery", supermarket: "Grocery",
  coffee: "Restaurants", cafe: "Restaurants", restaurant: "Restaurants", mcdonald: "Restaurants",
  uber: "Personal", bolt: "Personal", taxi: "Personal", metro: "Personal", transport: "Personal",
  cinema: "Entertainment", netflix: "Entertainment", steam: "Games", gift: "Gifts",
  salary: "Salary", bonus: "Bonus", freelance: "Freelance",
}

function parseClipboard(text: string): { amount: number; category: string } | null {
  const match = text.match(AMOUNT_REGEX)
  if (!match) return null
  const rawAmount = (match[1] || match[2]).replace(/,/g, ".")
  const amount = Number.parseFloat(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const lower = text.toLowerCase()
  let category = CATEGORIES.expense[0].name
  for (const [keyword, cat] of Object.entries(MERCHANT_KEYWORDS)) {
    if (lower.includes(keyword)) { category = cat; break }
  }
  return { amount, category }
}

const FALLBACK_TEMPLATES = [
  { label: "Coffee", icon: Coffee, amount: 80, category: "Restaurants" },
  { label: "Grocery", icon: ShoppingCart, amount: 500, category: "Grocery" },
  { label: "Transport", icon: Bus, amount: 30, category: "Personal" },
  { label: "Lunch", icon: Utensils, amount: 200, category: "Restaurants" },
] as const

const TEMPLATE_ICON_MAP: Record<string, LucideIcon> = {
  Coffee,
  Grocery: ShoppingCart,
  Transport: Bus,
  Lunch: Utensils,
}

type QuickTemplate = {
  id: string
  label: string
  amount: number
  category: string
}

const DESTINATION_OPTIONS: { value: TransactionDestination; label: string; icon: LucideIcon }[] = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "cash", label: "Cash", icon: Wallet },
  { value: "savings", label: "Savings", icon: PiggyBank },
]

type Props = {
  transactionType: TransactionType
  setTransactionType: (v: TransactionType) => void
  amount: string
  setAmount: (v: string) => void
  name: string
  setName: (v: string) => void
  isRecurring: boolean
  setIsRecurring: (v: boolean) => void
  currency: CurrencyCode
  quickTemplates: QuickTemplate[]
  onApplyTemplate: (template: QuickTemplate) => void
  category: string
  setCategory: (v: string) => void
  destination: TransactionDestination
  setDestination: (v: TransactionDestination) => void
  transferFrom: TransactionDestination
  setTransferFrom: (v: TransactionDestination) => void
  transferTo: TransactionDestination
  setTransferTo: (v: TransactionDestination) => void
  onAdd: () => void
  onCancelEdit?: () => void
  isEditing: boolean
}

export function TransactionForm({
  transactionType,
  setTransactionType,
  amount,
  setAmount,
  name,
  setName,
  isRecurring,
  setIsRecurring,
  currency,
  quickTemplates,
  onApplyTemplate,
  category,
  setCategory,
  destination,
  setDestination,
  transferFrom,
  setTransferFrom,
  transferTo,
  setTransferTo,
  onAdd,
  onCancelEdit,
  isEditing,
}: Props) {
  const categories = transactionType === "income" ? CATEGORIES.income : CATEGORIES.expense
  const [calcPreview, setCalcPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const keepAmountFocus = () => {
    window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  const insertCharAtCursor = (char: string) => {
    const input = inputRef.current
    if (!input) return
    const start = input.selectionStart ?? amount.length
    const end = input.selectionEnd ?? amount.length
    const newValue = amount.slice(0, start) + char + amount.slice(end)
    setAmount(newValue)
    setTimeout(() => {
      input.setSelectionRange(start + char.length, start + char.length)
      input.focus()
    }, 0)
  }

  useEffect(() => {
    if (!amount) { setCalcPreview(null); return }
    const result = evaluateExpression(amount)
    setCalcPreview(result !== null ? formatUAH(result, undefined, currency) : null)
  }, [amount, currency])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const focusNow = () => {
      input.focus({ preventScroll: true })
      const end = input.value.length
      input.setSelectionRange(end, end)
    }
    const rafId = window.requestAnimationFrame(focusNow)
    const retryId = window.setTimeout(focusNow, 120)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(retryId)
    }
  }, [])

  const resolveAndSubmit = () => {
    if (amount) {
      const result = evaluateExpression(amount)
      if (result !== null) setAmount(String(result))
    }
    setTimeout(onAdd, 0)
  }

  const handleAmountBlur = () => {
    if (!amount) return
    const result = evaluateExpression(amount)
    if (result !== null) setAmount(String(result))
  }

  const handleSmartPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = parseClipboard(text)
      if (parsed) {
        setAmount(String(parsed.amount))
        setCategory(parsed.category)
        setTransactionType("expense")
      } else {
        const numMatch = text.match(/(\d[\d,.]*)/)
        if (numMatch) {
          const raw = numMatch[1].replace(/,/g, ".")
          const num = Number.parseFloat(raw)
          if (Number.isFinite(num) && num > 0) setAmount(String(num))
        }
      }
    } catch { /* clipboard unavailable */ }
  }

  const templatesToShow = quickTemplates.length > 0
    ? quickTemplates.map((t) => ({ ...t, icon: TEMPLATE_ICON_MAP[t.label] ?? Coffee }))
    : FALLBACK_TEMPLATES.map((t, idx) => ({ id: String(idx), label: t.label, amount: t.amount, category: t.category, icon: t.icon }))

  const isTransfer = transactionType === "transfer"

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {isEditing ? "Edit Transaction" : "New Transaction"}
      </p>

      {/* Type toggle: Expense | Income | Transfer */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setTransactionType("expense")
            setCategory(CATEGORIES.expense[0].name)
            keepAmountFocus()
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
            transactionType === "expense"
              ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
              : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
          Expense
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setTransactionType("income")
            setCategory(CATEGORIES.income[0].name)
            keepAmountFocus()
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
            transactionType === "income"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
          Income
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setTransactionType("transfer")
            keepAmountFocus()
          }}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
            transactionType === "transfer"
              ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
              : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          Transfer
        </button>
      </div>

      {/* Transfer mode: From → To selectors */}
      {isTransfer ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">From</p>
              <div className="grid grid-cols-3 gap-1.5">
                {DESTINATION_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setTransferFrom(item.value)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border py-2 text-[9px] font-semibold transition-colors ${
                      transferFrom === item.value
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">To</p>
              <div className="grid grid-cols-3 gap-1.5">
                {DESTINATION_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setTransferTo(item.value)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border py-2 text-[9px] font-semibold transition-colors ${
                      transferTo === item.value
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Expense/Income mode: destination picker + Monthly */
        <div className="flex justify-center gap-2">
          {DESTINATION_OPTIONS.filter((item) => transactionType === "income" || item.value !== "savings").map((item) => (
            <button
              key={item.value}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setDestination(item.value)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition-colors ${
                destination === item.value
                  ? item.value === "card" ? "border-blue-500/40 bg-blue-500/10 text-blue-400" :
                    item.value === "cash" ? "border-amber-500/40 bg-amber-500/10 text-amber-400" :
                    "border-purple-500/40 bg-purple-500/10 text-purple-400"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </button>
          ))}
          {!isEditing && (
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsRecurring(!isRecurring)
                keepAmountFocus()
              }}
              aria-pressed={isRecurring}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition-colors ${
                isRecurring
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              Monthly
            </button>
          )}
        </div>
      )}



      {/* Amount + Category/Submit + Name */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
        <label className="relative min-w-0">
          <span className="sr-only">Amount</span>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
            {transactionType === "income"
              ? <ArrowUpCircle className="h-4 w-4 text-emerald-500/80" aria-hidden="true" />
              : transactionType === "expense"
              ? <ArrowDownCircle className="h-4 w-4 text-rose-500/80" aria-hidden="true" />
              : <ArrowLeftRight className="h-4 w-4 text-blue-500/80" aria-hidden="true" />
            }
          </span>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            inputMode="decimal"
            placeholder="Amount..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={handleAmountBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") resolveAndSubmit()
              if (e.key === "Escape" && isEditing && onCancelEdit) onCancelEdit()
            }}
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-9 pr-3 text-[15px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
          />
          {calcPreview && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-blue-400/80">
              = {calcPreview}
            </span>
          )}
        </label>

        {!isTransfer && (
          <CategorySelect categories={categories} value={category} onChange={setCategory} onKeepInputFocus={keepAmountFocus} />
        )}

        {!isEditing && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={resolveAndSubmit}
            aria-label={isTransfer ? "Execute transfer" : "Add transaction"}
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
              isTransfer
                ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-600/40"
                : "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-600/40"
            }`}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Name field (optional, below amount row) */}
      {!isTransfer && (
        <label className="relative w-full">
          <span className="sr-only">Name</span>
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
          />
        </label>
      )}

      {/* Math keyboard accessory bar for iOS */}
      <div className="mt-3 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {["+", "-", "*", "/", "(", ")"].map((sym) => (
          <button
            key={sym}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertCharAtCursor(sym)}
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 active:scale-95"
            aria-label={`Insert ${sym}`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Quick Templates + Smart Paste */}
      {!isEditing && (
        <div className="relative overflow-hidden">
          <div className="fade-edge-r -mx-0.5 flex w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 pl-0.5 pr-6 scrollbar-none [touch-action:pan-x] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              handleSmartPaste()
              keepAmountFocus()
            }}
              aria-label="Paste amount from clipboard"
              title="Paste from clipboard"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
            >
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              Paste
            </button>
            {templatesToShow.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onApplyTemplate(t)
                    keepAmountFocus()
                  }}
                  aria-label={`Quick add ${t.label}: ${t.amount} ${currency === "UAH" ? "₴" : currency === "USD" ? "$" : "€"}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.label}
                  <span className="text-slate-500">{t.amount}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Cancel editing"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={resolveAndSubmit}
            aria-label="Update transaction"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/40 transition-transform hover:scale-105 active:scale-95"
          >
            <Check className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
