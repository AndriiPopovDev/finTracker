"use client"

import { motion } from "framer-motion"
import { format } from "date-fns"
import type { RecurringPattern } from "@/lib/smart-insights"
import type { CurrencyCode } from "@/lib/finance"
import { formatUAH } from "@/lib/finance"
import { ANIMATION, COLORS } from "@/lib/theme"
import { triggerHaptic } from "@/lib/haptic"
import { Calendar, ArrowUpRight, AlertCircle, CheckCircle } from "lucide-react"

type Props = {
  patterns: RecurringPattern[]
  currency: CurrencyCode
  className?: string
}

export function SubscriptionIntelligence({ patterns, currency, className = '' }: Props) {
  if (patterns.length === 0) return null

  const totalMonthlyCost = patterns.reduce((sum, p) => sum + p.monthlyCost, 0)
  const inactiveCount = patterns.filter(p => !p.isActive).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.base}
      className={`rounded-xl border border-slate-800/30 bg-slate-950/50 p-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm" aria-hidden="true">🔄</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Subscriptions
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-400">
          {patterns.length} detected
        </span>
      </div>

      {/* Total monthly cost */}
      <div className="mb-3 px-2 py-1.5 rounded-lg bg-slate-900/40">
        <p className="text-[10px] text-slate-500 mb-0.5">Total monthly</p>
        <p className="text-sm font-semibold text-slate-200">
          {formatUAH(totalMonthlyCost, undefined, currency)}
        </p>
        {inactiveCount > 0 && (
          <p className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
            <AlertCircle size={10} />
            {inactiveCount} inactive
          </p>
        )}
      </div>

      {/* Subscription list */}
      <div className="space-y-2">
        {patterns.slice(0, 5).map((pattern, index) => (
          <motion.button
            key={`${pattern.category}-${pattern.avgAmount}`}
            type="button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index, ...ANIMATION.spring.fast }}
            whileTap={{ scale: 0.98 }}
            onClick={() => triggerHaptic('light')}
            className={`w-full text-left rounded-lg border ${
              pattern.isActive ? 'border-slate-800/20 bg-slate-900/20' : 'border-amber-500/20 bg-amber-500/5'
            } p-2.5 transition-colors hover:bg-slate-900/40`}
          >
            <div className="flex items-start gap-2">
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pattern.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {pattern.isActive ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-medium text-slate-300 truncate">
                    {pattern.category}
                  </p>
                  <p className="text-xs font-semibold text-slate-200 ml-2">
                    {formatUAH(pattern.avgAmount, undefined, currency)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <Calendar size={9} />
                    {format(pattern.nextPaymentDate, 'MMM d')}
                  </span>
                  <span className="capitalize">{pattern.frequency}</span>
                  {!pattern.isActive && (
                    <span className="text-amber-400/80 font-medium">Inactive</span>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* View all link */}
      {patterns.length > 5 && (
        <button
          type="button"
          onClick={() => triggerHaptic('light')}
          className="w-full mt-2 text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 py-1.5 transition-colors"
        >
          View all {patterns.length} subscriptions
          <ArrowUpRight size={12} />
        </button>
      )}
    </motion.div>
  )
}
