// packages/adapters/webextension/src/clipboard.adapter.ts
import type { IClipboard, ClipboardContent } from '@notion-clipper/core-shared';

/**
 * WebExtension Clipboard Adapter
 * Uses Navigator Clipboard API (limited compared to Electron)
 * Note: Web extensions have security restrictions on clipboard access
 */
export class WebExtensionClipboardAdapter implements IClipboard {
  /**
   * Read clipboard content
   * Note: Only works when user gives permission via user gesture
   */
  async read(): Promise<ClipboardContent | null> {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        console.warn('Clipboard API not available');
        return null;
      }

      const text = await navigator.clipboard.readText();
      if (!text) return null;

      return {
        type: 'text',
        data: text,
        content: text,
        text: text,
        timestamp: Date.now(),
        hash: this.simpleHash(text),
        metadata: {}
      };
    } catch (error) {
      console.error('Clipboard read error:', error);
      return null;
    }
  }

  /**
   * Write content to clipboard
   */
  async write(content: ClipboardContent): Promise<void> {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard API not available');
      }

      // Extract text from content
      const text = content.text || content.data?.toString() || '';
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Clipboard write error:', error);
      throw error;
    }
  }

  /**
   * Check if clipboard has content
   */
  async hasContent(): Promise<boolean> {
    try {
      const content = await this.read();
      return content !== null && content.text !== '';
    } catch {
      return false;
    }
  }

  /**
   * Get available formats
   * Note: Web extensions have limited format detection
   */
  async getAvailableFormats(): Promise<string[]> {
    // Web extensions primarily support text/plain
    const hasContent = await this.hasContent();
    return hasContent ? ['text/plain'] : [];
  }

  /**
   * Clear clipboard
   */
  async clear(): Promise<void> {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard API not available');
      }

      await navigator.clipboard.writeText('');
    } catch (error) {
      console.error('Clipboard clear error:', error);
    }
  }

  /**
   * Simple hash function for clipboard content
   * Used to detect changes
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}