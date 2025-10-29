// Type definitions for Electron API exposed via preload script

interface PaginatedResult {
  success: boolean;
  pages: any[];
  hasMore: boolean;
  nextCursor?: string;
  error?: string;
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
  
  // ✅ NOUVELLES MÉTHODES PAGINATION
  notion: {
    getPagesPaginated: (options?: {
      cursor?: string;
      pageSize?: number;
    }) => Promise<PaginatedResult>;
    
    getRecentPagesPaginated: (options?: {
      cursor?: string;
      limit?: number;
    }) => Promise<PaginatedResult>;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
