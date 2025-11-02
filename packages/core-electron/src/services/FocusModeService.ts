// packages/core-electron/src/services/FocusModeService.ts
import { EventEmitter } from 'events';
import type { NotionPage } from '@notion-clipper/core-shared';

export interface FocusModeState {
  enabled: boolean;
  activePageId: string | null;
  activePageTitle: string | null;
  lastUsedAt: number | null;
  sessionStartTime: number | null;
  clipsSentCount: number;
}

export interface FocusModeConfig {
  autoEnableThreshold: number; // Nombre de clips vers la même page pour activer auto
  sessionTimeoutMinutes: number; // Durée avant désactivation auto (inactivité)
  showNotifications: boolean;
  bubblePosition: { x: number; y: number };
}

export class FocusModeService extends EventEmitter {
  private state: FocusModeState;
  private config: FocusModeConfig;
  private sessionTimeout: NodeJS.Timeout | null = null;

  constructor(initialConfig?: Partial<FocusModeConfig>) {
    super();
    
    this.config = {
      autoEnableThreshold: 3,
      sessionTimeoutMinutes: 30,
      showNotifications: true,
      bubblePosition: { x: -1, y: -1 }, // -1 = position par défaut
      ...initialConfig
    };

    this.state = {
      enabled: false,
      activePageId: null,
      activePageTitle: null,
      lastUsedAt: null,
      sessionStartTime: null,
      clipsSentCount: 0
    };
  }

  // ============================================
  // GETTERS
  // ============================================
  
  getState(): FocusModeState {
    return { ...this.state };
  }

  getConfig(): FocusModeConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  getActivePage(): { id: string | null; title: string | null } {
    return {
      id: this.state.activePageId,
      title: this.state.activePageTitle
    };
  }

  // ============================================
  // ACTIVATION / DÉSACTIVATION
  // ============================================

  enable(page: NotionPage): void {
    const wasEnabled = this.state.enabled;
    
    this.state = {
      ...this.state,
      enabled: true,
      activePageId: page.id,
      activePageTitle: page.title || 'Page sans titre',
      sessionStartTime: Date.now(),
      clipsSentCount: 0,
      lastUsedAt: Date.now()
    };

    this.startSessionTimeout();

    this.emit('focus-mode:enabled', {
      pageId: page.id,
      pageTitle: page.title
    });

    if (!wasEnabled && this.config.showNotifications) {
      this.emit('focus-mode:notification', {
        type: 'info',
        title: 'Mode Focus activé',
        message: `Clips envoyés directement vers "${page.title}"`,
        duration: 4000
      });
    }

    console.log('[FocusMode] ✅ Enabled for page:', page.title);
  }

  disable(): void {
    if (!this.state.enabled) return;

    const stats = {
      pageTitle: this.state.activePageTitle,
      clipsSent: this.state.clipsSentCount,
      duration: this.state.sessionStartTime 
        ? Math.round((Date.now() - this.state.sessionStartTime) / 1000 / 60) 
        : 0
    };

    this.state = {
      enabled: false,
      activePageId: null,
      activePageTitle: null,
      lastUsedAt: null,
      sessionStartTime: null,
      clipsSentCount: 0
    };

    this.clearSessionTimeout();

    this.emit('focus-mode:disabled', stats);

    if (this.config.showNotifications) {
      this.emit('focus-mode:notification', {
        type: 'info',
        title: 'Mode Focus désactivé',
        message: `${stats.clipsSent} clip(s) envoyé(s) • ${stats.duration} min`,
        duration: 3000
      });
    }

    console.log('[FocusMode] ❌ Disabled. Stats:', stats);
  }

  toggle(page?: NotionPage): void {
    if (this.state.enabled) {
      this.disable();
    } else if (page) {
      this.enable(page);
    }
  }

  // ============================================
  // GESTION DES CLIPS
  // ============================================

  recordClip(): void {
    if (!this.state.enabled) return;

    this.state.clipsSentCount++;
    this.state.lastUsedAt = Date.now();
    
    this.resetSessionTimeout();

    this.emit('focus-mode:clip-sent', {
      count: this.state.clipsSentCount,
      pageTitle: this.state.activePageTitle
    });

    console.log(`[FocusMode] 📎 Clip sent (${this.state.clipsSentCount})`);
  }

  // ============================================
  // DÉTECTION AUTOMATIQUE
  // ============================================

  trackPageUsage(pageId: string, pageTitle: string): void {
    // Si on envoie plusieurs fois vers la même page, suggérer le mode focus
    if (this.state.enabled && this.state.activePageId === pageId) {
      this.recordClip();
      return;
    }

    // Logique de détection automatique (à implémenter avec historique)
    // Pour l'instant, juste émettre un événement
    this.emit('focus-mode:page-usage', { pageId, pageTitle });
  }

  // ============================================
  // TIMEOUT SESSION
  // ============================================

  private startSessionTimeout(): void {
    this.clearSessionTimeout();
    
    const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;
    
    this.sessionTimeout = setTimeout(() => {
      if (this.state.enabled) {
        console.log('[FocusMode] ⏰ Session timeout, disabling...');
        this.disable();
      }
    }, timeoutMs);
  }

  private resetSessionTimeout(): void {
    if (this.state.enabled) {
      this.startSessionTimeout();
    }
  }

  private clearSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  updateConfig(config: Partial<FocusModeConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('focus-mode:config-updated', this.config);
    console.log('[FocusMode] Config updated:', config);
  }

  updateBubblePosition(x: number, y: number): void {
    this.config.bubblePosition = { x, y };
    this.emit('focus-mode:bubble-position-updated', { x, y });
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  destroy(): void {
    this.clearSessionTimeout();
    this.removeAllListeners();
    console.log('[FocusMode] Service destroyed');
  }
}