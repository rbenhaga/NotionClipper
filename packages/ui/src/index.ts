// packages/ui/src/index.ts - CORRIGÉ

// ============================================
// TYPES
// ============================================
export type { NotionPage } from './types';
export type { Notification } from './hooks/useNotifications';
export type * from './types/window.types';

// ============================================
// LAYOUT COMPONENTS
// ============================================
export { Layout } from './components/layout/Layout';
export { Header } from './components/layout/Header';
export type { HeaderProps } from './components/layout/Header';
export { Sidebar } from './components/layout/Sidebar';
export { ContentArea } from './components/layout/ContentArea';
export { ResizableLayout } from './components/layout/ResizableLayout';
export { MinimalistView } from './components/layout/MinimalistView';
export { DynamicIsland } from './components/layout/DynamicIsland';
export { ActionBar } from './components/layout/ActionBar';
export type { Action } from './components/layout/ActionBar';

// ============================================
// PAGE COMPONENTS
// ============================================
export { PageCard } from './components/pages/PageCard';
export { PageList } from './components/pages/PageList';

// ============================================
// COMMON COMPONENTS
// ============================================
export { TabIcon } from './components/common/TabIcon';
export { LoadingState } from './components/common/LoadingState';
export { SearchBar } from './components/common/SearchBar';
export { TabBar } from './components/common/TabBar';
export { ErrorBoundary } from './components/common/ErrorBoundary';
export { SkeletonPageCard, SkeletonPageList, SkeletonClipboard } from './components/common/SkeletonLoader';
export type { Tab } from './components/common/TabBar';
export { NotificationManager } from './components/common/NotificationManager';
export { LoadingSpinner } from './components/common/LoadingSpinner';
export { Tooltip } from './components/common/Tooltip';

// ============================================
// HISTORY & QUEUE COMPONENTS
// ============================================
export { HistoryCard } from './components/history/HistoryCard';
export { QueueCard } from './components/queue/QueueCard';

// ============================================
// EDITOR COMPONENTS
// ============================================
export { ContentEditor } from './components/editor/ContentEditor';
export { DynamicDatabaseProperties } from './components/editor/DynamicDatabaseProperties';
export { DropdownPortal } from './components/editor/DropdownPortal';
export { ImagePreview } from './components/editor/ImagePreview';
export { FileUploadPanel } from './components/editor/FileUploadPanel';



// ============================================
// PANEL COMPONENTS
// ============================================
export { ConfigPanel } from './components/panels/ConfigPanel';
export { HistoryPanel } from './components/panels/HistoryPanel';
export { QueuePanel } from './components/panels/QueuePanel';





// ============================================
// ONBOARDING COMPONENTS
// ============================================
export { Onboarding } from './components/onboarding/Onboarding';

// ============================================
// PERMISSION COMPONENTS
// ============================================
export { ClipboardPermissionPopup, ClipboardPermissionStep } from './components/permissions/ClipboardPermissionPopup';

// ============================================
// ICONS & ASSETS
// ============================================
export * as Icons from './assets/icons';

// ============================================
// HOOKS
// ============================================
export { useNotifications } from './hooks/useNotifications';
export { useConfig } from './hooks/useConfig';
export type { ClipperConfig, UseConfigReturn } from './hooks/useConfig';
export { useClipboard } from './hooks/useClipboard';
export type { ClipboardData, UseClipboardReturn } from './hooks/useClipboard';
export { usePages } from './hooks/usePages';
export type { UsePagesReturn } from './hooks/usePages';

export { useSuggestions } from './hooks/useSuggestions';
export type {
  SuggestionResult,
  UseSuggestionsReturn
} from './hooks/useSuggestions';

export { useWindowPreferences } from './hooks/useWindowPreferences';
export type { UseWindowPreferencesReturn } from './hooks/useWindowPreferences';

// 🆕 NEW HOOKS
export { useFileUpload } from './hooks/useFileUpload';
export type { UseFileUploadOptions, UploadProgress, FileUploadState, UploadMethod } from './hooks/useFileUpload';
export { useHistory } from './hooks/useHistory';
export { useQueue } from './hooks/useQueue';
export { useNetworkStatus } from './hooks/useNetworkStatus';

// ============================================
// UTILS
// ============================================
export { getPageIcon } from './utils/helpers';

// ============================================
// STYLES
// ============================================
import './styles/index.css';