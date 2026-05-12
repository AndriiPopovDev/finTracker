/**
 * Design System Theme Tokens
 * Centralized color, spacing, and typography constants
 */

// ============================================================
// COLOR TOKENS
// ============================================================

export const COLORS = {
  // Primary brand colors
  rose: {
    50: '#fff1f2',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
  },
  emerald: {
    50: '#ecfdf5',
    400: '#34d399',
    500: '#10b981',
  },
  blue: {
    50: '#eff6ff',
    400: '#60a5fa',
    500: '#3b82f6',
  },
  purple: {
    400: '#a78bfa',
    500: '#8b5cf6',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  cyan: {
    400: '#22d3ee',
    500: '#06b6d4',
  },
  pink: {
    400: '#f472b6',
    500: '#ec4899',
  },

  // Slate scale (dark mode)
  slate: {
    950: '#020617',
    900: '#0f172a',
    800: '#1e293b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    300: '#cbd5e1',
    200: '#e2e8f0',
  },

  // Chart colors
  chart: ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899'],

  // Semantic colors
  background: '#0b1120',
  card: '#020617',
  cardHover: '#0f172a',
  border: 'rgba(30, 41, 59, 0.5)',
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#64748b',
    disabled: '#475569',
  },
} as const

// ============================================================
// SPACING TOKENS
// ============================================================

export const SPACING = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  '4xl': '2.5rem',  // 40px
} as const

// ============================================================
// BORDER RADIUS TOKENS
// ============================================================

export const RADIUS = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
} as const

// ============================================================
// TYPOGRAPHY TOKENS
// ============================================================

export const TYPOGRAPHY = {
  // Font sizes
  sizes: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  // Font weights
  weights: {
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  tracking: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// ============================================================
// ANIMATION TOKENS
// ============================================================

export const ANIMATION = {
  // Durations
  duration: {
    fast: '0.15s',
    base: '0.2s',
    slow: '0.3s',
    slower: '0.5s',
  },

  // Easing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Spring physics
  spring: {
    fast: { stiffness: 400, damping: 25, mass: 0.8 },
    base: { stiffness: 350, damping: 30, mass: 0.8 },
    slow: { stiffness: 300, damping: 25, mass: 0.8 },
  },
} as const

// ============================================================
// SHADOW TOKENS
// ============================================================

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
  fab: '0 10px 15px -3px rgba(244, 63, 94, 0.3)',
} as const

// ============================================================
// BREAKPOINTS
// ============================================================

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// Export all tokens
export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  typography: TYPOGRAPHY,
  animation: ANIMATION,
  shadows: SHADOWS,
  breakpoints: BREAKPOINTS,
} as const
