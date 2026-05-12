"use client"

import { useState, useMemo } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { ChartPie as PieIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, CalendarDays } from "lucide-react"
import { CATEGORIES, COLORS, formatUAH, getCategoryEmoji, type CurrencyCode, type Transaction, getMonthKey } from "@/lib/finance"
import { triggerHaptic } from "@/lib/haptic"
import { InsightCard, InsightGrid } from "@/components/ui"

type ChartDatum = { name: string; value: number }

type Props = {
  data: ChartDatum[]
  totalExpense: number
  currency: CurrencyCode
  forecastValue: number
  currentDate: Date
  allTransactions: Transaction[]
}

type CategoryDetails = {
  name: string
  value: number
  percentage: number
  prevMonthValue: number
  change: number
  emoji: string
  color: string
}

type SpendingInsights = {
  predictedBalance: number
  biggestCategory: string
  avgDailySpending: number
  trend: "up" | "down" | "stable"
  trendPercentage: number
}

export function SpendingChart({ data, totalExpense, currency, forecastValue, currentDate, allTransactions }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const hasData = data.length > 0
  const forecastClass = forecastValue >= 0 ? "text-emerald-500" : "text-rose-500"

  // Calculate previous month data
  const prevMonthDate = useMemo(() => {
    const prev = new Date(currentDate)
    prev.setMonth(prev.getMonth() - 1)
    return prev
  }, [currentDate])

  const prevMonthKey = getMonthKey(prevMonthDate)
  const prevMonthData = useMemo(() => {
    if (typeof window === "undefined") return []
    try {
      const prevTxs = JSON.parse(window.localStorage.getItem(prevMonthKey) || "[]") as Transaction[]
      return CATEGORIES.expense
        .map((cat) => ({
          name: cat.name,
          value: prevTxs
            .filter((t) => t.type === "expense" && t.category === cat.name)
            .reduce((a, b) => a + b.amount, 0),
        }))
        .filter((item) => item.value > 0)
    } catch {
      return []
    }
  }, [prevMonthKey])

  // Selected category details
  const selectedCategory: CategoryDetails | null = useMemo(() => {
    if (selectedIndex === null || !data[selectedIndex]) return null
    const item = data[selectedIndex]
    const percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0
    const prevItem = prevMonthData.find((p) => p.name === item.name)
    const prevValue = prevItem?.value || 0
    const change = prevValue > 0 ? ((item.value - prevValue) / prevValue) * 100 : 0
    const catInfo = CATEGORIES.expense.find((c) => c.name === item.name)
    
    return {
      name: item.name,
      value: item.value,
      percentage,
      prevMonthValue: prevValue,
      change,
      emoji: getCategoryEmoji("expense", item.name),
      color: catInfo?.color || COLORS[selectedIndex % COLORS.length],
    }
  }, [selectedIndex, data, totalExpense, prevMonthData])

  // Spending insights
  const insights: SpendingInsights | null = useMemo(() => {
    if (!hasData) return null

    const now = new Date()
    const isCurrentMonth = now.getFullYear() === currentDate.getFullYear() && now.getMonth() === currentDate.getMonth()
    const dayOfMonth = isCurrentMonth ? now.getDate() : 1
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const daysLeft = Math.max(0, daysInMonth - dayOfMonth)
    const avgDaily = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0

    // Biggest category
    const biggestCategory = data.reduce((max, item) => item.value > max.value ? item : max, data[0])?.name || ""

    // Trend calculation (compare with previous month)
    const prevTotalExpense = prevMonthData.reduce((sum, item) => sum + item.value, 0)
    const trendPercentage = prevTotalExpense > 0 ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 : 0
    const trend: "up" | "down" | "stable" = trendPercentage > 5 ? "up" : trendPercentage < -5 ? "down" : "stable"

    return {
      predictedBalance: forecastValue,
      biggestCategory,
      avgDailySpending: avgDaily,
      trend,
      trendPercentage: Math.abs(trendPercentage),
    }
  }, [hasData, currentDate, totalExpense, data, prevMonthData, forecastValue])

  const handleSliceClick = (index: number) => {
    triggerHaptic('light')
    setSelectedIndex(index === selectedIndex ? null : index)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-4">
      <div className="flex items-center gap-2 mb-3">
        <PieIcon className="h-4 w-4 text-blue-400/80" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Spending Breakdown
        </span>
      </div>

      {hasData ? (
        <>
          <div className="mt-2 h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  onClick={(_, index) => handleSliceClick(index)}
                  style={{ cursor: "pointer", outline: 'none' }}
                >
                  {data.map((_, i) => (
                    <Cell 
                      key={i} 
                      fill={COLORS[i % COLORS.length]}
                      opacity={selectedIndex === null || selectedIndex === i ? 1 : 0.4}
                      style={{ 
                        transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        filter: selectedIndex === i ? 'brightness(1.1)' : 'none'
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Animated center content */}
            <AnimatePresence mode="wait">
              {selectedCategory ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span className="text-2xl mb-1">{selectedCategory.emoji}</span>
                  <span className="text-xs font-medium text-slate-400">{selectedCategory.name}</span>
                  <span className="text-lg font-bold text-slate-200">{formatUAH(selectedCategory.value, undefined, currency)}</span>
                  <span className="text-xs text-slate-500">{Math.round(selectedCategory.percentage)}% of total</span>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span className="text-xs text-slate-500">Total Spent</span>
                  <span className="text-lg font-bold text-slate-200">{formatUAH(totalExpense, undefined, currency)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Category details when selected */}
          <AnimatePresence>
            {selectedCategory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-slate-800/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">vs Previous Month</span>
                    <div className="flex items-center gap-1">
                      {selectedCategory.change !== 0 && (
                        selectedCategory.change > 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />
                        )
                      )}
                      <span className={`font-semibold ${
                        selectedCategory.change > 0 ? "text-rose-500" : 
                        selectedCategory.change < 0 ? "text-emerald-500" : 
                        "text-slate-400"
                      }`}>
                        {selectedCategory.prevMonthValue > 0 ? 
                          `${selectedCategory.change > 0 ? "+" : ""}${Math.round(selectedCategory.change)}%` : 
                          "New"
                        }
                      </span>
                    </div>
                  </div>
                  {selectedCategory.prevMonthValue > 0 && (
                    <p className="mt-1 text-xs text-slate-500 text-right">
                      Previous: {formatUAH(selectedCategory.prevMonthValue, undefined, currency)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ul className="mt-3 space-y-2.5">
            {data.map((d, i) => {
              const pct = totalExpense > 0 ? (d.value / totalExpense) * 100 : 0
              const catInfo = CATEGORIES.expense.find((c) => c.name === d.name)
              const barColor = catInfo?.color ?? COLORS[i % COLORS.length]
              const isSelected = selectedIndex === i
              return (
                <motion.li 
                  key={d.name} 
                  className={`space-y-1.5 cursor-pointer transition-all duration-200 ${
                    isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  onClick={() => {
                    triggerHaptic('light')
                    handleSliceClick(i)
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: barColor }}
                        aria-hidden="true"
                      />
                      <span aria-hidden="true">{getCategoryEmoji("expense", d.name)}</span>
                      <span className={`font-medium ${isSelected ? "text-white" : ""}`}>{d.name}</span>
                    </span>
                    <div className="flex items-baseline gap-2 text-right flex-shrink-0">
                      <span className="font-semibold text-slate-200">{formatUAH(d.value, undefined, currency)}</span>
                      <span className="text-[10px] font-medium text-slate-500 w-8">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                      aria-hidden="true"
                    />
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-slate-500">
          No expenses for this period yet.
        </p>
      )}

      {/* Spending Insights Section */}
      {insights && hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-4 pt-3 border-t border-slate-800/30 space-y-2.5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-3.5 w-3.5 text-blue-400/80" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Spending Insights
            </span>
          </div>

          <InsightGrid>
            {/* Predicted Balance */}
            <InsightCard
              icon={<CalendarDays className="h-3 w-3" />}
              label="Month-End Forecast"
              value={formatUAH(insights.predictedBalance, undefined, currency)}
              delay={0.1}
              className={forecastClass}
            />

            {/* Biggest Category */}
            <InsightCard
              label="Top Category"
              value={`${getCategoryEmoji("expense", insights.biggestCategory)} ${insights.biggestCategory}`}
              delay={0.15}
            />

            {/* Average Daily */}
            <InsightCard
              label="Daily Average"
              value={formatUAH(insights.avgDailySpending, undefined, currency)}
              delay={0.2}
            />

            {/* Trend */}
            <InsightCard
              icon={
                insights.trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : insights.trend === "down" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <span className="text-xs">→</span>
                )
              }
              label="Monthly Trend"
              value={`${insights.trend === "up" ? "↑" : insights.trend === "down" ? "↓" : "→"} ${Math.round(insights.trendPercentage)}% vs last month`}
              delay={0.25}
              className={
                insights.trend === "up" ? "text-rose-500" :
                insights.trend === "down" ? "text-emerald-500" :
                "text-slate-400"
              }
            />
          </InsightGrid>
        </motion.div>
      )}

      {/* Forecast note removed - already shown in insights */}
    </div>
  )
}
