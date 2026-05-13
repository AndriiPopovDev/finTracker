"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Calendar, Flame, TrendingDown, DollarSign } from "lucide-react"
import type { Transaction, CurrencyCode } from "@/lib/finance"
import { formatUAH, getMonthKey } from "@/lib/finance"
import { analyzeDailySpending, type DailySpendingAnalysis } from "@/lib/smart-insights"
import { ANIMATION } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"

// Normalize date formats (DD/MM/YYYY or YYYY-MM-DD) to YYYY-MM-DD
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  // Already in YYYY-MM-DD format
  if (dateStr.includes('-') && dateStr.length === 10) {
    return dateStr
  }
  
  // DD/MM/YYYY format - convert to YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  return null
}

type Props = {
  transactions: Transaction[]
  currentMonth: Date
  currency: CurrencyCode
  className?: string
}

export function CalendarHeatmap({ transactions, currentMonth, currency, className = '' }: Props) {
  const analysis = useMemo(() => analyzeDailySpending(transactions, currentMonth), [transactions, currentMonth])
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  
  // Build daily totals map
  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        // Normalize date format to YYYY-MM-DD
        const normalizedDate = normalizeDate(t.date)
        if (normalizedDate) {
          map.set(normalizedDate, (map.get(normalizedDate) || 0) + t.amount)
        }
      })
    return map
  }, [transactions])

  // Calculate intensity levels (0-4)
  const getIntensity = (amount: number): number => {
    if (amount === 0) return 0
    const maxDay = analysis.maxDayAmount
    if (maxDay === 0) return 1
    const ratio = amount / maxDay
    if (ratio < 0.25) return 1
    if (ratio < 0.5) return 2
    if (ratio < 0.75) return 3
    return 4
  }

  const intensityColors = [
    'bg-slate-900/30', // 0 - no spending
    'bg-emerald-500/20', // 1 - low
    'bg-emerald-500/40', // 2 - medium
    'bg-amber-500/50', // 3 - high
    'bg-rose-500/60', // 4 - very high
  ]

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: { date: number; amount: number; intensity: number; isFuture: boolean }[] = []
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ date: 0, amount: 0, intensity: 0, isFuture: true })
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      // Format as YYYY-MM-DD to match transaction date format
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const amount = dailyTotals.get(dateKey) || 0
      const isFuture = isCurrentMonth && day > now.getDate()
      
      days.push({
        date: day,
        amount,
        intensity: isFuture ? 0 : getIntensity(amount),
        isFuture
      })
    }

    return days
  }, [daysInMonth, firstDayOfMonth, dailyTotals, currentMonth, analysis.maxDayAmount])

  if (transactions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Calendar className="h-3.5 w-3.5 text-blue-400/80" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Spending Heatmap
        </span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[9px] font-medium text-slate-600 py-1">
            {day}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium
              ${day.isFuture ? 'text-slate-700' : 'text-slate-300'}
              ${intensityColors[day.intensity]}
            `}
            onClick={() => !day.isFuture && day.amount > 0 && triggerHaptic('light')}
            title={day.amount > 0 ? `${formatUAH(day.amount, undefined, currency)}` : undefined}
          >
            {day.date > 0 ? day.date : ''}
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/30">
        {analysis.currentStreak > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-slate-400">{analysis.currentStreak} day streak</span>
          </div>
        )}
        
        {analysis.noSpendDays > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-slate-400">{analysis.noSpendDays} no-spend days</span>
          </div>
        )}

        {analysis.maxDayAmount > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-slate-400">
              Peak: {formatUAH(analysis.maxDayAmount, undefined, currency)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">
            Avg: {formatUAH(analysis.avgDaily, undefined, currency)}/day
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/30 text-[9px] text-slate-600">
        <span>Less</span>
        <div className="flex gap-1">
          {intensityColors.map((color, idx) => (
            <div key={idx} className={`w-3 h-3 rounded ${color}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </motion.div>
  )
}
