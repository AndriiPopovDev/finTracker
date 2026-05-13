"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, TrendingUp, TrendingDown, DollarSign, CalendarDays, Award, Star, PiggyBank } from "lucide-react"
import type { Transaction, CurrencyCode } from "@/lib/finance"
import { formatUAH, getMonthKey, CATEGORIES, getCategoryEmoji, getCategoryColor } from "@/lib/finance"
import { analyzeDailySpending, analyzeSpendingTrends } from "@/lib/smart-insights"
import { ANIMATION, COLORS } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"
import { InsightCard, InsightGrid } from "@/components/ui"

type Props = {
  transactions: Transaction[]
  currentMonth: Date
  currency: CurrencyCode
  allTransactions: Record<string, Transaction[]>
  onClose: () => void
}

export function MonthlyReview({ transactions, currentMonth, currency, allTransactions, onClose }: Props) {
  const review = useMemo(() => {
    const monthKey = getMonthKey(currentMonth)
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const savings = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0

    // Top category
    const categoryTotals = new Map<string, number>()
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount)
      })

    const sortedCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])

    const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null
    const topCategoryPercentage = topCategory ? (topCategory[1] / totalExpense) * 100 : 0

    // Daily analysis
    const dailyAnalysis = analyzeDailySpending(transactions, currentMonth)

    // Previous month comparison
    const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const prevMonthKey = getMonthKey(prevMonthDate)
    const prevMonthTransactions = allTransactions[prevMonthKey] || []
    const trend = analyzeSpendingTrends(transactions, prevMonthTransactions, currentMonth)

    const prevTotalExpense = prevMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    // Best financial week
    const bestWeek = dailyAnalysis.bestWeek
    const bestWeekLabel = bestWeek.amount > 0 
      ? `${bestWeek.start.getDate()}-${bestWeek.end.getDate()} ${getMonthKey(bestWeek.start)}`
      : 'N/A'

    // Spending score (0-100)
    const spendingScore = Math.min(100, Math.max(0, 
      100 - (savingsRate < 0 ? Math.abs(savingsRate) : 0) + (savingsRate > 20 ? 20 : 0)
    ))

    return {
      totalIncome,
      totalExpense,
      savings,
      savingsRate,
      topCategory,
      topCategoryPercentage,
      sortedCategories,
      dailyAnalysis,
      trend,
      prevTotalExpense,
      bestWeekLabel,
      spendingScore,
      transactionCount: transactions.length,
      isCurrentMonth
    }
  }, [transactions, currentMonth, currency, allTransactions])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthLabel = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={ANIMATION.spring.slow}
          className="min-h-screen p-4 flex items-start justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md space-y-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">{monthLabel}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Monthly Financial Review</p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light')
                  onClose()
                }}
                className="rounded-xl p-2 hover:bg-slate-800/50 transition-colors"
                aria-label="Close review"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Spending Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, ...ANIMATION.spring.base }}
              className="rounded-2xl bg-slate-900/50 border border-slate-800/30 p-6 text-center"
            >
              <div className="relative inline-flex items-center justify-center mb-3">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#1e293b"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={review.spendingScore >= 70 ? COLORS.emerald[500] : review.spendingScore >= 40 ? COLORS.amber[500] : COLORS.rose[500]}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${review.spendingScore * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-100">{review.spendingScore}</span>
                  <span className="text-[10px] text-slate-500">/100</span>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-300">Financial Health Score</p>
              <p className="text-xs text-slate-500 mt-1">
                {review.spendingScore >= 70 ? 'Excellent control' : review.spendingScore >= 40 ? 'Room for improvement' : 'Needs attention'}
              </p>
            </motion.div>

            {/* Key Metrics */}
            <InsightGrid>
              <InsightCard
                icon={<DollarSign className="h-3 w-3" />}
                label="Total Spent"
                value={formatUAH(review.totalExpense, undefined, currency)}
                delay={0.15}
              />
              <InsightCard
                icon={<PiggyBank className="h-3 w-3" />}
                label="Total Saved"
                value={formatUAH(review.savings, undefined, currency)}
                delay={0.2}
                className={review.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              />
              <InsightCard
                icon={<CalendarDays className="h-3 w-3" />}
                label="Transactions"
                value={`${review.transactionCount}`}
                delay={0.25}
              />
              <InsightCard
                icon={review.trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                label="vs Last Month"
                value={`${review.trend.direction === 'up' ? '+' : ''}${Math.round(review.trend.percentage)}%`}
                delay={0.3}
                className={review.trend.direction === 'down' ? 'text-emerald-500' : 'text-rose-500'}
              />
            </InsightGrid>

            {/* Top Insights */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Key Insights</h3>
              
              {review.topCategory && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="rounded-xl bg-slate-900/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-slate-300">Top Category</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">
                      {getCategoryEmoji('expense', review.topCategory[0])} {review.topCategory[0]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatUAH(review.topCategory[1], undefined, currency)} ({Math.round(review.topCategoryPercentage)}% of total)
                  </p>
                </motion.div>
              )}

              {review.dailyAnalysis.currentStreak > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl bg-slate-900/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-slate-300">No-Spend Streak</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-emerald-500">
                    {review.dailyAnalysis.currentStreak} consecutive days
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="rounded-xl bg-slate-900/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-slate-300">Savings Rate</span>
                </div>
                <p className={`mt-1 text-sm font-semibold ${review.savingsRate >= 20 ? 'text-emerald-500' : review.savingsRate >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {Math.round(review.savingsRate)}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {review.savingsRate >= 20 ? 'Great saving habit!' : review.savingsRate >= 0 ? 'Consider saving more' : 'Spending exceeds income'}
                </p>
              </motion.div>

              {!review.isCurrentMonth && review.bestWeekLabel !== 'N/A' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-xl bg-slate-900/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-slate-300">Best Financial Week</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-200">
                    {review.bestWeekLabel}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Category Breakdown */}
            {review.topCategory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="rounded-xl bg-slate-900/40 p-3"
              >
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Spending Breakdown</h3>
                <div className="space-y-2">
                  {review.sortedCategories.slice(0, 5).map(([category, amount]: [string, number], idx: number) => {
                    const percentage = (amount / review.totalExpense) * 100
                    const barColor = getCategoryColor(category, idx)
                    
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-300">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: barColor }}
                            />
                            {getCategoryEmoji('expense', category)} {category}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-slate-200">{formatUAH(amount, undefined, currency)}</span>
                            <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round(percentage)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: 0.6 + idx * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
