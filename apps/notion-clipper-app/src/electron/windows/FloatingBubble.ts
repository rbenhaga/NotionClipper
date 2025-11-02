// apps/notion-clipper-app/src/electron/windows/FloatingBubble.ts
import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';

export class FloatingBubbleWindow {
  private window: BrowserWindow | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  
  // Configuration de la bulle
  private readonly BUBBLE_SIZE = 64;
  private readonly BUBBLE_MARGIN = 20;
  private readonly ANIMATION_DURATION = 300;

  constructor() {
    this.setupIpcHandlers();
  }

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
      movable: false, // On gère le drag manuellement
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: false, // Ne vole pas le focus
      hasShadow: false,
      roundedCorners: true,
      visualEffectState: 'active',
      vibrancy: 'under-window', // Pour macOS
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
        devTools: process.env.NODE_ENV === 'development'
      }
    });

    // Ignorer les événements souris par défaut (click-through)
    this.window.setIgnoreMouseEvents(true, { forward: true });

    // Charger le HTML de la bulle
    if (process.env.NODE_ENV === 'development') {
      this.window.loadURL('http://localhost:3000/?mode=bubble');
    } else {
      this.window.loadFile(path.join(__dirname, '../react/dist/bubble.html'));
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
  }

  private setupIpcHandlers(): void {
    // Activer/désactiver les événements souris
    ipcMain.on('bubble:set-mouse-events', (_event, enabled: boolean) => {
      if (!this.window || this.window.isDestroyed()) return;
      this.window.setIgnoreMouseEvents(!enabled, { forward: true });
    });

    // Démarrer le drag
    ipcMain.on('bubble:drag-start', (_event, { x, y }) => {
      if (!this.window || this.window.isDestroyed()) return;
      
      const [winX, winY] = this.window.getPosition();
      this.dragOffset = { x: x - winX, y: y - winY };
      this.isDragging = true;
    });

    // Déplacer la bulle
    ipcMain.on('bubble:drag-move', (_event, { x, y }) => {
      if (!this.window || this.window.isDestroyed() || !this.isDragging) return;
      
      const newX = x - this.dragOffset.x;
      const newY = y - this.dragOffset.y;
      
      // Contraintes de l'écran
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      
      const constrainedX = Math.max(0, Math.min(newX, width - this.BUBBLE_SIZE));
      const constrainedY = Math.max(0, Math.min(newY, height - this.BUBBLE_SIZE));
      
      this.window.setPosition(constrainedX, constrainedY);
    });

    // Terminer le drag
    ipcMain.on('bubble:drag-end', () => {
      this.isDragging = false;
      
      // Sauvegarder la position
      if (this.window && !this.window.isDestroyed()) {
        const [x, y] = this.window.getPosition();
        // Émettre event pour sauvegarder dans FocusModeService
        this.window.webContents.send('bubble:position-saved', { x, y });
      }
    });

    // Ouvrir le menu contextuel
    ipcMain.handle('bubble:show-menu', async () => {
      // Le menu sera géré côté React
      return { success: true };
    });

    // Action rapide (quick send)
    ipcMain.handle('bubble:quick-send', async () => {
      // Déclencher l'envoi rapide via le raccourci
      return { success: true };
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
    
    // Sauvegarder la position avant de fermer
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
  updateState(state: 'active' | 'inactive' | 'hover' | 'dragging'): void {
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
    
    const newX = position.x - this.dragOffset.x;
    const newY = position.y - this.dragOffset.y;
    
    // Contraintes de l'écran
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const constrainedX = Math.max(0, Math.min(newX, width - this.BUBBLE_SIZE));
    const constrainedY = Math.max(0, Math.min(newY, height - this.BUBBLE_SIZE));
    
    this.window.setPosition(constrainedX, constrainedY);
  }

  onDragEnd(): void {
    this.isDragging = false;
  }

  setMouseEvents(enabled: boolean): void {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.setIgnoreMouseEvents(!enabled, { forward: true });
    console.log('[FloatingBubble] Mouse events:', enabled ? 'enabled' : 'disabled');
  }
}