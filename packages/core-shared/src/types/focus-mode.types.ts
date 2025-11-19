/**
 * État du Mode Focus
 */
export interface FocusModeState {
  enabled: boolean;
  activePageId: string | null;
  activePageTitle: string | null;
  lastUsedAt: number | null;
  sessionStartTime: number | null;
  clipsSentCount: number;
}

/**
 * Configuration du Mode Focus
 */
export interface FocusModeConfig {
  autoEnableThreshold: number;
  sessionTimeoutMinutes: number;
  showNotifications: boolean;
  bubblePosition: { x: number; y: number };
}

/**
 * Événements du Mode Focus
 */
export interface FocusModeEvents {
  'focus-mode:enabled': { 
    pageId: string; 
    pageTitle: string | null 
  };
  'focus-mode:disabled': { 
    pageTitle: string | null; 
    clipsSent: number; 
    duration: number;
    stats: any;
  };
  'focus-mode:clip-sent': { 
    count: number; 
    pageTitle: string | null;
    // 🔥 NEW: Additional data for history tracking
    content?: any;
    pageId?: string | null;
    sectionId?: string;
    timestamp?: number;
    status?: 'success' | 'error';
  };
  'focus-mode:notification': {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
  };
  'focus-mode:config-updated': FocusModeConfig;
  'focus-mode:bubble-position-updated': { x: number; y: number };
  'focus-mode:page-usage': { pageId: string; pageTitle: string };
}

/**
 * Options pour l'envoi de contenu
 */
export interface SendContentOptions {
  format: 'text' | 'html' | 'markdown' | 'image';
  source: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Résultat d'envoi de contenu
 */
export interface SendContentResult {
  success: boolean;
  error?: string;
  pageId?: string;
  blockId?: string;
}

/**
 * Page Notion (définition minimale pour le Focus Mode)
 */
export interface FocusModeNotionPage {
  id: string;
  title: string | null;
  icon?: string | null;
  cover?: string | null;
  url?: string;
  lastEditedTime?: string;
  createdTime?: string;
}

/**
 * Statistiques du Mode Focus
 */
export interface FocusModeStats {
  totalSessions: number;
  totalClips: number;
  averageClipsPerSession: number;
  totalDuration: number;
  lastUsed: number | null;
  mostUsedPages: Array<{
    pageId: string;
    pageTitle: string;
    count: number;
  }>;
}