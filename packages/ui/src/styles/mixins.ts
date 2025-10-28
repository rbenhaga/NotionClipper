// packages/ui/src/styles/mixins.ts
// 🎯 CSS-in-JS mixins and utility functions

import { colors, spacing, typography, borderRadius, shadows } from './tokens';

// ============================================
// LAYOUT MIXINS
// ============================================
export const flexCenter = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export const flexBetween = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
} as const;

export const flexColumn = {
  display: 'flex',
  flexDirection: 'column',
} as const;

export const absoluteFill = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

export const fixedFill = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

// ============================================
// TYPOGRAPHY MIXINS
// ============================================
export const textTruncate = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export const textClamp = (lines: number) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}) as const;

export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

// ============================================
// INTERACTION MIXINS
// ============================================
export const focusRing = {
  outline: 'none',
  '&:focus-visible': {
    outline: `2px solid ${colors.primary[500]}`,
    outlineOffset: '2px',
  },
} as const;

export const hoverScale = (scale = 1.05) => ({
  transition: 'transform 150ms ease-in-out',
  '&:hover': {
    transform: `scale(${scale})`,
  },
}) as const;

export const buttonReset = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  cursor: 'pointer',
  outline: 'inherit',
} as const;

// ============================================
// VISUAL MIXINS
// ============================================
export const glassmorphism = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
} as const;

export const cardShadow = {
  boxShadow: shadows.md,
  '&:hover': {
    boxShadow: shadows.lg,
  },
} as const;

export const scrollbarHidden = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
} as const;

export const customScrollbar = {
  '&::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: colors.neutral[100],
    borderRadius: borderRadius.full,
  },
  '&::-webkit-scrollbar-thumb': {
    background: colors.neutral[300],
    borderRadius: borderRadius.full,
    '&:hover': {
      background: colors.neutral[400],
    },
  },
} as const;

// ============================================
// ANIMATION MIXINS
// ============================================
export const fadeIn = {
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animation: 'fadeIn 300ms ease-in-out',
} as const;

export const slideUp = {
  '@keyframes slideUp': {
    from: { 
      opacity: 0,
      transform: 'translateY(20px)',
    },
    to: { 
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  animation: 'slideUp 300ms ease-out',
} as const;

export const pulse = {
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
} as const;

export const spin = {
  '@keyframes spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  animation: 'spin 1s linear infinite',
} as const;

// ============================================
// RESPONSIVE MIXINS
// ============================================
export const mediaQuery = {
  sm: '@media (min-width: 640px)',
  md: '@media (min-width: 768px)',
  lg: '@media (min-width: 1024px)',
  xl: '@media (min-width: 1280px)',
  '2xl': '@media (min-width: 1536px)',
  
  // Utility functions
  above: (breakpoint: string) => `@media (min-width: ${breakpoint})`,
  below: (breakpoint: string) => `@media (max-width: ${breakpoint})`,
  between: (min: string, max: string) => 
    `@media (min-width: ${min}) and (max-width: ${max})`,
} as const;

// ============================================
// THEME MIXINS
// ============================================
export const lightTheme = {
  '--color-background': colors.neutral[0],
  '--color-foreground': colors.neutral[900],
  '--color-muted': colors.neutral[100],
  '--color-muted-foreground': colors.neutral[500],
  '--color-border': colors.neutral[200],
  '--color-input': colors.neutral[0],
  '--color-primary': colors.primary[500],
  '--color-primary-foreground': colors.neutral[0],
} as const;

export const darkTheme = {
  '--color-background': colors.neutral[950],
  '--color-foreground': colors.neutral[50],
  '--color-muted': colors.neutral[800],
  '--color-muted-foreground': colors.neutral[400],
  '--color-border': colors.neutral[700],
  '--color-input': colors.neutral[800],
  '--color-primary': colors.primary[400],
  '--color-primary-foreground': colors.neutral[900],
} as const;