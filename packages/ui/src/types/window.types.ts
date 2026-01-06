// packages/ui/src/types/window.types.ts

import type { NotionPage } from '../lib/types';

/**
 * Types pour les préférences de fenêtre et le layout
 */

/**
 * Préférences de fenêtre
 */
export interface WindowPreferences {
  /** La fenêtre est-elle épinglée (always on top) */
  isPinned: boolean;
  /** Mode minimaliste activé */
  isMinimalist: boolean;
  /** Opacité de la fenêtre (0.3 - 1.0) */
  opacity?: number;
  /** Position de la fenêtre */
  position?: {
    x: number;
    y: number;
  };
  /** Taille de la fenêtre */
  size?: {
    width: number;
    height: number;
  };
}

/**
 * Tailles des panels redimensionnables
 */
export interface PanelSizes {
  /** Taille du panel gauche (en %) */
  left: number;
  /** Taille du panel droit (en %) */
  right: number;
}

/**
 * Configuration du ResizableLayout
 */
export interface ResizableLayoutConfig {
  /** Taille par défaut du panel gauche (%) */
  defaultLeftSize: number;
  /** Taille minimale du panel gauche (%) */
  minLeftSize: number;
  /** Taille minimale du panel droit (%) */
  minRightSize: number;
  /** Clé de stockage localStorage */
  storageKey: string;
}

/**
 * Props pour MinimalistView
 */
export interface MinimalistViewProps {
  clipboard: ClipboardData | null;
  editedClipboard: any; // ✅ FIX: Même type que ContentEditor (objet complet)
  onEditContent: (content: any) => void; // ✅ FIX: Même signature que ContentEditor
  selectedPage: NotionPage | null;
  pages: NotionPage[];
  onPageSelect: (page: NotionPage) => void;
  onSend: () => void;
  onClearClipboard: () => void;
  onExitMinimalist: () => void;
  sending: boolean;
  canSend: boolean;
}

/**
 * Props pour ResizableLayout
 */
export interface ResizableLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
  onResize?: (sizes: number[]) => void;
  storageKey?: string;
}

/**
 * API Electron pour les contrôles de fenêtre
 */
export interface ElectronWindowAPI {
  /** Basculer l'état épinglé */
  togglePin: () => Promise<WindowControlResult>;
  /** Obtenir l'état épinglé actuel */
  getPinState: () => Promise<WindowStateResult>;
  /** Définir la taille pour le mode minimaliste */
  setMinimalistSize: (isMinimalist: boolean) => Promise<WindowControlResult>;
  /** Définir l'opacité de la fenêtre */
  setOpacity: (opacity: number) => Promise<WindowControlResult>;
  /** Minimiser la fenêtre */
  minimizeWindow: () => Promise<void>;
  /** Maximiser/restaurer la fenêtre */
  maximizeWindow: () => Promise<void>;
  /** Fermer la fenêtre */
  closeWindow: () => Promise<void>;
}

/**
 * Résultat d'un contrôle de fenêtre
 */
export interface WindowControlResult {
  success: boolean;
  error?: string;
  isPinned?: boolean;
  isMinimalist?: boolean;
  opacity?: number;
}

/**
 * Résultat d'une requête d'état de fenêtre
 */
export interface WindowStateResult extends WindowControlResult {
  isPinned: boolean;
}

/**
 * Données du clipboard
 */
export interface ClipboardData {
  text?: string;
  html?: string;
  images?: string[];
  timestamp?: number;
}

/**
 * Page Notion
 * Re-export from lib/types to avoid duplication
 */
export type { NotionPage } from '../lib/types';

/**
 * Extension de l'interface Window pour TypeScript
 */
declare global {
  interface Window {
    electronAPI?: {
      // Window controls
      togglePin?: () => Promise<WindowControlResult>;
      getPinState?: () => Promise<WindowStateResult>;
      setMinimalistSize?: (isMinimalist: boolean) => Promise<WindowControlResult>;
      setOpacity?: (opacity: number) => Promise<WindowControlResult>;
      minimizeWindow?: () => Promise<void>;
      maximizeWindow?: () => Promise<void>;
      closeWindow?: () => Promise<void>;

      // ✅ Nouveaux contrôles de fenêtre avec gestion de position
      toggleMinimalistMode?: (isMinimalist: boolean) => Promise<boolean>;
      saveWindowPosition?: () => Promise<void>;

      // IPC-like (generic)
      invoke?: (channel: string, ...args: any[]) => Promise<any>;
      send?: (channel: string, ...args: any[]) => void;
      on?: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener?: (channel: string, callback: Function) => void;
      removeAllListeners?: (channel: string) => void;

      // Config
      getConfig?: () => Promise<any>;
      saveConfig?: (config: any) => Promise<any>;
      getValue?: (key: string) => Promise<any>;
      setValue?: (data: any) => Promise<any>;
      updateConfig?: (updates: any) => Promise<any>;
      validateToken?: (token: string) => Promise<any>;

      // Notion / Pages
      getPages?: (forceRefresh?: boolean) => Promise<any>;
      sendToNotion?: (data: any) => Promise<any>;
      getHybridSuggestions?: (data: any) => Promise<any>;
      searchPages?: (query: string) => Promise<any>;
      getPagesPaginated?: (options?: { cursor?: string; pageSize?: number; scopeKey?: string }) => Promise<any>;
      getRecentPagesPaginated?: (options?: { cursor?: string; limit?: number; scopeKey?: string }) => Promise<any>;

      // Clipboard
      getClipboard?: () => Promise<any>;
      setClipboard?: (data: any) => Promise<any>;
      clearClipboard?: () => Promise<any>;
      onClipboardChanged?: (callback: (event: any, data: any) => void) => void;

      // Favorites
      getFavorites?: () => Promise<any>;
      toggleFavorite?: (pageId: string) => Promise<any>;

      // Nested APIs
      file?: Record<string, (...args: any[]) => Promise<any>>;
      history?: Record<string, (...args: any[]) => Promise<any>>;
      queue?: Record<string, (...args: any[]) => Promise<any>>;
      focusMode?: Record<string, (...args: any[]) => Promise<any>>;

      // Allow any other property without blocking typecheck
      [key: string]: any;
    };
  }
}

export { };