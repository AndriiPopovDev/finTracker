"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, Filter } from "lucide-react"
import type { Transaction, CurrencyCode } from "@/lib/finance"
import { formatUAH, formatShortDate } from "@/lib/finance"
import { executeSmartSearch } from "@/lib/smart-insights"
import { ANIMATION } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"

type Props = {
  allTransactions: Transaction[]
  currency: CurrencyCode
  onTransactionSelect?: (transaction: Transaction) => void
  className?: string
}

export function SmartSearch({ allTransactions, currency, onTransactionSelect, className = '' }: Props) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const results = useMemo(() => {
    if (query.trim().length < 2) return []
    return executeSmartSearch(allTransactions, query)
  }, [query, allTransactions])

  useEffect(() => {
    setShowResults(isFocused && query.trim().length >= 2)
  }, [isFocused, query])

  const handleClear = () => {
    setQuery('')
    setShowResults(false)
    triggerHaptic('light')
  }

  if (allTransactions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.base}
      className={`rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm" aria-hidden="true">🔍</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Smart Search
        </span>
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="coffee last month, subscriptions, cash..."
          className="w-full rounded-lg border border-slate-800/40 bg-slate-900/50 pl-10 pr-10 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none transition-colors"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Quick suggestions */}
      {!showResults && query.length < 2 && (
        <div className="flex flex-wrap gap-1.5">
          {['coffee last month', 'subscriptions', 'largest expenses', 'cash only'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion)
                triggerHaptic('light')
              }}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-900/40 text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={ANIMATION.spring.fast}
            className="mt-2"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-slate-500">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <Filter size={12} className="text-slate-600" />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {results.slice(0, 10).map((transaction, index) => (
                <motion.button
                  key={transaction.id}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * index, ...ANIMATION.spring.fast }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onTransactionSelect?.(transaction)
                    triggerHaptic('light')
                  }}
                  className="w-full text-left rounded-lg bg-slate-900/30 p-2 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">
                        {transaction.name || transaction.category}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatShortDate(new Date(transaction.date))} · {transaction.category}
                      </p>
                    </div>
                    <p className={`text-xs font-semibold ml-2 ${
                      transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatUAH(transaction.amount, undefined, currency)}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {results.length === 0 && (
              <p className="text-center text-xs text-slate-600 py-3">
                No transactions found
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
