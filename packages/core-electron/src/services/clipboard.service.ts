// packages/core-electron/src/services/clipboard.service.ts
import type { IClipboard, ClipboardData, ICacheAdapter } from '@notion-clipper/core-shared';
import EventEmitter from 'events';

export class ElectronClipboardService extends EventEmitter {
  private watchInterval?: NodeJS.Timeout;
  private lastContent: string | null = null;
  
  constructor(
    private adapter: IClipboard,
    private cache?: ICacheAdapter
  ) {
    super();
  }
  
  async getContent(): Promise<ClipboardData | null> {
    const content = await this.adapter.readText();
    if (!content) return null;
    
    return {
      type: 'text',
      text: content,
      timestamp: Date.now()
    };
  }
  
  async setContent(data: ClipboardData): Promise<void> {
    if (data.text) {
      await this.adapter.writeText(data.text);
    }
  }
  
  startWatching(intervalMs: number = 500): void {
    if (this.watchInterval) return;
    
    this.watchInterval = setInterval(async () => {
      const current = await this.adapter.readText();
      if (current && current !== this.lastContent) {
        this.lastContent = current;
        this.emit('changed', {
          type: 'text',
          text: current,
          timestamp: Date.now()
        });
      }
    }, intervalMs);
  }
  
  stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
    }
  }
}