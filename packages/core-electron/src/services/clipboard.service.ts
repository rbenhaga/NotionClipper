// packages/core-electron/src/services/clipboard.service.ts
import type { IClipboard, ClipboardContent, ICacheAdapter } from '@notion-clipper/core-shared';
import EventEmitter from 'events';

/**
 * Electron Clipboard Service
 * Node.js implementation with watching capability
 */
export class ElectronClipboardService extends EventEmitter {
  private watchInterval?: NodeJS.Timeout;
  private lastContent: string | null = null;
  
  constructor(
    private adapter: IClipboard,
    private cache?: ICacheAdapter
  ) {
    super();
  }
  
  /**
   * Get current clipboard content
   */
  async getContent(): Promise<ClipboardContent | null> {
    try {
      const content = await this.adapter.read();
      return content;
    } catch (error) {
      console.error('[CLIPBOARD] Error reading:', error);
      return null;
    }
  }
  
  /**
   * Set clipboard content
   */
  async setContent(data: ClipboardContent | string, type?: string): Promise<void> {
    try {
      // Si c'est une string simple, convertir en ClipboardContent
      if (typeof data === 'string') {
        const content: ClipboardContent = {
          type: (type as any) || 'text',
          data: data,
          content: data,
          timestamp: Date.now()
        };
        await this.adapter.write(content);
      } else {
        await this.adapter.write(data);
      }
    } catch (error) {
      console.error('[CLIPBOARD] Error writing:', error);
      throw error;
    }
  }
  
  /**
   * Clear clipboard
   */
  async clear(): Promise<void> {
    try {
      await this.adapter.clear();
    } catch (error) {
      console.error('[CLIPBOARD] Error clearing:', error);
    }
  }
  
  /**
   * Check if clipboard has content
   */
  async hasContent(): Promise<boolean> {
    try {
      return await this.adapter.hasContent();
    } catch (error) {
      console.error('[CLIPBOARD] Error checking content:', error);
      return false;
    }
  }
  
  /**
   * Get available formats
   */
  async getAvailableFormats(): Promise<string[]> {
    try {
      return await this.adapter.getAvailableFormats();
    } catch (error) {
      console.error('[CLIPBOARD] Error getting formats:', error);
      return [];
    }
  }
  
  /**
   * Start watching clipboard for changes
   */
  startWatching(intervalMs: number = 500): void {
    if (this.watchInterval) {
      console.log('[CLIPBOARD] Already watching');
      return;
    }
    
    console.log(`[CLIPBOARD] Starting to watch (interval: ${intervalMs}ms)`);
    
    this.watchInterval = setInterval(async () => {
      try {
        const content = await this.getContent();
        
        if (!content) return;
        
        // Compare avec le dernier contenu
        const currentText = content.data?.toString() || content.text || '';
        
        if (currentText && currentText !== this.lastContent) {
          this.lastContent = currentText;
          console.log('[CLIPBOARD] Change detected');
          this.emit('changed', content);
        }
      } catch (error) {
        // Silent fail pour éviter de spammer les logs
      }
    }, intervalMs);
  }
  
  /**
   * Stop watching clipboard
   */
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
      console.log('[CLIPBOARD] Stopped watching');
    }
  }
  
  /**
   * Get clipboard history (if cached)
   */
  async getHistory(): Promise<ClipboardContent[]> {
    if (!this.cache) {
      return [];
    }
    
    try {
      const history = await this.cache.get<ClipboardContent[]>('clipboard:history');
      return history || [];
    } catch (error) {
      console.error('[CLIPBOARD] Error getting history:', error);
      return [];
    }
  }
  
  /**
   * Add to clipboard history (if cache available)
   */
  private async addToHistory(content: ClipboardContent): Promise<void> {
    if (!this.cache) return;
    
    try {
      const history = await this.getHistory();
      history.unshift(content);
      
      // Keep only last 50 items
      const trimmedHistory = history.slice(0, 50);
      
      await this.cache.set('clipboard:history', trimmedHistory);
    } catch (error) {
      console.error('[CLIPBOARD] Error adding to history:', error);
    }
  }
}