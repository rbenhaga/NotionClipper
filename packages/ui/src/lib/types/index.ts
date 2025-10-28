// packages/ui/src/lib/types/index.ts
// 🎯 Core type definitions and interfaces

// ============================================
// BASE TYPES
// ============================================
export type ID = string;
export type Timestamp = number;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

// ============================================
// COMMON INTERFACES
// ============================================
export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// UI STATE TYPES
// ============================================
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type SendingStatus = 'idle' | 'processing' | 'success' | 'error';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type ThemeMode = 'light' | 'dark' | 'system';

// ============================================
// CONTENT TYPES
// ============================================
export interface ClipboardContent {
  id?: ID;
  text?: string;
  html?: string;
  image?: string;
  type: 'text' | 'image' | 'html' | 'mixed';
  metadata?: {
    source?: string;
    timestamp?: Timestamp;
    dimensions?: { width: number; height: number };
    size?: number;
  };
}

export interface AttachedFile {
  id: ID;
  file?: File;
  url?: string;
  name: string;
  type: string;
  size: number;
  status?: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
}

// ============================================
// NOTION TYPES
// ============================================
export interface NotionPage {
  id: ID;
  title: string;
  icon?: string | {
    type?: string;
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  cover?: string | {
    type?: string;
    external?: { url: string };
    file?: { url: string };
  };
  url?: string;
  type?: 'page' | 'database' | string;
  object?: string;
  parent?: {
    type: string;
    id?: ID;
    [key: string]: any;
  };
  parent_id?: string;
  parent_title?: string;
  parent_type?: string;
  properties?: Record<string, any>;
  lastEditedTime?: string;
  last_edited_time?: string; // Support both formats
  last_edited?: string;
  createdTime?: string;
  created_time?: string;
  archived?: boolean;
  in_trash?: boolean;
}

export interface NotionWorkspace {
  id: ID;
  name: string;
  icon?: string;
  domain?: string;
}

// ============================================
// HISTORY & QUEUE TYPES
// ============================================
export interface HistoryEntry extends BaseEntity {
  type: 'clipboard' | 'file' | 'url' | 'mixed';
  status: 'success' | 'failed' | 'pending';
  content: {
    raw: string;
    preview: string;
    type: string;
    filesCount?: number;
  };
  page: {
    id: ID;
    title: string;
    icon?: string;
  };
  sentAt: Timestamp;
  retryCount?: number;
  lastRetry?: Timestamp;
  error?: string;
}

export interface QueueItem extends BaseEntity {
  type: 'clipboard' | 'file' | 'url';
  status: 'queued' | 'processing' | 'failed';
  priority: 'low' | 'normal' | 'high';
  content: any;
  pageId: ID;
  retryCount?: number;
  lastRetry?: Timestamp;
  error?: string;
}

// ============================================
// CONFIGURATION TYPES
// ============================================
export interface ClipperConfig {
  // Authentication
  notionToken?: string;
  notionToken_encrypted?: string;
  onboardingCompleted?: boolean;
  
  // Workspace
  workspaceName?: string;
  workspaceIcon?: string;
  
  // UI Preferences
  theme?: ThemeMode;
  minimalistMode?: boolean;
  sidebarCollapsed?: boolean;
  
  // Window State
  windowState?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized?: boolean;
    isPinned?: boolean;
  };
  
  // Behavior
  autoSend?: boolean;
  clipboardMonitoring?: boolean;
  notifications?: boolean;
  
  // Advanced
  [key: string]: any;
}

// ============================================
// HOOK RETURN TYPES
// ============================================
export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseToggleReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
}

// ============================================
// EVENT TYPES
// ============================================
export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  key: string;
  modifiers: string[];
  action: () => void;
  category?: string;
}

export interface WindowPreferences {
  isPinned: boolean;
  isMinimalist: boolean;
  opacity: number;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// ============================================
// UTILITY TYPES
// ============================================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// ============================================
// RE-EXPORTS FROM EXISTING TYPES
// ============================================
export * from '../../types';