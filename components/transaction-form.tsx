"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
import { CATEGORIES, formatUAH, type CurrencyCode, type TransactionDestination, type TransactionType, getCategoryEmoji } from "@/lib/finance"
import { suggestCategory, learnCategoryCorrection } from "@/lib/smart-insights"

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

function parseNaturalInput(text: string): { amount?: number; category?: string; name?: string } {
  const result: { amount?: number; category?: string; name?: string } = {}
  
  // Extract amount
  const amountMatch = text.match(/(\d+[.,]?\d*)/)
  if (amountMatch) {
    result.amount = Number.parseFloat(amountMatch[1].replace(/,/g, "."))
  }
  
  // Use smart category suggestion (includes merchant recognition + user learning)
  const suggestion = suggestCategory(text)
  if (suggestion) {
    result.category = suggestion.category
    // Extract name (first word or phrase before amount)
    const nameMatch = text.toLowerCase().match(/^([a-zа-яєії]+)\s/i)
    if (nameMatch && nameMatch[1]) {
      result.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)
    }
  } else {
    // Fallback to basic keyword matching
    const lower = text.toLowerCase()
    for (const [keyword, cat] of Object.entries(MERCHANT_KEYWORDS)) {
      if (lower.includes(keyword)) {
        result.category = cat
        const nameMatch = lower.match(/^([a-zа-яєії]+)\s/i)
        if (nameMatch && nameMatch[1]) {
          result.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)
        }
        break
      }
    }
  }
  
  return result
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

// Haptic feedback helper
function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[type])
  }
}

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
  const [aiDetectedCategory, setAiDetectedCategory] = useState<string | null>(null)
  const categories = transactionType === "income" ? CATEGORIES.income : CATEGORIES.expense
  const [calcPreview, setCalcPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputMode, setInputMode] = useState<'numeric' | 'text'>('numeric')
  const [parsedPreview, setParsedPreview] = useState<{ amount?: number; category?: string; emoji?: string } | null>(null)
  const [inputKey, setInputKey] = useState(0) // Force remount on mode switch

  const keepAmountFocus = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 0)
  }, [])

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
    if (!amount) { 
      setCalcPreview(null)
      setParsedPreview(null)
      return 
    }
    
    // Check if input contains letters (AI mode)
    const hasLetters = /[a-zA-Zа-яА-ЯєіїЄІЇ]/.test(amount)
    
    if (hasLetters) {
      // AI parsing mode
      const parsed = parseNaturalInput(amount)
      setParsedPreview(parsed.amount ? {
        amount: parsed.amount,
        category: parsed.category,
        emoji: parsed.category ? getCategoryEmoji(
          CATEGORIES.income.some(c => c.name === parsed.category) ? 'income' : 'expense',
          parsed.category
        ) : undefined
      } : null)
      setCalcPreview(null)
    } else {
      // Numeric/calc mode
      const result = evaluateExpression(amount)
      setCalcPreview(result !== null ? formatUAH(result, undefined, currency) : null)
      setParsedPreview(null)
    }
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
      // Check if AI mode
      const hasLetters = /[a-zA-Zа-яА-ЯєіїЄІЇ]/.test(amount)
      if (hasLetters) {
        const parsed = parseNaturalInput(amount)
        if (parsed.amount) {
          setAmount(String(parsed.amount))
          if (parsed.category) setCategory(parsed.category)
          if (parsed.name && !name) setName(parsed.name)
        }
      } else {
        const result = evaluateExpression(amount)
        if (result !== null) setAmount(String(result))
      }
    }
    triggerHaptic('medium')
    setTimeout(onAdd, 0)
  }

  const handleAmountBlur = () => {
    if (!amount) return
    const hasLetters = /[a-zA-Zа-яА-ЯєіїЄІЇ]/.test(amount)
    if (hasLetters) {
      const parsed = parseNaturalInput(amount)
      if (parsed.amount) {
        setAmount(String(parsed.amount))
        if (parsed.category) setCategory(parsed.category)
        if (parsed.name && !name) setName(parsed.name)
      }
    } else {
      const result = evaluateExpression(amount)
      if (result !== null) setAmount(String(result))
    }
  }

  // Smart input handler - auto-detects mode
  const handleAmountChange = (value: string) => {
    setAmount(value)
    
    // Auto-switch to text mode if letters detected
    const hasLetters = /[a-zA-Zа-яА-ЯєіїЄІЇ]/.test(value)
    if (hasLetters && inputMode === 'numeric') {
      // Force keyboard switch on iOS by remounting input
      setInputMode('text')
      setInputKey(prev => prev + 1)
      triggerHaptic('light')
      
      // Refocus after remount
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
      }, 50)
    }
    
    // Parse in real-time for AI mode
    if (hasLetters) {
      const parsed = parseNaturalInput(value)
      if (parsed.category) {
        setCategory(parsed.category)
        setAiDetectedCategory(parsed.category) // Track AI detection
      }
      if (parsed.name && !name) {
        setName(parsed.name)
      }
    }
  }
  
  // Explicit mode switch handler
  const switchToAIMode = () => {
    setInputMode('text')
    setInputKey(prev => prev + 1)
    triggerHaptic('light')
    setAmount('')
    setParsedPreview(null)
    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 100)
  }
  
  const switchToNumericMode = () => {
    setInputMode('numeric')
    setInputKey(prev => prev + 1)
    triggerHaptic('light')
    setAmount('')
    setParsedPreview(null)
    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 100)
  }

  const handleSmartPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = parseClipboard(text)
      if (parsed) {
        setAmount(String(parsed.amount))
        setCategory(parsed.category)
        setTransactionType("expense")
        triggerHaptic('light')
      } else {
        // Try natural language parsing
        const naturalParsed = parseNaturalInput(text)
        if (naturalParsed.amount) {
          setAmount(String(naturalParsed.amount))
          if (naturalParsed.category) setCategory(naturalParsed.category)
          if (naturalParsed.name) setName(naturalParsed.name)
          triggerHaptic('light')
        }
      }
    } catch { /* clipboard unavailable */ }
  }

  const templatesToShow = quickTemplates.length > 0
    ? quickTemplates.map((t) => ({ ...t, icon: TEMPLATE_ICON_MAP[t.label] ?? Coffee }))
    : FALLBACK_TEMPLATES.map((t, idx) => ({ id: String(idx), label: t.label, amount: t.amount, category: t.category, icon: t.icon }))

  const isTransfer = transactionType === "transfer"
  const typeButtonClass = (type: TransactionType) => {
    const base = "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95"
    const active = type === "expense" ? "bg-rose-500/15 text-rose-400" :
                   type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
    const inactive = "text-slate-500 hover:text-slate-300"
    return `${base} ${transactionType === type ? active : inactive}`
  }

  return (
    <div className="space-y-3">
      {/* Type toggle: Expense | Income | Transfer */}
      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800/40 bg-slate-900/30 p-0.5">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setTransactionType("expense")
            setCategory(CATEGORIES.expense[0].name)
            setDestination("card")
            triggerHaptic('light')
            keepAmountFocus()
          }}
          className={typeButtonClass("expense")}
        >
          <ArrowDownCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Expense
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setTransactionType("income")
            setCategory(CATEGORIES.income[0].name)
            setDestination("card")
            triggerHaptic('light')
            keepAmountFocus()
          }}
          className={typeButtonClass("income")}
        >
          <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Income
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setTransactionType("transfer")
            triggerHaptic('light')
            keepAmountFocus()
          }}
          className={typeButtonClass("transfer")}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Transfer
        </button>
      </div>

      {/* Amount Input - Primary Focus with Dual Mode */}
      <div className="relative">
        <div className="flex items-center justify-center gap-2 mb-2">
          {/* Mode toggle buttons */}
          <button
            type="button"
            onClick={switchToNumericMode}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              inputMode === 'numeric'
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <span className="text-sm">123</span>
            <span>Amount</span>
          </button>
          <button
            type="button"
            onClick={switchToAIMode}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              inputMode === 'text'
                ? "bg-blue-500/20 text-blue-400"
                : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <span>✨</span>
            <span>AI</span>
          </button>
        </div>
        
        <label className="relative block">
          <span className="sr-only">Amount</span>
          <input
            key={inputKey}
            ref={inputRef}
            autoFocus
            type="text"
            inputMode={inputMode === 'numeric' ? 'decimal' : 'text'}
            placeholder={inputMode === 'numeric' ? "0" : "e.g. coffee 155"}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            onBlur={handleAmountBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") resolveAndSubmit()
              if (e.key === "Escape" && isEditing && onCancelEdit) onCancelEdit()
            }}
            className="w-full bg-transparent text-center text-5xl font-bold text-white placeholder:text-slate-700 outline-none py-4"
          />
          
          {/* Calculation preview (numeric mode) */}
          {calcPreview && inputMode === 'numeric' && (
            <span className="pointer-events-none absolute bottom-0 left-0 right-0 text-center text-xs font-medium text-slate-500">
              = {calcPreview}
            </span>
          )}
          
          {/* Parsed preview chip (AI mode) */}
          {parsedPreview && parsedPreview.amount && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm">
                {parsedPreview.emoji && <span>{parsedPreview.emoji}</span>}
                {parsedPreview.category && <span>{parsedPreview.category}</span>}
                <span className="text-slate-500">•</span>
                <span className="font-semibold text-white">{formatUAH(parsedPreview.amount, undefined, currency)}</span>
              </span>
            </motion.div>
          )}
        </label>
      </div>

      {/* Category Chips - Horizontal Scrollable */}
      {!isTransfer && (
        <div className="relative -mx-3 px-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const isActive = category === cat.name
              const isAIDetected = parsedPreview?.category === cat.name
              return (
                <button
                  key={cat.name}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    // Learn from user correction if AI detected a different category
                    if (aiDetectedCategory && aiDetectedCategory !== cat.name && name) {
                      learnCategoryCorrection(name, cat.name)
                      setAiDetectedCategory(null) // Reset after learning
                    }
                    setCategory(cat.name)
                    triggerHaptic('light')
                    keepAmountFocus()
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                    isActive
                      ? "text-white shadow-lg"
                      : isAIDetected
                      ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30"
                      : "bg-slate-900/50 text-slate-400 hover:text-slate-300"
                  }`}
                  style={isActive ? {
                    backgroundColor: `${cat.color}25`,
                    boxShadow: `0 4px 12px ${cat.color}20`
                  } : undefined}
                >
                  <span className="text-base">{getCategoryEmoji(transactionType, cat.name)}</span>
                  <span>{cat.name}</span>
                  {isAIDetected && (
                    <span className="text-[8px] font-semibold uppercase tracking-wide text-blue-400">AI</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Transfer mode: From → To selectors */}
      {isTransfer && (
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
                    onClick={() => {
                      setTransferFrom(item.value)
                      triggerHaptic('light')
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[9px] font-semibold transition-all active:scale-95 ${
                      transferFrom === item.value
                        ? "bg-rose-500/10 text-rose-400"
                        : "text-slate-500 hover:text-slate-300"
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
                    onClick={() => {
                      setTransferTo(item.value)
                      triggerHaptic('light')
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[9px] font-semibold transition-all active:scale-95 ${
                      transferTo === item.value
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-500 hover:text-slate-300"
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
      )}

      {/* Destination + Monthly toggle */}
      {!isTransfer && (
        <div className="flex justify-center gap-2">
          {DESTINATION_OPTIONS.filter((item) => transactionType === "income" || item.value !== "savings").map((item) => (
            <button
              key={item.value}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setDestination(item.value)
                triggerHaptic('light')
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-95 ${
                destination === item.value
                  ? item.value === "card" ? "bg-blue-500/10 text-blue-400" :
                    item.value === "cash" ? "bg-amber-500/10 text-amber-400" :
                    "bg-purple-500/10 text-purple-400"
                  : "text-slate-500 hover:text-slate-300"
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
                triggerHaptic('light')
                keepAmountFocus()
              }}
              aria-pressed={isRecurring}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-95 ${
                isRecurring
                  ? "bg-purple-500/10 text-purple-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              Monthly
            </button>
          )}
        </div>
      )}

      {/* Destination + Monthly toggle */}
      {!isEditing && (
        <div className="relative -mx-3 px-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                handleSmartPaste()
                keepAmountFocus()
              }}
              aria-label="Paste amount from clipboard"
              title="Paste from clipboard"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-800/40 bg-slate-950/30 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-700/50 hover:text-slate-400"
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
                    triggerHaptic('light')
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

      {/* Submit Button */}
      <div className="flex justify-end gap-2 pt-2">
        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Cancel editing"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={resolveAndSubmit}
          aria-label={isTransfer ? "Execute transfer" : "Add transaction"}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
            isTransfer
              ? "bg-blue-600"
              : "bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg shadow-rose-600/30"
          }`}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          <span>{isEditing ? "Update" : isTransfer ? "Transfer" : "Add"}</span>
        </button>
      </div>
    </div>
  )
}
