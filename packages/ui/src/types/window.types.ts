// packages/ui/src/types/window.types.ts

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
 */
export interface NotionPage {
  id: string;
  title: string;
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  parent?: {
    type: string;
    [key: string]: any;
  };
  last_edited_time?: string;
  created_time?: string;
}

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
      
      // Autres APIs existantes...
      getPages?: (forceRefresh: boolean) => Promise<any>;
      getConfig?: () => Promise<any>;
      updateConfig?: (updates: any) => Promise<any>;
      validateToken?: (token: string) => Promise<any>;
      getClipboard?: () => Promise<any>;
      clearClipboard?: () => Promise<any>;
      sendToNotion?: (data: any) => Promise<any>;
      getFavorites?: () => Promise<any>;
      toggleFavorite?: (pageId: string) => Promise<any>;
      getHybridSuggestions?: (data: any) => Promise<any>;
      onClipboardChanged?: (callback: (event: any, data: any) => void) => void;
      removeListener?: (channel: string, callback: Function) => void;
      
      // 🆕 Nouvelles APIs
      invoke?: (channel: string, ...args: any[]) => Promise<any>;
      on?: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export {};