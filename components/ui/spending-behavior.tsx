"use client"

import { motion } from "framer-motion"
import { Flame, TrendingUp, Shield, AlertCircle, Target } from "lucide-react"
import type { SpendingBehavior } from "@/lib/smart-insights"
import { ANIMATION, COLORS } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"

type Props = {
  behavior: SpendingBehavior
  className?: string
}

export function SpendingBehaviorCard({ behavior, className = '' }: Props) {
  const { noSpendStreak, savingsStreak, spendingScore, behaviorInsights } = behavior
  
  if (behaviorInsights.length === 0) return null

  const scoreColor = spendingScore >= 70 ? COLORS.emerald[500] : 
                     spendingScore >= 40 ? COLORS.amber[500] : 
                     COLORS.rose[500]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.base}
      className={`rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Target className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-300">Financial Wellness</span>
      </div>

      {/* Spending Score */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-14 w-14">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-slate-800"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke={scoreColor}
              strokeWidth="2"
              strokeDasharray={`${spendingScore} ${100 - spendingScore}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-slate-200">{spendingScore}</span>
          </div>
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-slate-400 mb-1">
            {spendingScore >= 70 ? 'Healthy spending habits' : 
             spendingScore >= 40 ? 'Moderate spending' : 
             'Review spending patterns'}
          </p>
          <div className="flex gap-2 text-[10px]">
            {noSpendStreak >= 2 && (
              <div className="flex items-center gap-1 text-emerald-400">
                <Flame className="h-3 w-3" />
                <span>{noSpendStreak}d streak</span>
              </div>
            )}
            {savingsStreak >= 2 && (
              <div className="flex items-center gap-1 text-blue-400">
                <TrendingUp className="h-3 w-3" />
                <span>{savingsStreak}d saving</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Behavior Insights */}
      <div className="space-y-1.5">
        {behaviorInsights.slice(0, 3).map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-2 rounded-lg bg-slate-900/30 px-2.5 py-2"
          >
            <span className="text-sm">{insight.icon}</span>
            <p className="flex-1 text-xs text-slate-300">{insight.message}</p>
            {insight.priority === 'high' && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
