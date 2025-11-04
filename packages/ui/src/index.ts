// packages/ui/src/index.ts
// 🎯 Professional UI Package - Centralized exports with clear organization

// ============================================
// CORE LIBRARY (selective exports to avoid conflicts)
// ============================================
export * from './lib/constants';
export * from './lib/utils';
export * from './lib/validators';
export * from './lib/errors';
export * from './lib/config';
// Types are exported selectively to avoid conflicts
export type {
  ID,
  Timestamp,
  JSONValue,
  JSONObject,
  JSONArray,
  BaseEntity,
  ApiResponse,
  PaginatedResponse,
  NotionPage,
  NotionWorkspace,
  HistoryEntry,
  QueueItem,
  UseAsyncState,
  UseToggleReturn,
  WindowPreferences,
  BaseComponentProps,
  ModalProps,
  ButtonProps,
  DeepPartial,
  RequiredKeys,
  OptionalKeys,
  Prettify
} from './lib/types';

// ============================================
// COMPONENTS
// ============================================
export * from './components';

// ============================================
// HOOKS
// ============================================
export * from './hooks';

// ============================================
// ASSETS & ICONS
// ============================================
export * as Icons from './assets/icons';

// ============================================
// STYLES
// ============================================
import './styles/index.css';

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================
// These will be deprecated in future versions
export { getPageIcon } from './utils/helpers';