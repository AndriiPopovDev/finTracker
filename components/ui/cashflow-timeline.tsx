"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { Transaction, CurrencyCode } from "@/lib/finance"
import { formatUAH, getMonthKey } from "@/lib/finance"
import { ANIMATION, COLORS } from "@/lib/theme"

type Props = {
  transactions: Record<string, Transaction[]>
  currentMonth: Date
  currency: CurrencyCode
  monthsToShow?: number
  className?: string
}

type CashflowData = {
  month: string
  income: number
  expense: number
  savings: number
  netFlow: number
}

export function CashflowTimeline({ transactions, currentMonth, currency, monthsToShow = 6, className = '' }: Props) {
  const cashflowData = useMemo<CashflowData[]>(() => {
    const data: CashflowData[] = []
    const now = new Date()

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1)
      const monthKey = getMonthKey(monthDate)
      const monthTransactions = transactions[monthKey] || []
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const isCurrentMonth = now.getFullYear() === monthDate.getFullYear() && now.getMonth() === monthDate.getMonth()
      const savings = isCurrentMonth ? 0 : income - expense

      data.push({
        month: monthLabel,
        income,
        expense,
        savings,
        netFlow: income - expense
      })
    }

    return data
  }, [transactions, currentMonth, monthsToShow])

  const hasData = cashflowData.some(d => d.income > 0 || d.expense > 0)
  if (!hasData) return null

  // Calculate trends
  const recentData = cashflowData.slice(-3)
  const avgIncome = recentData.reduce((sum, d) => sum + d.income, 0) / recentData.length
  const avgExpense = recentData.reduce((sum, d) => sum + d.expense, 0) / recentData.length
  const trendDirection = avgIncome > avgExpense ? 'positive' : 'negative'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-blue-400/80" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cashflow Timeline
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {trendDirection === 'positive' ? (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500">Positive</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-rose-500">Negative</span>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cashflowData}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.emerald[500]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.emerald[500]} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.rose[500]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.rose[500]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => [
                formatUAH(value, undefined, currency),
                name === 'income' ? 'Income' : name === 'expense' ? 'Expense' : 'Savings'
              ]}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={COLORS.emerald[500]}
              strokeWidth={2}
              fill="url(#incomeGradient)"
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke={COLORS.rose[500]}
              strokeWidth={2}
              fill="url(#expenseGradient)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/30">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Avg Income</p>
          <p className="text-sm font-semibold text-emerald-500">
            {formatUAH(avgIncome, undefined, currency)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Avg Expense</p>
          <p className="text-sm font-semibold text-rose-500">
            {formatUAH(avgExpense, undefined, currency)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Net Flow</p>
          <p className={`text-sm font-semibold ${avgIncome - avgExpense >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatUAH(avgIncome - avgExpense, undefined, currency)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
