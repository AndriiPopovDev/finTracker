/**
 * Reusable Analytics Insight Card
 * Used for displaying spending insights and metrics
 */

import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { ANIMATION } from "@/lib/theme"

type InsightCardProps = {
  icon?: ReactNode
  label: string
  value: string | number
  delay?: number
  className?: string
}

export function InsightCard({ 
  icon, 
  label, 
  value, 
  delay = 0,
  className = ''
}: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay,
        duration: parseFloat(ANIMATION.duration.slow)
      }}
      className={`rounded-lg bg-slate-900/50 p-2.5 ${className}`}
    >
      {icon && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-slate-500">{icon}</span>
          <span className="text-[10px] text-slate-500">{label}</span>
        </div>
      )}
      {!icon && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] text-slate-500">{label}</span>
        </div>
      )}
      <p className="text-sm font-semibold text-slate-200">
        {value}
      </p>
    </motion.div>
  )
}

/**
 * Insight Grid Layout
 * 2-column grid for insight cards
 */
type InsightGridProps = {
  children: ReactNode
  className?: string
}

export function InsightGrid({ children, className = '' }: InsightGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {children}
    </div>
  )
}
