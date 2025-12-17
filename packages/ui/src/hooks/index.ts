// packages/ui/src/hooks/index.ts
// 🎯 Centralized hooks exports with clear categorization

// ============================================
// CORE APPLICATION HOOKS
// ============================================
export { useAppState } from './core/useAppState';
export { useAppInitialization } from './core/useAppInitialization';

// ============================================
// UI STATE HOOKS
// ============================================
export { useNotifications } from './ui/useNotifications';
export { useTheme } from './ui/useTheme';
export { useWindowPreferences } from './ui/useWindowPreferences';
export { useKeyboardShortcuts, DEFAULT_SHORTCUTS, formatShortcut } from './ui/useKeyboardShortcuts';
export type { KeyboardShortcut, KeyboardShortcutsConfig } from './ui/useKeyboardShortcuts';

// ============================================
// DATA MANAGEMENT HOOKS
// ============================================
export { useConfig } from './data/useConfig';
export { usePages } from './data/usePages';
export { useClipboard } from './data/useClipboard';
export { useSuggestions } from './data/useSuggestions';
export { useHistory } from './data/useHistory';
export { useQueue } from './data/useQueue';
export { useFocusMode } from './data/useFocusMode';
export type { FocusModeState, UseFocusModeReturn } from './data/useFocusMode';

// ============================================
// INTERACTION HOOKS
// ============================================
export { useContentHandlers } from './interactions/useContentHandlers';
export { usePageHandlers } from './interactions/usePageHandlers';
export { useFileUpload } from './interactions/useFileUpload';

// ============================================
// UTILITY HOOKS
// ============================================
export { useNetworkStatus } from './utils/useNetworkStatus';
export { usePagesProgress } from './utils/usePagesProgress';

// ============================================
// TOC (TABLE OF CONTENTS) HOOKS
// ============================================
export { useTOCState } from './useTOCState';
export type { UseTOCStateReturn } from './useTOCState';
export { useMultiPageInsertion } from './useMultiPageInsertion';
export type { UseMultiPageInsertionOptions, UseMultiPageInsertionReturn } from './useMultiPageInsertion';

// ============================================
// PERFORMANCE MONITORING HOOKS (Req 11.1, 11.2, 11.3)
// ============================================
export { usePerformanceMonitor, measureAsync, measureSync, PERFORMANCE_TARGETS } from './usePerformanceMonitor';
export type { 
  PerformanceMeasurement, 
  UsePerformanceMonitorOptions, 
  UsePerformanceMonitorReturn 
} from './usePerformanceMonitor';

// ============================================
// COMMON HOOK TYPES
// ============================================
export type { UseConfigReturn, ClipperConfig } from './data/useConfig';
export type { UseClipboardReturn, ClipboardData } from './data/useClipboard';
export type { UsePagesReturn } from './data/usePages';
export type { UseSuggestionsReturn, SuggestionResult } from './data/useSuggestions';
export type { UseWindowPreferencesReturn } from './ui/useWindowPreferences';
export type { UseThemeReturn, Theme } from './ui/useTheme';
export type { UseFileUploadOptions, UploadProgress, FileUploadState, UploadMethod } from './interactions/useFileUpload';