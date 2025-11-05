// apps/notion-clipper-app/src/electron/windows/FloatingBubble.ts
import { BrowserWindow, screen } from 'electron';
import path from 'path';

export class FloatingBubbleWindow {
  private window: BrowserWindow | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private savedPosition: { x: number; y: number } | null = null;
  private isMenuOpen = false;
  
  // 🎨 Dimensions - Style Apple Dynamic Island
  private readonly BUBBLE_SIZE = 64; // Taille compacte de la bulle
  private readonly BUBBLE_MARGIN = 20;
  
  // Fenêtre fixe assez grande pour contenir le menu
  private readonly WINDOW_SIZE = 160; // Taille fixe de la fenêtre (assez pour le menu)
  
  // Animation timing
  private resizeTimeout: NodeJS.Timeout | null = null;

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
    
    // Position par défaut : coin inférieur droit
    const defaultX = this.savedPosition?.x ?? (width - this.WINDOW_SIZE - this.BUBBLE_MARGIN);
    const defaultY = this.savedPosition?.y ?? (height - this.WINDOW_SIZE - this.BUBBLE_MARGIN);

    this.window = new BrowserWindow({
      width: this.WINDOW_SIZE,
      height: this.WINDOW_SIZE,
      x: defaultX,
      y: defaultY,
      
      // Configuration fenêtre flottante
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: true,
      hasShadow: true,
      roundedCorners: true,
      
      // Effets visuels macOS
      ...(process.platform === 'darwin' && {
        visualEffectState: 'active',
        vibrancy: 'popover',
      }),
      
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        devTools: process.env.NODE_ENV === 'development',
        backgroundThrottling: false,
      }
    });

    // Capturer tous les événements souris
    this.window.setIgnoreMouseEvents(false);

    // Charger le contenu
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
      // Essayer d'abord le serveur de dev, puis fallback sur le fichier local
      const bubbleUrl = 'http://localhost:3000/bubble.html';
      console.log('[FloatingBubble] Loading from dev server:', bubbleUrl);
      
      // Timeout pour éviter d'attendre trop longtemps
      const loadPromise = this.window.loadURL(bubbleUrl);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      
      Promise.race([loadPromise, timeoutPromise]).catch(err => {
        console.error('[FloatingBubble] Failed to load from dev server:', err);
        console.log('[FloatingBubble] Falling back to local file...');
        this.loadLocalFile();
      });
      
      // Toujours ouvrir les DevTools en mode développement pour débugger
      this.window.webContents.openDevTools({ mode: 'detach' });
    } else {
      this.loadLocalFile();
    }
  }

  private loadLocalFile(): void {
    if (!this.window) return;
    
    const bubblePath = path.join(__dirname, '../react/dist/bubble.html');
    console.log('[FloatingBubble] Loading from file:', bubblePath);
    
    this.window.loadFile(bubblePath).then(() => {
      // Ouvrir les DevTools en mode développement même pour le fichier local
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        this.window?.webContents.openDevTools({ mode: 'detach' });
      }
    }).catch(err => {
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

    this.window.on('blur', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.setAlwaysOnTop(true, 'floating');
        
        // Fermer le menu si on perd le focus
        if (this.isMenuOpen) {
          this.closeMenu();
        }
      }
    });

    this.window.webContents.on('did-finish-load', () => {
      console.log('[FloatingBubble] Content loaded successfully');
      
      // Ouvrir les DevTools en mode développement
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('[FloatingBubble] Opening DevTools in detached mode');
        this.window?.webContents.openDevTools({ mode: 'detach' });
      }
      
      const pos = this.getPosition();
      if (pos) {
        this.window?.webContents.send('bubble:position-restored', pos);
      }
    });

    this.window.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      console.error('[FloatingBubble] Failed to load:', errorCode, errorDescription);
    });

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
    this.window.focus();
    console.log('[FloatingBubble] Shown');
  }

  hide(): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    if (this.isMenuOpen) {
      this.closeMenu();
    }
    
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
  // 🆕 GESTION DU MENU CONTEXTUEL
  // ============================================

  openMenu(): void {
    console.log('[FloatingBubble] openMenu called, isMenuOpen:', this.isMenuOpen);
    if (!this.window || this.window.isDestroyed() || this.isMenuOpen) {
      console.log('[FloatingBubble] Cannot open menu - window destroyed or menu already open');
      return;
    }
    
    this.isMenuOpen = true;
    
    // Ne plus redimensionner la fenêtre, juste notifier le renderer
    console.log('[FloatingBubble] Menu opened - notifying renderer');
    this.window?.webContents.send('bubble:menu-opened');
  }

  closeMenu(): void {
    console.log('[FloatingBubble] closeMenu called, isMenuOpen:', this.isMenuOpen);
    if (!this.window || this.window.isDestroyed() || !this.isMenuOpen) {
      console.log('[FloatingBubble] Cannot close menu - window destroyed or menu not open');
      return;
    }
    
    this.isMenuOpen = false;
    
    // Ne plus redimensionner la fenêtre, juste notifier le renderer
    console.log('[FloatingBubble] Menu closed - notifying renderer');
    this.window?.webContents.send('bubble:menu-closed');
  }

  toggleMenu(): void {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  isMenuOpenState(): boolean {
    return this.isMenuOpen;
  }

  // ============================================
  // ANIMATION DE REDIMENSIONNEMENT
  // ============================================

  private animateResize(
    targetX: number,
    targetY: number,
    targetWidth: number,
    targetHeight: number,
    onComplete?: () => void
  ): void {
    console.log('[FloatingBubble] animateResize called:', { targetX, targetY, targetWidth, targetHeight });
    if (!this.window || this.window.isDestroyed()) {
      console.log('[FloatingBubble] Cannot animate - window destroyed');
      return;
    }

    // Clear any pending resize
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    const steps = 12; // Nombre d'étapes pour l'animation (60fps = ~200ms)
    const duration = 200; // Durée totale en ms
    const interval = duration / steps;

    const [currentX, currentY] = this.window.getPosition();
    const [currentWidth, currentHeight] = this.window.getSize();

    const deltaX = (targetX - currentX) / steps;
    const deltaY = (targetY - currentY) / steps;
    const deltaWidth = (targetWidth - currentWidth) / steps;
    const deltaHeight = (targetHeight - currentHeight) / steps;

    let step = 0;

    const animate = () => {
      if (!this.window || this.window.isDestroyed()) return;

      step++;
      
      // Easing: ease-out cubic
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);

      const newX = Math.round(currentX + deltaX * eased * steps);
      const newY = Math.round(currentY + deltaY * eased * steps);
      const newWidth = Math.round(currentWidth + deltaWidth * eased * steps);
      const newHeight = Math.round(currentHeight + deltaHeight * eased * steps);

      this.window.setBounds({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }, false); // false = pas d'animation Electron (on gère nous-mêmes)

      if (step < steps) {
        this.resizeTimeout = setTimeout(animate, interval);
      } else {
        // Animation terminée
        this.window.setBounds({
          x: targetX,
          y: targetY,
          width: targetWidth,
          height: targetHeight
        }, false);
        
        if (onComplete) {
          onComplete();
        }
        
        this.resizeTimeout = null;
      }
    };

    animate();
  }

  // ============================================
  // GESTION DE LA POSITION
  // ============================================

  setPosition(x: number, y: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const constrainedX = Math.max(0, Math.min(x, width - this.WINDOW_SIZE));
    const constrainedY = Math.max(0, Math.min(y, height - this.WINDOW_SIZE));
    
    this.window.setPosition(constrainedX, constrainedY);
    this.savedPosition = { x: constrainedX, y: constrainedY };
  }

  getPosition(): { x: number; y: number } | null {
    if (!this.window || this.window.isDestroyed()) return null;
    
    const [x, y] = this.window.getPosition();
    return { x, y };
  }

  private savePosition(): void {
    // Sauvegarder uniquement la position de la bulle, pas du menu
    if (this.isMenuOpen) {
      return; // Ne pas sauvegarder pendant que le menu est ouvert
    }
    
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
    
    // Fermer le menu si ouvert
    if (this.isMenuOpen) {
      this.closeMenu();
      return; // Attendre que le menu se ferme avant de commencer le drag
    }
    
    const [winX, winY] = this.window.getPosition();
    this.dragOffset = { 
      x: position.x - winX, 
      y: position.y - winY 
    };
    this.isDragging = true;
    
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
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const constrainedX = Math.max(0, Math.min(newX, width - this.WINDOW_SIZE));
    const constrainedY = Math.max(0, Math.min(newY, height - this.WINDOW_SIZE));
    
    this.window.setPosition(constrainedX, constrainedY, false);
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
  // MOUSE EVENTS TOGGLE
  // ============================================

  setMouseEvents(enabled: boolean): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.setIgnoreMouseEvents(!enabled);
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  destroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
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