// Type definitions for Electron API exposed via preload script

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
}

interface Window {
  electronAPI: ElectronAPI;
}
