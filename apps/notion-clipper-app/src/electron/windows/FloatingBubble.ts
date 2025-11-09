// apps/notion-clipper-app/src/electron/windows/FloatingBubble.ts
import { BrowserWindow, screen } from 'electron';
import Store from 'electron-store';
import path from 'path';

// ============================================
// TYPES
// ============================================

type BubbleSize = 'compact' | 'menu' | 'progress' | 'success' | 'error';

interface BubbleSizeConfig {
  width: number;
  height: number;
}

interface BubblePosition {
  x: number;
  y: number;
}

// ============================================
// SIZE CONFIGURATIONS
// ============================================
const SIZES: Record<BubbleSize, BubbleSizeConfig> = {
  compact: { width: 64, height: 64 }, // 🔥 CORRECTION: Augmenté de 48 à 64 pour le hover
  menu: { width: 280, height: 480 },
  progress: { width: 64, height: 64 },
  success: { width: 64, height: 64 },
  error: { width: 64, height: 64 },
};

// ============================================
// FLOATING BUBBLE WINDOW
// ============================================

export class FloatingBubbleWindow {
  private window: BrowserWindow | null = null;
  private store: any;
  private currentSize: BubbleSize = 'compact';
  private isAnimating = false;
  private dragStartPos: { x: number; y: number } | null = null;
  private initialBounds: Electron.Rectangle | null = null;
  private savedBubblePosition: { x: number; y: number } | null = null; // 🔥 NOUVEAU: Position sauvegardée

  constructor() {
    this.store = new Store({
      name: 'floating-bubble',
      defaults: {
        position: this.getDefaultPosition(),
      },
    });
  }

  // ============================================
  // CRÉATION DE LA FENÊTRE
  // ============================================

  create(): void {
    if (this.window && !this.window.isDestroyed()) {
      console.log('[FloatingBubble] Window already exists');
      return;
    }

    const savedPosition = this.getSavedPosition();
    const size = SIZES.compact;

    console.log('[FloatingBubble] Creating window at:', savedPosition);

    this.window = new BrowserWindow({
      width: size.width,
      height: size.height,
      x: savedPosition.x,
      y: savedPosition.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false, // 🔥 CORRECTION: Pas d'ombre système
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    this.currentSize = 'compact';
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setAlwaysOnTop(true, 'floating', 1);
    
    // 🔥 CORRECTION: Désactiver explicitement l'ombre sur Windows
    if (process.platform === 'win32') {
      this.window.setHasShadow(false);
    }

    this.setupWindowEvents();
    this.loadContent();
  }

  private loadContent(): void {
    if (!this.window) return;

    const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;

    if (isDev) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
      const bubbleUrl = `${devServerUrl}/bubble.html`;
      console.log('[FloatingBubble] Loading from dev server:', bubbleUrl);

      this.window.loadURL(bubbleUrl).catch((err) => {
        console.error('[FloatingBubble] Failed to load from dev server:', err);
        this.loadLocalFile();
      });

      // DevTools en mode dev
      // this.window.webContents.openDevTools({ mode: 'detach' }); // ✅ Désactivé - Ouvrir manuellement avec F12 si besoin
    } else {
      this.loadLocalFile();
    }
  }

  private loadLocalFile(): void {
    if (!this.window) return;

    const bubblePath = path.join(__dirname, '../../src/react/dist/bubble.html');
    console.log('[FloatingBubble] Loading from file:', bubblePath);

    this.window.loadFile(bubblePath).catch((err) => {
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

    this.window.webContents.on('did-finish-load', () => {
      console.log('[FloatingBubble] Content loaded');
      
      // Notifier du size actuel
      this.window?.webContents.send('bubble:size-changed', this.currentSize);
    });

    this.window.on('close', (e) => {
      e.preventDefault();
      this.hide();
    });
  }

  // ============================================
  // CONTRÔLE DE TAILLE
  // ============================================

  async setSize(size: BubbleSize, preserveCenter = true): Promise<void> {
    if (!this.window || this.window.isDestroyed() || this.isAnimating) {
      return;
    }

    if (this.currentSize === size) {
      return;
    }

    console.log(`[FloatingBubble] Resizing: ${this.currentSize} → ${size}`);

    this.isAnimating = true;
    const targetSize = SIZES[size];
    const currentBounds = this.window.getBounds();
    const currentSize = SIZES[this.currentSize];

    // 🔥 NOUVEAU: Sauvegarder la position de la bulle avant d'ouvrir le menu
    if (this.currentSize === 'compact' && size === 'menu') {
      const centerX = currentBounds.x + currentSize.width / 2;
      const centerY = currentBounds.y + currentSize.height / 2;
      this.savedBubblePosition = { x: centerX, y: centerY };
      console.log('[FloatingBubble] 💾 Position sauvegardée:', this.savedBubblePosition);
    }

    let newX = currentBounds.x;
    let newY = currentBounds.y;

    // 🔥 NOUVEAU: Restaurer la position exacte lors de la fermeture du menu
    if (size === 'compact' && this.savedBubblePosition) {
      newX = Math.round(this.savedBubblePosition.x - targetSize.width / 2);
      newY = Math.round(this.savedBubblePosition.y - targetSize.height / 2);
      console.log('[FloatingBubble] 🔄 Position restaurée:', { x: newX, y: newY });
    }
    // Centrer sur la position actuelle pour les autres transitions
    else if (preserveCenter) {
      const centerX = currentBounds.x + currentSize.width / 2;
      const centerY = currentBounds.y + currentSize.height / 2;

      newX = Math.round(centerX - targetSize.width / 2);
      newY = Math.round(centerY - targetSize.height / 2);

      // Contraindre pour éviter que le menu déborde de l'écran
      const displays = screen.getAllDisplays();
      let targetDisplay = displays[0];
      
      for (const display of displays) {
        const { x, y, width, height } = display.workArea;
        if (centerX >= x && centerX < x + width && centerY >= y && centerY < y + height) {
          targetDisplay = display;
          break;
        }
      }

      const { x: screenX, y: screenY, width: screenWidth, height: screenHeight } = targetDisplay.workArea;
      const margin = 10;

      newX = Math.max(screenX + margin, newX);
      newX = Math.min(screenX + screenWidth - targetSize.width - margin, newX);
      newY = Math.max(screenY + margin, newY);
      newY = Math.min(screenY + screenHeight - targetSize.height - margin, newY);
    }

    // 🔥 CORRECTION: Masquer la fenêtre pendant la transition
    this.window.setOpacity(0);

    // Notifier React pour préparer le changement
    this.window.webContents.send('bubble:size-changed', size);

    // Attendre un court instant pour que React soit prêt
    await new Promise(resolve => setTimeout(resolve, 50));

    // Positionner et redimensionner AVANT de rendre visible
    this.window.setBounds({
      x: newX,
      y: newY,
      width: targetSize.width,
      height: targetSize.height,
    }, false);

    this.currentSize = size;

    // Petit délai pour que le DOM soit prêt
    await new Promise(resolve => setTimeout(resolve, 50));

    // Rendre visible avec fade in
    this.window.setOpacity(1);

    // Fin de l'animation
    setTimeout(() => {
      this.isAnimating = false;
      console.log(`[FloatingBubble] ✅ Resized to ${size} (${targetSize.width}x${targetSize.height})`);
    }, 200);
  }

  // ============================================
  // MÉTHODES RAPIDES
  // ============================================

  async expandToMenu(): Promise<void> {
    await this.setSize('menu');
  }

  async expandToProgress(): Promise<void> {
    await this.setSize('progress');
  }

  async showSuccess(): Promise<void> {
    await this.setSize('success');
    setTimeout(() => {
      if (this.currentSize === 'success') {
        this.setSize('compact');
      }
    }, 2000);
  }

  async showError(): Promise<void> {
    await this.setSize('error');
    setTimeout(() => {
      if (this.currentSize === 'error') {
        this.setSize('compact');
      }
    }, 3000);
  }

  async collapseToCompact(): Promise<void> {
    await this.setSize('compact');
  }

  getCurrentSize(): BubbleSize {
    return this.currentSize;
  }

  // ============================================
  // VISIBILITÉ
  // ============================================

  show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
      return;
    }

    this.window.show();
    this.window.setAlwaysOnTop(true, 'floating', 1);
    console.log('[FloatingBubble] Shown');
  }

  hide(): void {
    if (!this.window || this.window.isDestroyed()) return;

    // Revenir en mode compact
    if (this.currentSize !== 'compact') {
      this.setSize('compact', false);
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

  isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  // ============================================
  // ÉTAT
  // ============================================

  updateState(state: 'idle' | 'active' | 'preparing' | 'sending' | 'success' | 'error' | 'offline'): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    this.window.webContents.send('bubble:state-change', state);
    console.log('[FloatingBubble] State:', state);
  }

  // ============================================
  // POSITIONS
  // ============================================

  private getDefaultPosition(): BubblePosition {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    return {
      x: width - 100,
      y: height - 100,
    };
  }

  private getSavedPosition(): BubblePosition {
    const saved = this.store.get('position') as BubblePosition | undefined;
    return saved || this.getDefaultPosition();
  }

  savePosition(): void {
    if (!this.window || this.window.isDestroyed()) return;

    const bounds = this.window.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    const compactSize = SIZES.compact;
    const position = {
      x: Math.round(centerX - compactSize.width / 2),
      y: Math.round(centerY - compactSize.height / 2),
    };

    this.store.set('position', position);
    console.log('[FloatingBubble] Position saved:', position);
  }

  getPosition(): BubblePosition | null {
    if (!this.window || this.window.isDestroyed()) return null;
    
    const bounds = this.window.getBounds();
    return { x: bounds.x, y: bounds.y };
  }

  setPosition(x: number, y: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    
    this.window.setPosition(x, y);
  }

  // ============================================
  // DRAG & DROP
  // ============================================

  onDragStart(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed()) return;

    // 🔥 CORRECTION: Ne plus fermer automatiquement le menu pendant le drag
    // Le menu peut maintenant être déplacé sans se fermer

    this.dragStartPos = position;
    this.initialBounds = this.window.getBounds();
    this.window.webContents.send('bubble:drag-state', true);
    console.log('[FloatingBubble] ✅ Drag started');
  }

  onDragMove(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed() || !this.dragStartPos || !this.initialBounds) {
      return;
    }

    try {
      // 🔥 FIX: Validation stricte et conversion en int
      if (typeof position.x !== 'number' || typeof position.y !== 'number' || 
          isNaN(position.x) || isNaN(position.y)) {
        console.error('[BUBBLE] Invalid position values:', position);
        return;
      }

      const posX = Math.round(position.x);
      const posY = Math.round(position.y);

      // 🔥 FIX CRITIQUE: Appliquer IMMÉDIATEMENT sans throttle
      // Electron gère déjà le rate limiting en interne
      this.applyDragMove({ x: posX, y: posY });
    } catch (error) {
      console.error('[BUBBLE] Error on drag move:', error);
    }
  }

  private applyDragMove(position: { x: number; y: number }): void {
    if (!this.window || this.window.isDestroyed() || !this.dragStartPos || !this.initialBounds) {
      return;
    }

    const deltaX = position.x - this.dragStartPos.x;
    const deltaY = position.y - this.dragStartPos.y;

    const newX = Math.round(this.initialBounds.x + deltaX);
    const newY = Math.round(this.initialBounds.y + deltaY);

    // 🔥 OPTIMISATION CRITIQUE: Utiliser setBounds au lieu de setPosition
    // setBounds est plus performant et évite les reflows
    // On ne fait PAS de contraintes de bords pendant le drag pour plus de fluidité
    this.window.setBounds({
      x: newX,
      y: newY,
      width: this.initialBounds.width,
      height: this.initialBounds.height
    }, false); // false = pas d'animation
  }

  onDragEnd(): void {
    if (!this.window || this.window.isDestroyed()) return;

    // 🔥 NOUVEAU: Appliquer les contraintes de bords UNIQUEMENT à la fin
    const currentBounds = this.window.getBounds();
    const displays = screen.getAllDisplays();
    
    let targetDisplay = displays[0];
    const centerX = currentBounds.x + currentBounds.width / 2;
    const centerY = currentBounds.y + currentBounds.height / 2;
    
    for (const display of displays) {
      const { x, y, width, height } = display.workArea;
      if (centerX >= x && centerX < x + width && centerY >= y && centerY < y + height) {
        targetDisplay = display;
        break;
      }
    }

    const { x: screenX, y: screenY, width: screenWidth, height: screenHeight } = targetDisplay.workArea;
    const margin = 10;

    let finalX = currentBounds.x;
    let finalY = currentBounds.y;

    // Contraindre uniquement si hors écran
    finalX = Math.max(screenX - currentBounds.width + margin, finalX);
    finalX = Math.min(screenX + screenWidth - margin, finalX);
    finalY = Math.max(screenY + margin, finalY);
    finalY = Math.min(screenY + screenHeight - currentBounds.height - margin, finalY);

    // Appliquer la position finale si elle a changé
    if (finalX !== currentBounds.x || finalY !== currentBounds.y) {
      this.window.setBounds({
        x: Math.round(finalX),
        y: Math.round(finalY),
        width: currentBounds.width,
        height: currentBounds.height
      }, false);
    }

    this.dragStartPos = null;
    this.initialBounds = null;
    this.savePosition();
    this.window.webContents.send('bubble:drag-state', false);
    console.log('[FloatingBubble] ✅ Drag ended');
  }



  // ============================================
  // RÉCUPÉRATION D'URGENCE
  // ============================================

  resetToDefaultPosition(): void {
    if (!this.window || this.window.isDestroyed()) return;

    const defaultPos = this.getDefaultPosition();
    console.log('[FloatingBubble] 🚨 EMERGENCY RESET to:', defaultPos);
    
    this.window.setPosition(defaultPos.x, defaultPos.y);
    this.savePosition();
    
    if (!this.window.isVisible()) {
      this.window.show();
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.savePosition();
      this.window.destroy();
      this.window = null;
    }
  }
}