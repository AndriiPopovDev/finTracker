import type { Transaction, CurrencyCode } from "./finance"

export type SmartInsight = {
  id: string
  type: 'trend' | 'anomaly' | 'recurring' | 'prediction' | 'suggestion'
  title: string
  message: string
  value?: string
  icon: string
  priority: 'high' | 'medium' | 'low'
}

export type SpendingTrend = {
  direction: 'up' | 'down' | 'stable'
  percentage: number
  period: string
}

export type RecurringPattern = {
  merchant: string
  category: string
  avgAmount: number
  frequency: 'weekly' | 'monthly'
  confidence: number // 0-1
}

export type AnomalyResult = {
  category: string
  currentAmount: number
  avgAmount: number
  deviation: number // percentage deviation
  severity: 'low' | 'medium' | 'high'
}

export function analyzeSpendingTrends(
  currentMonthTransactions: Transaction[],
  prevMonthTransactions: Transaction[],
  currentMonth: Date
): SpendingTrend {
  if (prevMonthTransactions.length === 0) {
    return { direction: 'stable', percentage: 0, period: 'no data' }
  }

  const currentTotal = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const prevTotal = prevMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  if (prevTotal === 0) return { direction: 'stable', percentage: 0, period: 'no data' }

  const change = ((currentTotal - prevTotal) / prevTotal) * 100
  const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable'

  return {
    direction,
    percentage: Math.abs(change),
    period: 'vs last month'
  }
}

export function detectRecurringPatterns(
  transactions: Transaction[],
  months: number = 3
): RecurringPattern[] {
  if (transactions.length < 5) return []

  // Group by category + approximate amount (within 10%)
  const patterns = new Map<string, Transaction[]>()

  transactions.forEach(tx => {
    if (tx.type !== 'expense') return

    // Create a normalized key for matching
    const amountGroup = Math.round(tx.amount / 10) * 10
    const key = `${tx.category.toLowerCase()}_${amountGroup}`

    if (!patterns.has(key)) {
      patterns.set(key, [])
    }
    patterns.get(key)!.push(tx)
  })

  const results: RecurringPattern[] = []

  patterns.forEach((txs, key) => {
    if (txs.length < 2) return

    // Check if transactions span multiple months
    const dates = txs.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    const daysSpan = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)

    // Need at least 30 days to be considered recurring
    if (daysSpan < 30) return

    const avgAmount = txs.reduce((sum, t) => sum + t.amount, 0) / txs.length
    const category = txs[0].category

    // Determine frequency
    const frequency: 'weekly' | 'monthly' = daysSpan < 45 ? 'monthly' : 'weekly'
    const confidence = Math.min(1, txs.length / 3) // More occurrences = higher confidence

    results.push({
      merchant: category,
      category,
      avgAmount,
      frequency,
      confidence
    })
  })

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

export function detectAnomalies(
  currentMonthTransactions: Transaction[],
  historicalTransactions: Transaction[],
  threshold: number = 30
): AnomalyResult[] {
  if (historicalTransactions.length === 0) return []

  // Group by category
  const currentByCategory = new Map<string, number>()
  currentMonthTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      currentByCategory.set(t.category, (currentByCategory.get(t.category) || 0) + t.amount)
    })

  const historicalByCategory = new Map<string, number[]>()
  historicalTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      if (!historicalByCategory.has(t.category)) {
        historicalByCategory.set(t.category, [])
      }
      historicalByCategory.get(t.category)!.push(t.amount)
    })

  const anomalies: AnomalyResult[] = []

  currentByCategory.forEach((currentAmount, category) => {
    const historicalAmounts = historicalByCategory.get(category) || []
    if (historicalAmounts.length === 0) return

    const avgHistorical = historicalAmounts.reduce((sum, a) => sum + a, 0) / historicalAmounts.length
    const deviation = ((currentAmount - avgHistorical) / avgHistorical) * 100

    if (Math.abs(deviation) > threshold) {
      const severity = Math.abs(deviation) > 50 ? 'high' : Math.abs(deviation) > 30 ? 'medium' : 'low'
      anomalies.push({
        category,
        currentAmount,
        avgAmount: avgHistorical,
        deviation,
        severity
      })
    }
  })

  return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)).slice(0, 3)
}

export function predictMonthEnd(
  currentTransactions: Transaction[],
  daysElapsed: number,
  daysInMonth: number,
  monthlyPlan: number
): {
  predictedExpense: number
  predictedBalance: number
  onTrack: boolean
  confidence: number
} {
  const currentExpense = currentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const currentIncome = currentTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const daysLeft = daysInMonth - daysElapsed
  const dailyRate = daysElapsed > 0 ? currentExpense / daysElapsed : 0
  const predictedExpense = currentExpense + (dailyRate * daysLeft)
  const predictedBalance = monthlyPlan - predictedExpense + currentIncome

  // Confidence based on data completeness
  const confidence = Math.min(1, daysElapsed / 7) // Full confidence after 7 days
  const onTrack = predictedExpense <= monthlyPlan

  return {
    predictedExpense: Math.round(predictedExpense),
    predictedBalance: Math.round(predictedBalance),
    onTrack,
    confidence
  }
}

export function generateSmartInsights(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  historicalTransactions: Transaction[],
  currentMonth: Date,
  monthlyPlan: number
): SmartInsight[] {
  const insights: SmartInsight[] = []

  // 1. Spending trend
  const trend = analyzeSpendingTrends(currentTransactions, previousTransactions, currentMonth)
  if (trend.direction !== 'stable' && trend.percentage > 5) {
    insights.push({
      id: 'trend',
      type: 'trend',
      title: trend.direction === 'up' ? 'Spending Increased' : 'Spending Decreased',
      message: `${trend.direction === 'up' ? 'Up' : 'Down'} ${Math.round(trend.percentage)}% ${trend.period}`,
      icon: trend.direction === 'up' ? '📈' : '',
      priority: 'medium'
    })
  }

  // 2. Recurring patterns
  const recurring = detectRecurringPatterns([...currentTransactions, ...previousTransactions])
  const highConfidenceRecurring = recurring.filter(r => r.confidence > 0.6)
  if (highConfidenceRecurring.length > 0) {
    const top = highConfidenceRecurring[0]
    insights.push({
      id: 'recurring',
      type: 'recurring',
      title: 'Recurring Payment Detected',
      message: `${top.category} (~${Math.round(top.avgAmount)} ${top.frequency})`,
      value: `${Math.round(top.avgAmount)} UAH`,
      icon: '🔄',
      priority: 'low'
    })
  }

  // 3. Anomalies
  const anomalies = detectAnomalies(currentTransactions, historicalTransactions)
  const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high')
  if (highSeverityAnomalies.length > 0) {
    const anomaly = highSeverityAnomalies[0]
    insights.push({
      id: 'anomaly',
      type: 'anomaly',
      title: 'Unusual Spending',
      message: `${anomaly.category} ${anomaly.deviation > 0 ? 'up' : 'down'} ${Math.round(Math.abs(anomaly.deviation))}%`,
      icon: '⚠️',
      priority: 'high'
    })
  }

  // 4. Monthly prediction
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === currentMonth.getFullYear() && 
                          now.getMonth() === currentMonth.getMonth()
  if (isCurrentMonth) {
    const daysElapsed = now.getDate()
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const prediction = predictMonthEnd(currentTransactions, daysElapsed, daysInMonth, monthlyPlan)

    if (prediction.confidence > 0.3) {
      insights.push({
        id: 'prediction',
        type: 'prediction',
        title: prediction.onTrack ? 'On Track' : 'Over Budget',
        message: prediction.onTrack 
          ? `Predicted: ${Math.abs(prediction.predictedBalance)} UAH left`
          : `Predicted: ${Math.abs(prediction.predictedBalance)} UAH over`,
        value: `${Math.round(prediction.confidence * 100)}% confidence`,
        icon: prediction.onTrack ? '✅' : '⚠️',
        priority: prediction.onTrack ? 'low' : 'high'
      })
    }
  }

  // 5. Category suggestions based on top spending
  const categoryTotals = new Map<string, number>()
  currentTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount)
    })

  const sortedCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])

  if (sortedCategories.length > 0) {
    const topCategory = sortedCategories[0]
    const total = sortedCategories.reduce((sum, [, val]) => sum + val, 0)
    const percentage = (topCategory[1] / total) * 100

    if (percentage > 35) {
      insights.push({
        id: 'suggestion',
        type: 'suggestion',
        title: 'Top Category',
        message: `${topCategory[0]} is ${Math.round(percentage)}% of spending`,
        icon: '💡',
        priority: 'low'
      })
    }
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  }).slice(0, 4) // Max 4 insights to avoid clutter
}
