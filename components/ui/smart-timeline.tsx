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
  dateGroups: {
    date: string
    dateLabel: string
    transactions: Transaction[]
    totalExpense: number
  }[]
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

function formatDateLabel(dateStr: string): string {
  // Format YYYY-MM-DD to DD/MM/YYYY
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }
  return dateStr
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
  const [visibleCount, setVisibleCount] = useState(3)
  const [showAll, setShowAll] = useState(false)

  const { groups, totalCount } = useMemo(() => {
    const groupMap = new Map<string, Transaction[]>()
    
    // Sort by date descending (parse YYYY-MM-DD manually to avoid timezone issues)
    const sorted = [...transactions].sort((a, b) => {
      const [ay, am, ad] = a.date.split('-').map(Number)
      const [by, bm, bd] = b.date.split('-').map(Number)
      const dateA = new Date(ay, am - 1, ad).getTime()
      const dateB = new Date(by, bm - 1, bd).getTime()
      
      // If same date, sort by ID descending (newer first)
      if (dateA === dateB) return b.id - a.id
      return dateB - dateA
    })
    
    sorted.forEach(tx => {
      const group = getTimeGroup(tx.date)
      if (!groupMap.has(group)) {
        groupMap.set(group, [])
      }
      groupMap.get(group)!.push(tx)
    })
    
    // Group transactions by date within each time group
    const groups = Array.from(groupMap.entries()).map(([label, txs]) => {
      const dateMap = new Map<string, Transaction[]>()
      txs.forEach(tx => {
        if (!dateMap.has(tx.date)) {
          dateMap.set(tx.date, [])
        }
        dateMap.get(tx.date)!.push(tx)
      })
      
      const dateGroups = Array.from(dateMap.entries()).map(([date, transactions]) => ({
        date,
        dateLabel: formatDateLabel(date),
        transactions,
        totalExpense: transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
      }))
      
      return {
        label,
        dateGroups,
        totalExpense: txs
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
      }
    })
    
    // Sort groups in chronological order: Today → Yesterday → This Week → Last Week → Earlier
    const groupOrder: Record<string, number> = { "Today": 0, "Yesterday": 1, "This Week": 2, "Last Week": 3, "Earlier": 4 }
    groups.sort((a, b) => (groupOrder[a.label] ?? 99) - (groupOrder[b.label] ?? 99))
    
    return { groups, totalCount: sorted.length }
  }, [transactions])

  // Calculate visible transactions
  const displayCount = showAll ? totalCount : visibleCount
  let count = 0
  const visibleGroups: TimeGroup[] = []
  for (const group of groups) {
    if (count >= displayCount) break
    
    // Flatten all transactions from dateGroups
    const allTx = group.dateGroups.flatMap(dg => dg.transactions)
    const remaining = displayCount - count
    
    if (allTx.length <= remaining) {
      visibleGroups.push(group)
      count += allTx.length
    } else {
      // Partial group - need to slice transactions
      const slicedGroups = []
      let slicedCount = 0
      for (const dg of group.dateGroups) {
        if (slicedCount >= remaining) break
        const available = remaining - slicedCount
        if (dg.transactions.length <= available) {
          slicedGroups.push(dg)
          slicedCount += dg.transactions.length
        } else {
          slicedGroups.push({
            ...dg,
            transactions: dg.transactions.slice(0, available)
          })
          slicedCount += available
        }
      }
      visibleGroups.push({ ...group, dateGroups: slicedGroups })
      count += remaining
    }
  }

  const hasMore = totalCount > displayCount
  const canToggle = totalCount > visibleCount

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
            {/* Time group header - centered */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <h3 className="text-xs font-semibold text-slate-400">{group.label}</h3>
              {group.totalExpense > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <TrendingDown className="h-3 w-3" />
                  <span>{formatUAH(group.totalExpense, undefined, currency)}</span>
                </div>
              )}
            </div>
            
            {/* Date sub-groups */}
            <div className="space-y-2">
              {group.dateGroups.map((dateGroup) => (
                <div key={dateGroup.date}>
                  {/* Date label - hide for Today/Yesterday, center for others */}
                  {group.label !== "Today" && group.label !== "Yesterday" && (
                    <div className="mb-1.5 text-center">
                      <span className="text-[10px] font-medium text-slate-600">
                        {dateGroup.dateLabel}
                      </span>
                    </div>
                  )}
                  
                  {/* Transactions for this date */}
                  <ul className="space-y-1.5">
                    {dateGroup.transactions.map((t) => {
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
                      <div className="flex gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(t)
                              triggerHaptic('light')
                            }}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/40 hover:text-blue-400"
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
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/40 hover:text-rose-400"
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
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {canToggle && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setShowAll(!showAll)
            triggerHaptic('light')
          }}
          className="mx-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800/40 bg-slate-950/40 py-2.5 text-xs font-medium text-slate-500 transition-all hover:border-slate-700/50 hover:bg-slate-900/40 hover:text-slate-400"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Show less" : `Show all (${totalCount - displayCount} more)`}
        </motion.button>
      )}
    </motion.div>
  )
}
