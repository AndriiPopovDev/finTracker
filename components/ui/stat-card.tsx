/**
 * Reusable Stat Card Component
 * Used for displaying financial metrics and statistics
 */

import { motion, type MotionProps } from "framer-motion"
import type { ReactNode } from "react"
import { triggerHaptic } from "@/lib/haptic"
import { COLORS, RADIUS, SPACING, ANIMATION } from "@/lib/theme"

type StatCardColor = 'emerald' | 'rose' | 'blue' | 'purple' | 'amber' | 'cyan' | 'pink' | 'slate'

type StatCardProps = {
  label: string
  value: string | number
  icon?: ReactNode
  color?: StatCardColor
  variant?: 'default' | 'accent' | 'highlight'
  onClick?: () => void
  className?: string
  animated?: boolean
} & MotionProps

export function StatCard({
  label,
  value,
  icon,
  color = 'slate',
  variant = 'default',
  onClick,
  className = '',
  animated = true,
  ...motionProps
}: StatCardProps) {
  const colorMap: Record<StatCardColor, string> = {
    emerald: COLORS.emerald[500],
    rose: COLORS.rose[500],
    blue: COLORS.blue[500],
    purple: COLORS.purple[500],
    amber: COLORS.amber[500],
    cyan: COLORS.cyan[500],
    pink: COLORS.pink[500],
    slate: COLORS.slate[500],
  }

  const accentColor = colorMap[color] || colorMap.slate

  const variantStyles = {
    default: 'bg-slate-900/40 hover:bg-slate-900/60',
    accent: 'border border-slate-800/30 bg-slate-900/30 hover:bg-slate-900/50',
    highlight: 'border border-emerald-500/15 bg-emerald-500/5',
  }

  const handleClick = () => {
    triggerHaptic('light')
    onClick?.()
  }

  const content = (
    <div className={`rounded-${RADIUS.lg} p-${SPACING.lg} cursor-pointer transition-colors ${variantStyles[variant]} ${className}`}>
      {icon && (
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ color: accentColor }}>{icon}</span>
          <span className="text-[10px] font-medium text-slate-500">{label}</span>
        </div>
      )}
      {!icon && (
        <p className="text-[10px] font-medium text-slate-500 mb-0.5">{label}</p>
      )}
      <p className="text-sm font-semibold text-slate-200">{value}</p>
    </div>
  )

  if (!animated) {
    return onClick ? (
      <button type="button" onClick={handleClick} className="w-full">
        {content}
      </button>
    ) : content
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={ANIMATION.spring.fast}
      onClick={onClick ? handleClick : undefined}
      {...motionProps}
    >
      {content}
    </motion.div>
  )
}
