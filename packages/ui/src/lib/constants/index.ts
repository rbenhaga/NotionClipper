// packages/ui/src/lib/constants/index.ts
// 🎯 Application constants and configuration values

// ============================================
// UI CONSTANTS
// ============================================
export const UI_CONSTANTS = {
  // Animation durations (ms)
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000,
  },
  
  // Breakpoints (px)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },
  
  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
  },
  
  // File size limits
  FILE_SIZE: {
    MAX_IMAGE: 5 * 1024 * 1024, // 5MB
    MAX_VIDEO: 20 * 1024 * 1024, // 20MB
    MAX_DOCUMENT: 10 * 1024 * 1024, // 10MB
  },
} as const;

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
export const KEYBOARD_SHORTCUTS = {
  SEND_CONTENT: { key: 'Enter', modifiers: ['cmd', 'shift'] },
  TOGGLE_MINIMALIST: { key: 'm', modifiers: ['cmd', 'shift'] },
  CLEAR_CLIPBOARD: { key: 'k', modifiers: ['cmd', 'shift'] },
  ATTACH_FILE: { key: 'u', modifiers: ['cmd', 'shift'] },
  TOGGLE_SIDEBAR: { key: 'b', modifiers: ['cmd'] },
  TOGGLE_PREVIEW: { key: 'p', modifiers: ['cmd'] },
  FOCUS_SEARCH: { key: 'f', modifiers: ['cmd'] },
  SHOW_SHORTCUTS: { key: '?', modifiers: ['cmd'] },
  CLOSE_WINDOW: { key: 'w', modifiers: ['cmd'] },
  MINIMIZE_WINDOW: { key: 'm', modifiers: ['cmd'] },
  TOGGLE_PIN: { key: 'p', modifiers: ['cmd', 'shift'] },
} as const;

// ============================================
// NOTIFICATION TYPES
// ============================================
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// ============================================
// CONTENT TYPES
// ============================================
export const CONTENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  TABLE: 'table',
  CODE: 'code',
  JSON: 'json',
  MARKDOWN: 'markdown',
  MIXED: 'mixed',
} as const;

// ============================================
// THEME CONSTANTS
// ============================================
export const THEME_CONSTANTS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// ============================================
// VALIDATION LIMITS
// ============================================
export const VALIDATION_LIMITS = {
  MAX_CLIPBOARD_LENGTH: 10000,
  MAX_SEARCH_QUERY_LENGTH: 100,
  MAX_PAGE_TITLE_LENGTH: 200,
  MIN_PASSWORD_LENGTH: 8,
  MAX_HISTORY_ENTRIES: 1000,
  MAX_QUEUE_ENTRIES: 100,
} as const;