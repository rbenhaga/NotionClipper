// packages/ui/src/components/index.ts
// 🎯 Centralized component exports with clear categorization

// ============================================
// LAYOUT COMPONENTS
// ============================================
export { Layout } from './layout/Layout';
export { Header } from './layout/Header';
export type { HeaderProps } from './layout/Header';
export { Sidebar } from './layout/Sidebar';
export { ContentArea } from './layout/ContentArea';
export { ResizableLayout } from './layout/ResizableLayout';
export { MinimalistView } from './layout/MinimalistView';

// ============================================
// COMMON UI COMPONENTS
// ============================================
export { TabIcon } from './common/TabIcon';
export { LoadingState } from './common/LoadingState';
export { SearchBar } from './common/SearchBar';
export { TabBar } from './common/TabBar';
export { ErrorBoundary } from './common/ErrorBoundary';
export { SkeletonPageCard, SkeletonPageList, SkeletonClipboard } from './common/SkeletonLoader';
export type { Tab } from './common/TabBar';
export { NotificationManager } from './common/NotificationManager';
export { LoadingSpinner } from './common/LoadingSpinner';
export { Tooltip } from './common/Tooltip';
export { ShortcutsModal } from './common/ShortcutsModal';
export { QueueStatus } from './common/QueueStatus';
export { ConnectionStatus } from './common/ConnectionStatus';
export { ConnectionStatusIndicator } from './common/ConnectionStatusIndicator';
export { MotionDiv, MotionButton, MotionMain, MotionAside } from './common/MotionWrapper';

// ============================================
// SPECIALIZED COMPONENTS
// ============================================
// Pages
export { PageCard } from './pages/PageCard';
export { PageList } from './pages/PageList';

// Editor
export { ContentEditor } from './editor/ContentEditor';
export { DynamicDatabaseProperties } from './editor/DynamicDatabaseProperties';
export { DropdownPortal } from './editor/DropdownPortal';
export { ImagePreview } from './editor/ImagePreview';
export { FileUploadZone } from './editor/FileUploadZone';
export { FileUploadModal } from './editor/FileUploadModal';
export type { FileUploadConfig, UploadMode } from './editor/FileUploadModal';
export { FileCarousel } from './editor/FileCarousel';
export type { AttachedFile } from './editor/FileCarousel';
export { TableOfContents } from './editor/TableOfContents';
export { DestinationsCarousel } from './editor/DestinationsCarousel';

// Panels
export { ConfigPanel } from './panels/ConfigPanel';
export { UnifiedActivityPanel } from './panels/UnifiedActivityPanel';

// Workspace
export { UnifiedWorkspace } from './workspace/UnifiedWorkspace';

// Onboarding
export { Onboarding } from './onboarding/Onboarding';

// Authentication
export { AuthStatusChecker } from './auth/AuthStatusChecker';

// Permissions
export { ClipboardPermissionPopup, ClipboardPermissionStep } from './permissions/ClipboardPermissionPopup';

// Unified Components
export { UnifiedQueueHistory } from './unified/UnifiedQueueHistory';
export type { UnifiedEntry } from './unified/UnifiedQueueHistory';