/**
 * Animated Value Component
 * Smoothly animates value changes with spring physics
 */

import { motion } from "framer-motion"
import { ANIMATION } from "@/lib/theme"

type AnimatedValueProps = {
  value: string | number
  className?: string
  delay?: number
}

export function AnimatedValue({ value, className = '', delay = 0 }: AnimatedValueProps) {
  return (
    <motion.p
      key={value}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: parseFloat(ANIMATION.duration.base),
        delay 
      }}
      className={className}
    >
      {value}
    </motion.p>
  )
}

/**
 * Animated Counter with spring physics
 * For important financial metrics that need emphasis
 */
type AnimatedCounterProps = {
  children: React.ReactNode
  className?: string
}

export function AnimatedCounter({ children, className = '' }: AnimatedCounterProps) {
  // Use a stable key based on children content
  const key = typeof children === 'string' ? children : 'animated-counter'
  
  return (
    <motion.div
      key={key}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ANIMATION.spring.slow}
      className={className}
    >
      {children}
    </motion.div>
  )
}
