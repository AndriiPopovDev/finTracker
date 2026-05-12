"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CircleArrowDown as ArrowDownCircle, CircleArrowUp as ArrowUpCircle, ArrowLeftRight, Repeat, TrendingDown, ChevronDown, Pencil, Trash2 } from "lucide-react"
import type { Transaction, CurrencyCode } from "@/lib/finance"
import { formatUAH, getCategoryEmoji } from "@/lib/finance"
import { ANIMATION } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"

type Props = {
  transactions: Transaction[]
  currency: CurrencyCode
  onDelete?: (id: number) => void
  onEdit?: (tx: Transaction) => void
  className?: string
}

type TimeGroup = {
  label: string
  transactions: Transaction[]
  totalExpense: number
}

function getTimeGroup(dateStr: string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Parse date (handles both YYYY-MM-DD and DD/MM/YYYY)
  let txDate: Date
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number)
    txDate = new Date(year, month - 1, day)
  } else {
    const [day, month, year] = dateStr.split('/').map(Number)
    txDate = new Date(year, month - 1, day)
  }
  
  const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate())
  const diffMs = today.getTime() - txDay.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return "This Week"
  if (diffDays < 14) return "Last Week"
  return "Earlier"
}

function getContextLabel(transaction: Transaction): string | null {
  const name = transaction.name?.toLowerCase() || ''
  
  if (name.includes('coffee') || name.includes('кава')) return '☕ Coffee run'
  if (name.includes('lunch') || name.includes('обід')) return '🍽️ Lunch'
  if (name.includes('dinner') || name.includes('вечеря')) return '🌙 Dinner'
  if (name.includes('taxi') || name.includes('таксі') || name.includes('uber') || name.includes('bolt')) return '🚗 Transport'
  if (name.includes('grocery') || name.includes('silpo') || name.includes('novus')) return '🛒 Groceries'
  
  return null
}

export function SmartTimeline({ transactions, currency, onDelete, onEdit, className = '' }: Props) {
  const [visibleCount, setVisibleCount] = useState(4)

  const { groups, totalCount } = useMemo(() => {
    const groupMap = new Map<string, Transaction[]>()
    
    // Sort by date descending
    const sorted = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateB.getTime() - dateA.getTime()
    })
    
    sorted.forEach(tx => {
      const group = getTimeGroup(tx.date)
      if (!groupMap.has(group)) {
        groupMap.set(group, [])
      }
      groupMap.get(group)!.push(tx)
    })
    
    const groups = Array.from(groupMap.entries()).map(([label, txs]) => ({
      label,
      transactions: txs,
      totalExpense: txs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    }))
    
    return { groups, totalCount: sorted.length }
  }, [transactions])

  // Calculate visible transactions
  let count = 0
  const visibleGroups: TimeGroup[] = []
  for (const group of groups) {
    if (count >= visibleCount) break
    const remaining = visibleCount - count
    if (group.transactions.length <= remaining) {
      visibleGroups.push(group)
      count += group.transactions.length
    } else {
      visibleGroups.push({
        ...group,
        transactions: group.transactions.slice(0, remaining)
      })
      count += remaining
    }
  }

  const hasMore = totalCount > visibleCount

  if (transactions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.base}
      className={`space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Recent Activity
        </h3>
        {totalCount > 4 && (
          <span className="text-[10px] text-slate-600">{totalCount} transactions</span>
        )}
      </div>

      {/* Timeline Groups */}
      <div className="space-y-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400">{group.label}</h3>
              {group.totalExpense > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <TrendingDown className="h-3 w-3" />
                  <span>{formatUAH(group.totalExpense, undefined, currency)}</span>
                </div>
              )}
            </div>
            
            <ul className="space-y-1.5">
              {group.transactions.map((t) => {
                const isTransfer = t.type === "transfer"
                const isIncome = t.type === "income"
                const contextLabel = getContextLabel(t)
                
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group flex items-center gap-2.5 rounded-xl bg-slate-950/40 px-3 py-2.5 transition-colors hover:bg-slate-900/60"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        isTransfer
                          ? "border-blue-500/15 bg-blue-500/3 text-blue-400/80"
                          : isIncome
                          ? "border-emerald-500/15 bg-emerald-500/3 text-emerald-400/80"
                          : "border-rose-500/15 bg-rose-500/3 text-rose-400/80"
                      }`}
                    >
                      {t.recurringId ? (
                        <Repeat className="h-4 w-4 text-purple-400/90" />
                      ) : isTransfer ? (
                        <ArrowLeftRight className="h-4 w-4" />
                      ) : isIncome ? (
                        <ArrowUpCircle className="h-4 w-4" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${
                          isTransfer ? "text-blue-400" :
                          isIncome ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {formatUAH(Math.abs(t.amount), isIncome ? "plus" : "minus", currency)}
                        </p>
                        {contextLabel && (
                          <span className="text-[10px] text-slate-500">{contextLabel}</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        <span aria-hidden="true">{getCategoryEmoji(t.type, t.category)} </span>
                        {t.name || t.category}
                        {t.destination && (
                          <>
                            <span className="text-slate-600"> · </span>
                            <span className={`capitalize ${
                              t.destination === "card" ? "text-blue-400/90" :
                              t.destination === "cash" ? "text-amber-400/90" :
                              "text-purple-400/90"
                            }`}>{t.destination}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Edit/Delete Buttons */}
                    {(onDelete || onEdit) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(t)
                              triggerHaptic('light')
                            }}
                            className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-800/40 hover:text-blue-400"
                            aria-label={`Edit ${t.name || t.category}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(t.id)
                              triggerHaptic('medium')
                            }}
                            className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-800/40 hover:text-rose-400"
                            aria-label={`Delete ${t.name || t.category}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setVisibleCount(prev => prev >= totalCount ? 4 : prev + 5)
            triggerHaptic('light')
          }}
          className="mx-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800/40 bg-slate-950/40 py-2.5 text-xs font-medium text-slate-500 transition-all hover:border-slate-700/50 hover:bg-slate-900/40 hover:text-slate-400"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${visibleCount >= totalCount ? "rotate-180" : ""}`} />
          {visibleCount >= totalCount ? "Show less" : `Show ${Math.min(5, totalCount - visibleCount)} more`}
        </motion.button>
      )}
    </motion.div>
  )
}
