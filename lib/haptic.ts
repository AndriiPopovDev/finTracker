/**
 * Haptic feedback utility for mobile devices
 * Uses navigator.vibrate API with fallback
 */

export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const HAPTIC_PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
}

export function triggerHaptic(intensity: HapticIntensity = 'light'): void {
  if (typeof navigator === 'undefined') return
  if (!navigator.vibrate) return

  try {
    const pattern = HAPTIC_PATTERNS[intensity]
    navigator.vibrate(pattern)
  } catch {
    // Silently fail if vibrate is not supported
  }
}
