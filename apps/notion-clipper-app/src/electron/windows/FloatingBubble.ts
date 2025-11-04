// apps/notion-clipper-app/src/electron/windows/FloatingBubble.ts
import { BrowserWindow, screen } from 'electron';
import path from 'path';

export class FloatingBubbleWindow {
  private window: BrowserWindow | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  
  // Configuration de la bulle
  private readonly BUBBLE_SIZE = 64;
  private readonly BUBBLE_MARGIN = 20;

  // ============================================
  // CRÉATION DE LA FENÊTRE
  // ============================================

  create(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      this.show();
      return this.window;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // Position par défaut : bas à droite
    const defaultX = width - this.BUBBLE_SIZE - this.BUBBLE_MARGIN;
    const defaultY = height - this.BUBBLE_SIZE - this.BUBBLE_MARGIN;

    this.window = new BrowserWindow({
      width: this.BUBBLE_SIZE,
      height: this.BUBBLE_SIZE,
      x: defaultX,
      y: defaultY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: false,
      hasShadow: false,
      roundedCorners: true,
      visualEffectState: 'active',
      vibrancy: 'under-window',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        devTools: process.env.NODE_ENV === 'development'
      }
    });

    // Ignorer les événements souris par défaut (click-through)
    this.window.setIgnoreMouseEvents(false);

    // Charger le HTML de la bulle
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // En dev, charger depuis le dossier public de Vite
      console.log('[FloatingBubble] Loading from dev server: http://localhost:3000/bubble.html');
      this.window.loadURL('http://localhost:3000/bubble.html').catch(err => {
        console.error('[FloatingBubble] Failed to load bubble.html from dev server:', err);
        console.log('[FloatingBubble] Trying fallback...');
        // Fallback : essayer de charger le fichier local
        const fallbackPath = path.join(__dirname, '../react/bubble.html');
        this.window.loadFile(fallbackPath).catch(fallbackErr => {
          console.error('[FloatingBubble] Fallback also failed:', fallbackErr);
        });
      });
      
      // Ouvrir les DevTools en dev pour debug
      this.window.webContents.openDevTools({ mode: 'detach' });
    } else {
      // En prod, charger depuis les fichiers build
      const bubblePath = path.join(__dirname, '../react/dist/bubble.html');
      this.window.loadFile(bubblePath).catch(err => {
        console.error('[FloatingBubble] Failed to load bubble.html from build:', err);
      });
    }

    // Événements
    this.setupWindowEvents();

    console.log('[FloatingBubble] ✅ Window created');
    return this.window;
  }

  // ============================================
  // GESTION DES ÉVÉNEMENTS
  // ============================================

  private setupWindowEvents(): void {
    if (!this.window) return;

    this.window.on('closed', () => {
      this.window = null;
      console.log('[FloatingBubble] Window closed');
    });

    // Rester toujours au-dessus
    this.window.on('blur', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.setAlwaysOnTop(true, 'floating');
      }
    });

    // Log quand la page est chargée
    this.window.webContents.on('did-finish-load', () => {
      console.log('[FloatingBubble] Content loaded successfully');
    });

    // Log les erreurs de chargement
    this.window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[FloatingBubble] Failed to load:', errorCode, errorDescription);
    });
  }

  // ============================================
  // CONTRÔLES DE LA FENÊTRE
  // ============================================

  show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
      return;
    }

    this.window.show();
    this.window.setAlwaysOnTop(true, 'floating');
    console.log('[FloatingBubble] Shown');
  }

  hide(): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    // Sauvegarder la position avant de masquer
    const [x, y] = this.window.getPosition();
    this.window.webContents.send('bubble:position-saved', { x, y });
    
    this.window.hide();
    console.log('[FloatingBubble] Hidden');
  }

  toggle(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
      return;
    }

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  setPosition(x: number, y: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const constrainedX = Math.max(0, Math.min(x, width - this.BUBBLE_SIZE));
    const constrainedY = Math.max(0, Math.min(y, height - this.BUBBLE_SIZE));
    
    this.window.setPosition(constrainedX, constrainedY);
  }

  getPosition(): { x: number; y: number } | null {
    if (!this.window || this.window.isDestroyed()) return null;
    
    const [x, y] = this.window.getPosition();
    return { x, y };
  }

  // Mettre à jour l'état visuel (actif/inactif/hover)
  updateState(state: 'active' | 'inactive' | 'hover' | 'dragging' | 'sending' | 'success' | 'error'): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('bubble:state-change', state);
  }

  // Notifier d'un clip envoyé (animation)
  notifyClipSent(): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('bubble:clip-sent');
  }

  // Mettre à jour le compteur
  updateCounter(count: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('bubble:update-counter', count);
  }

  // ============================================
  // MÉTHODES POUR LES IPC HANDLERS
  // ============================================

  onDragStart(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    const [winX, winY] = this.window.getPosition();
    this.dragOffset = { x: position.x - winX, y: position.y - winY };
    this.isDragging = true;
  }

  onDragMove(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed() || !this.isDragging) return;
    
    // Validation des paramètres
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.error('[FloatingBubble] Invalid drag position:', position);
      return;
    }
    
    const newX = Math.round(position.x - this.dragOffset.x);
    const newY = Math.round(position.y - this.dragOffset.y);
    
    // Contraintes de l'écran
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const constrainedX = Math.max(0, Math.min(newX, width - this.BUBBLE_SIZE));
    const constrainedY = Math.max(0, Math.min(newY, height - this.BUBBLE_SIZE));
    
    try {
      this.window.setPosition(constrainedX, constrainedY);
    } catch (error) {
      console.error('[FloatingBubble] Error setting position:', error);
    }
  }

  onDragEnd(): void {
    this.isDragging = false;
  }

  setMouseEvents(enabled: boolean): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.setIgnoreMouseEvents(!enabled, { forward: true });
    console.log('[FloatingBubble] Mouse events:', enabled ? 'enabled' : 'disabled');
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      // Sauvegarder la position avant de détruire
      const [x, y] = this.window.getPosition();
      this.window.webContents.send('bubble:position-saved', { x, y });
      
      this.window.destroy();
      this.window = null;
    }
    console.log('[FloatingBubble] Destroyed');
  }

  isVisible(): boolean {
    return this.window !== null 
      && !this.window.isDestroyed() 
      && this.window.isVisible();
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }
}