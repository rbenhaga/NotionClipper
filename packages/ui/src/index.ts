// ============================================
// TYPES
// ============================================
export type { NotionPage } from './types';
export type { Notification } from './hooks/useNotifications';

// ============================================
// LAYOUT COMPONENTS
// ============================================
export { Layout } from './components/layout/Layout';
export { Sidebar } from './components/layout/Sidebar';
export { ContentArea } from './components/layout/ContentArea';

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
export type { Tab } from './components/common/TabBar';
export { NotificationManager } from './components/common/NotificationManager';
export { LoadingSpinner } from './components/common/LoadingSpinner';
export { Tooltip } from './components/common/Tooltip';

// ============================================
// EDITOR COMPONENTS
// ============================================
export { ContentEditor } from './components/editor/ContentEditor';
export { DynamicDatabaseProperties } from './components/editor/DynamicDatabaseProperties';
export { DropdownPortal } from './components/editor/DropdownPortal';

// ============================================
// PANEL COMPONENTS
// ============================================
export { ConfigPanel } from './components/panels/ConfigPanel';

// ============================================
// ONBOARDING COMPONENTS
// ============================================
export { Onboarding } from './components/onboarding/Onboarding';

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

// ============================================
// UTILS
// ============================================
export { getPageIcon } from './utils/helpers';

// ============================================
// STYLES
// ============================================
import './styles/index.css';