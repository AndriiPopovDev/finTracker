import type { SpendingBehavior } from "./smart-insights"

export type EmotionalState = {
  mood: 'calm' | 'balanced' | 'alert' | 'critical'
  intensity: 'low' | 'medium' | 'high'
  primaryColor: string
  secondaryColor: string
  animationSpeed: 'slow' | 'normal' | 'fast'
  showCelebration: boolean
}

export function getEmotionalState(behavior: SpendingBehavior): EmotionalState {
  const { spendingScore, overspendingDays, noSpendStreak, savingsStreak } = behavior

  // Critical: spending score < 30 or multiple overspending days
  if (spendingScore < 30 || overspendingDays >= 3) {
    return {
      mood: 'critical',
      intensity: 'high',
      primaryColor: '#f43f5e', // rose
      secondaryColor: '#fb923c', // amber
      animationSpeed: 'slow',
      showCelebration: false
    }
  }

  // Alert: spending score 30-50 or some overspending
  if (spendingScore < 50 || overspendingDays > 0) {
    return {
      mood: 'alert',
      intensity: 'medium',
      primaryColor: '#f59e0b', // amber
      secondaryColor: '#fbbf24', // amber light
      animationSpeed: 'normal',
      showCelebration: false
    }
  }

  // Celebration: good streaks
  if (noSpendStreak >= 5 || savingsStreak >= 5) {
    return {
      mood: 'calm',
      intensity: 'low',
      primaryColor: '#10b981', // emerald
      secondaryColor: '#34d399', // emerald light
      animationSpeed: 'slow',
      showCelebration: true
    }
  }

  // Balanced: default healthy state
  return {
    mood: 'balanced',
    intensity: 'low',
    primaryColor: '#3b82f6', // blue
    secondaryColor: '#60a5fa', // blue light
    animationSpeed: 'normal',
    showCelebration: false
  }
}

export function getEmotionalBackgroundGradient(emotionalState: EmotionalState): string {
  const { mood, primaryColor, secondaryColor } = emotionalState
  
  switch (mood) {
    case 'critical':
      return `radial-gradient(ellipse at top, ${primaryColor}08 0%, transparent 70%)`
    case 'alert':
      return `radial-gradient(ellipse at top, ${primaryColor}06 0%, transparent 70%)`
    case 'calm':
      return `radial-gradient(ellipse at top, ${primaryColor}08 0%, transparent 60%)`
    default:
      return `radial-gradient(ellipse at top, ${primaryColor}05 0%, transparent 70%)`
  }
}

export function getEmotionalAnimationDuration(emotionalState: EmotionalState): string {
  const { animationSpeed } = emotionalState
  
  switch (animationSpeed) {
    case 'slow':
      return '0.4s'
    case 'fast':
      return '0.15s'
    default:
      return '0.25s'
  }
}
