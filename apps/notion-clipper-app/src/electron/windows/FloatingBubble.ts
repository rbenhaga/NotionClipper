// apps/notion-clipper-app/src/electron/windows/FloatingBubble.ts
import { BrowserWindow, screen } from 'electron';
import path from 'path';

export class FloatingBubbleWindow {
  private window: BrowserWindow | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private savedPosition: { x: number; y: number } | null = null;
  
  private readonly BUBBLE_SIZE = 72; // Augmenté pour meilleure visibilité
  private readonly BUBBLE_MARGIN = 24;

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
    
    // Position par défaut ou sauvegardée
    const defaultX = this.savedPosition?.x ?? (width - this.BUBBLE_SIZE - this.BUBBLE_MARGIN);
    const defaultY = this.savedPosition?.y ?? (height - this.BUBBLE_SIZE - this.BUBBLE_MARGIN);

    this.window = new BrowserWindow({
      width: this.BUBBLE_SIZE,
      height: this.BUBBLE_SIZE,
      x: defaultX,
      y: defaultY,
      
      // ✅ Configuration correcte pour fenêtre interactive
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true, // ✅ Activé pour permettre le drag
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: true, // ✅ CRITIQUE : doit être true pour recevoir les événements
      hasShadow: true,
      roundedCorners: true,
      
      // Effets visuels selon la plateforme
      ...(process.platform === 'darwin' && {
        visualEffectState: 'active',
        vibrancy: 'popover',
      }),
      
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        devTools: process.env.NODE_ENV === 'development',
        backgroundThrottling: false, // Pas de throttling pour animations fluides
      }
    });

    // ✅ Click-through désactivé par défaut (on veut capturer les clics)
    this.window.setIgnoreMouseEvents(false);

    // Charger le HTML
    this.loadContent();

    // Setup événements
    this.setupWindowEvents();

    console.log('[FloatingBubble] ✅ Window created at', { x: defaultX, y: defaultY });
    return this.window;
  }

  // ============================================
  // CHARGEMENT DU CONTENU
  // ============================================

  private loadContent(): void {
    if (!this.window) return;

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // ✅ En dev : utiliser l'URL Vite correcte
      const bubbleUrl = 'http://localhost:3000/bubble.html';
      console.log('[FloatingBubble] Loading from dev server:', bubbleUrl);
      
      this.window.loadURL(bubbleUrl).catch(err => {
        console.error('[FloatingBubble] Failed to load from dev server:', err);
        // Fallback vers fichier local
        this.loadLocalFile();
      });
      
      // DevTools en mode détaché pour debugging
      if (process.env.DEBUG_BUBBLE === 'true') {
        this.window.webContents.openDevTools({ mode: 'detach' });
      }
    } else {
      // Production : fichier build
      this.loadLocalFile();
    }
  }

  private loadLocalFile(): void {
    if (!this.window) return;
    
    const bubblePath = path.join(__dirname, '../react/dist/bubble.html');
    console.log('[FloatingBubble] Loading from file:', bubblePath);
    
    this.window.loadFile(bubblePath).catch(err => {
      console.error('[FloatingBubble] Failed to load bubble.html:', err);
    });
  }

  // ============================================
  // GESTION DES ÉVÉNEMENTS
  // ============================================

  private setupWindowEvents(): void {
    if (!this.window) return;

    this.window.on('closed', () => {
      this.savePosition();
      this.window = null;
      console.log('[FloatingBubble] Window closed');
    });

    // Rester toujours au-dessus
    this.window.on('blur', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.setAlwaysOnTop(true, 'floating');
      }
    });

    // Log succès de chargement
    this.window.webContents.on('did-finish-load', () => {
      console.log('[FloatingBubble] Content loaded successfully');
      // Envoyer la position actuelle au renderer
      const pos = this.getPosition();
      if (pos) {
        this.window?.webContents.send('bubble:position-restored', pos);
      }
    });

    // Log erreurs
    this.window.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      console.error('[FloatingBubble] Failed to load:', errorCode, errorDescription);
    });

    // ✅ Empêcher la fermeture accidentelle
    this.window.on('close', (e) => {
      e.preventDefault();
      this.hide();
    });
  }

  // ============================================
  // CONTRÔLES DE VISIBILITÉ
  // ============================================

  show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
      return;
    }

    this.window.show();
    this.window.setAlwaysOnTop(true, 'floating');
    this.window.focus(); // ✅ Focus pour recevoir les événements
    console.log('[FloatingBubble] Shown');
  }

  hide(): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    this.savePosition();
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

  // ============================================
  // GESTION DE LA POSITION
  // ============================================

  setPosition(x: number, y: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // Contraindre dans l'écran
    const constrainedX = Math.max(0, Math.min(x, width - this.BUBBLE_SIZE));
    const constrainedY = Math.max(0, Math.min(y, height - this.BUBBLE_SIZE));
    
    this.window.setPosition(constrainedX, constrainedY);
    this.savedPosition = { x: constrainedX, y: constrainedY };
  }

  getPosition(): { x: number; y: number } | null {
    if (!this.window || this.window.isDestroyed()) return null;
    
    const [x, y] = this.window.getPosition();
    return { x, y };
  }

  private savePosition(): void {
    const pos = this.getPosition();
    if (pos) {
      this.savedPosition = pos;
      this.window?.webContents.send('bubble:position-saved', pos);
    }
  }

  // ============================================
  // DRAG & DROP
  // ============================================

  onDragStart(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    const [winX, winY] = this.window.getPosition();
    this.dragOffset = { 
      x: position.x - winX, 
      y: position.y - winY 
    };
    this.isDragging = true;
    
    // Désactiver le hover pendant le drag
    this.window.webContents.send('bubble:drag-state', true);
  }

  onDragMove(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed() || !this.isDragging) return;
    
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.warn('[FloatingBubble] Invalid drag position:', position);
      return;
    }
    
    const newX = Math.round(position.x - this.dragOffset.x);
    const newY = Math.round(position.y - this.dragOffset.y);
    
    // Contraintes écran
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const constrainedX = Math.max(0, Math.min(newX, width - this.BUBBLE_SIZE));
    const constrainedY = Math.max(0, Math.min(newY, height - this.BUBBLE_SIZE));
    
    this.window.setPosition(constrainedX, constrainedY, false); // false = pas d'animation
  }

  onDragEnd(): void {
    this.isDragging = false;
    this.savePosition();
    
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('bubble:drag-state', false);
    }
  }

  // ============================================
  // ÉTATS VISUELS
  // ============================================

  updateState(state: 'active' | 'inactive' | 'sending' | 'success' | 'error' | 'offline'): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('bubble:state-change', state);
  }

  notifyClipSent(): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('bubble:clip-sent');
  }

  updateCounter(count: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send('bubble:update-counter', count);
  }

  // ============================================
  // MOUSE EVENTS TOGGLE (pour menu)
  // ============================================

  setMouseEvents(enabled: boolean): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    // ✅ Quand le menu est ouvert, on veut capturer tous les événements
    // Quand fermé, on veut aussi les capturer pour le clic et drag
    this.window.setIgnoreMouseEvents(false);
    
    console.log('[FloatingBubble] Mouse events: always enabled for interaction');
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.savePosition();
      this.window.removeAllListeners();
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