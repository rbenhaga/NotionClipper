/**
 * Global type declarations for i18n package
 */

interface Window {
  electronAPI?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => void;
    removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  };
}

declare global {
  interface Navigator {
    language: string;
  }
}

export {};
