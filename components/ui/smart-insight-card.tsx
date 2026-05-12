"use client"

import { motion } from "framer-motion"
import type { SmartInsight } from "@/lib/smart-insights"
import { ANIMATION } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"

type Props = {
  insights: SmartInsight[]
  className?: string
}

const PRIORITY_COLORS = {
  high: 'border-rose-500/30 bg-rose-500/5',
  medium: 'border-amber-500/30 bg-amber-500/5',
  low: 'border-blue-500/30 bg-blue-500/5'
}

const PRIORITY_ICONS = {
  high: '',
  medium: '🟡',
  low: '🔵'
}

export function SmartInsightCard({ insights, className = '' }: Props) {
  if (insights.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.base}
      className={`rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm" aria-hidden="true">🤖</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Smart Insights
        </span>
        <span className="ml-auto text-[10px] text-slate-600">
          {insights.length} tip{insights.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {insights.map((insight, index) => (
          <motion.button
            key={insight.id}
            type="button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05, ...ANIMATION.spring.fast }}
            whileTap={{ scale: 0.98 }}
            onClick={() => triggerHaptic('light')}
            className={`w-full text-left rounded-lg border ${PRIORITY_COLORS[insight.priority]} p-2.5 transition-colors hover:bg-slate-900/50`}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-medium text-slate-300">
                    {insight.title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800/50 text-slate-500">
                    {insight.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {insight.message}
                </p>
                {insight.value && (
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    {insight.value}
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
