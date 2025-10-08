// packages/core-web/src/services/clipboard.service.ts
import type { IClipboard, ClipboardContent } from '@notion-clipper/core-shared';

/**
 * Web Clipboard Service
 * Browser-only implementation using navigator.clipboard API
 */
export class WebClipboardService {
    constructor(private adapter: IClipboard) { }

    /**
     * Get clipboard content
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
    async setContent(data: ClipboardContent | string): Promise<void> {
        try {
            // Si c'est une string simple, convertir en ClipboardContent
            if (typeof data === 'string') {
                const content: ClipboardContent = {
                    type: 'text',
                    data: data,
                    content: data,
                    text: data,
                    timestamp: Date.now(),
                    hash: this.simpleHash(data)
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
     * Check if clipboard API is available
     */
    isAvailable(): boolean {
        return typeof navigator !== 'undefined' &&
            'clipboard' in navigator &&
            typeof navigator.clipboard.readText === 'function';
    }

    /**
     * Simple hash function for clipboard content
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