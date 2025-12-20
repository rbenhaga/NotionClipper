// Type definitions for Electron API exposed via preload script

interface PaginatedResult {
  success: boolean;
  pages: any[];
  hasMore: boolean;
  nextCursor?: string;
  error?: string;
  scopeKey?: string; // 🔧 Response tagged with scope for validation
  currentScope?: string; // 🔧 Sent back on SCOPE_MISMATCH for retry
}

interface ElectronAPI {
  // Méthode invoke générique
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  
  // Méthodes spécifiques
  openExternal: (url: string) => Promise<{ success: boolean }>;
  getVersion: () => Promise<string>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // ✅ NOUVELLES MÉTHODES PAGINATION (with scopeKey for cache isolation)
  getPagesPaginated?: (options?: {
    cursor?: string;
    pageSize?: number;
    scopeKey?: string; // 🔧 Required for scope validation
  }) => Promise<PaginatedResult>;
  
  getRecentPagesPaginated?: (options?: {
    cursor?: string;
    limit?: number;
    scopeKey?: string; // 🔧 Required for scope validation
  }) => Promise<PaginatedResult>;
  
  // Legacy namespace (deprecated)
  notion?: {
    getPagesPaginated: (options?: {
      cursor?: string;
      pageSize?: number;
      scopeKey?: string;
    }) => Promise<PaginatedResult>;
    
    getRecentPagesPaginated: (options?: {
      cursor?: string;
      limit?: number;
      scopeKey?: string;
    }) => Promise<PaginatedResult>;
  };

  // ✅ FOCUS MODE API
  focusMode: {
    getState: () => Promise<{
      enabled: boolean;
      activePageId: string | null;
      activePageTitle: string | null;
      lastUsedAt: number | null;
      sessionStartTime: number | null;
      clipsSentCount: number;
    }>;
    enable: (page: { id: string; title: string }) => Promise<void>;
    disable: () => Promise<void>;
    toggle: (page: { id: string; title: string }) => Promise<void>;
    quickSend: () => Promise<{ success: boolean; error?: string }>;
    uploadFiles: (files: File[]) => Promise<{ success: boolean; error?: string }>;
    updateConfig: (config: {
      autoEnableThreshold?: number;
      sessionTimeoutMinutes?: number;
      showNotifications?: boolean;
      bubblePosition?: { x: number; y: number };
    }) => Promise<void>;
    updateBubblePosition: (position: { x: number; y: number }) => Promise<void>;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
