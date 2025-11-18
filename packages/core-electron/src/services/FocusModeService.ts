// packages/core-electron/src/services/FocusModeService.ts
import { EventEmitter } from 'events';
import type { NotionPage } from '@notion-clipper/core-shared';

export interface FocusModeState {
  enabled: boolean;
  activePageId: string | null; // 🔄 Gardé pour compatibilité (page principale)
  activePageTitle: string | null; // 🔄 Gardé pour compatibilité
  targetPages: NotionPage[]; // 🔥 NOUVEAU: Support multi-pages
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
  private hasShownIntro: boolean = false; // 🔧 FIX: Tracker pour l'intro
  private timeTrackingInterval: NodeJS.Timeout | null = null; // 🆕 Time tracking interval
  private minutesTracked: number = 0; // 🆕 Track minutes elapsed
  private trackingStartTime: number = 0; // 🔒 SECURITY: Track start time to calculate partial minutes

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
      targetPages: [], // 🔥 NOUVEAU: Initialiser le tableau de pages
      lastUsedAt: null,
      sessionStartTime: null,
      clipsSentCount: 0
    };

    // 🔧 FIX: Charger l'état de l'intro depuis le stockage local
    this.loadIntroState();
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
    const wasSamePage = this.state.activePageId === page.id;
    
    // Si déjà activé pour la même page, ne rien faire et ne pas émettre d'événement
    if (wasEnabled && wasSamePage) {
      console.log('[FocusMode] Already enabled for this page, skipping event emission');
      return;
    }
    
    this.state = {
      ...this.state,
      enabled: true,
      activePageId: page.id,
      activePageTitle: page.title || 'Page sans titre',
      targetPages: [page], // 🔥 NOUVEAU: Initialiser avec la page principale
      sessionStartTime: Date.now(),
      clipsSentCount: 0,
      lastUsedAt: Date.now()
    };

    this.startSessionTimeout();
    this.startTimeTracking(); // 🆕 Start time tracking

    // Émettre l'événement seulement si ce n'était pas déjà activé
    if (!wasEnabled) {
      console.log('[FocusMode] Emitting focus-mode:enabled event');
      this.emit('focus-mode:enabled', {
        pageId: page.id,
        pageTitle: page.title
      });

      // 🔧 FIX: Afficher l'intro seulement la première fois
      if (!this.hasShownIntro) {
        this.emit('focus-mode:show-intro', {
          pageId: page.id,
          pageTitle: page.title
        });
        this.hasShownIntro = true;
        this.saveIntroState();
      }
    } else {
      console.log('[FocusMode] Already enabled, not emitting event');
    }

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

  // 🔥 NOUVEAU: Support multi-pages
  setTargetPages(pages: NotionPage[]): void {
    if (!this.state.enabled) {
      console.warn('[FocusMode] Cannot set target pages when focus mode is disabled');
      return;
    }

    this.state.targetPages = [...pages];
    
    // Maintenir la compatibilité avec l'ancienne API
    if (pages.length > 0) {
      this.state.activePageId = pages[0].id;
      this.state.activePageTitle = pages[0].title || 'Page sans titre';
    }

    console.log(`[FocusMode] ✅ Target pages updated: ${pages.length} pages`);
    console.log('[FocusMode] Pages:', pages.map(p => p.title).join(', '));

    // Émettre un événement pour notifier le changement
    this.emit('focus-mode:target-pages-changed', {
      pages: pages,
      count: pages.length
    });
  }

  // 🔥 NOUVEAU: Obtenir les pages cibles
  getTargetPages(): NotionPage[] {
    return [...this.state.targetPages];
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
      targetPages: [], // 🔥 NOUVEAU: Ajouter targetPages ici aussi
      lastUsedAt: null,
      sessionStartTime: null,
      clipsSentCount: 0
    };

    this.clearSessionTimeout();
    this.stopTimeTracking(); // 🆕 Stop time tracking

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

    // 🔒 SECURITY: Emit quota tracking event for clips
    this.emit('focus-mode:track-clip', {
      clips: 1,
      totalClips: this.state.clipsSentCount,
      pageId: this.state.activePageId,
      pageTitle: this.state.activePageTitle
    });

    console.log(`[FocusMode] 📎 Clip sent (${this.state.clipsSentCount})`);
  }

  // 🔒 SECURITY: Track file uploads for quota
  trackFileUpload(fileCount: number): void {
    if (!this.state.enabled) return;

    this.emit('focus-mode:track-files', {
      files: fileCount,
      pageId: this.state.activePageId,
      pageTitle: this.state.activePageTitle
    });

    console.log(`[FocusMode] 📎 ${fileCount} file(s) uploaded`);
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
  // TIME TRACKING (1min intervals)
  // ============================================

  private startTimeTracking(): void {
    this.stopTimeTracking(); // Clear any existing interval
    this.minutesTracked = 0;
    this.trackingStartTime = Date.now(); // 🔒 SECURITY: Store start time

    console.log('[FocusMode] Starting time tracking (1min intervals)');

    this.timeTrackingInterval = setInterval(() => {
      this.minutesTracked++;
      console.log(`[FocusMode] Tracking usage: ${this.minutesTracked} minute(s)`);

      // Emit event to track usage
      this.emit('focus-mode:track-usage', {
        minutes: 1,
        totalMinutes: this.minutesTracked,
        pageId: this.state.activePageId,
        pageTitle: this.state.activePageTitle
      });
    }, 60000); // Every 60 seconds = 1 minute
  }

  private stopTimeTracking(): void {
    if (this.timeTrackingInterval) {
      clearInterval(this.timeTrackingInterval);
      this.timeTrackingInterval = null;

      // 🔒 SECURITY FIX: Track any remaining partial time to prevent "cracking" by closing before 1 minute
      if (this.trackingStartTime > 0) {
        const elapsedMs = Date.now() - this.trackingStartTime;
        const elapsedMinutes = elapsedMs / 60000; // Convert to minutes
        const alreadyTrackedMinutes = this.minutesTracked;
        const remainingMinutes = elapsedMinutes - alreadyTrackedMinutes;

        // If there's any remaining time (even partial), track it as 1 minute (round up for security)
        if (remainingMinutes > 0) {
          const minutesToTrack = Math.ceil(remainingMinutes); // Round up to prevent gaming the system
          console.log(`[FocusMode] 🔒 Tracking remaining ${remainingMinutes.toFixed(2)} min (rounded to ${minutesToTrack} min) on close`);

          this.emit('focus-mode:track-usage', {
            minutes: minutesToTrack,
            totalMinutes: this.minutesTracked + minutesToTrack,
            pageId: this.state.activePageId,
            pageTitle: this.state.activePageTitle,
            isPartialTracking: true // Flag to indicate this is remaining time
          });
        }
      }

      console.log(`[FocusMode] Stopped time tracking (total tracked: ${this.minutesTracked} min)`);
      this.minutesTracked = 0;
      this.trackingStartTime = 0;
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
  // GESTION DE L'INTRO
  // ============================================

  private loadIntroState(): void {
    try {
      // 🔧 FIX: Pour l'instant, utiliser une approche simple en mémoire
      // Le stockage persistant sera géré côté main process via IPC
      this.hasShownIntro = false;
    } catch (error) {
      console.warn('[FocusMode] Could not load intro state:', error);
      this.hasShownIntro = false;
    }
  }

  private saveIntroState(): void {
    try {
      // 🔧 FIX: Le stockage sera géré côté main process
      // Émettre un événement pour sauvegarder l'état
      this.emit('focus-mode:save-intro-state', true);
    } catch (error) {
      console.warn('[FocusMode] Could not save intro state:', error);
    }
  }

  // Méthode publique pour réinitialiser l'intro (pour debug/test)
  resetIntroState(): void {
    this.hasShownIntro = false;
    try {
      this.emit('focus-mode:save-intro-state', false);
    } catch (error) {
      console.warn('[FocusMode] Could not reset intro state:', error);
    }
  }

  // Méthode pour définir l'état de l'intro depuis le main process
  setIntroState(shown: boolean): void {
    this.hasShownIntro = shown;
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  destroy(): void {
    this.clearSessionTimeout();
    this.stopTimeTracking(); // 🆕 Stop time tracking on destroy
    this.removeAllListeners();
    console.log('[FocusMode] Service destroyed');
  }
}