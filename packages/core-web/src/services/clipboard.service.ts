// packages/core-web/src/services/clipboard.service.ts
import type { IClipboard, ClipboardData } from '@notion-clipper/core-shared';

/**
 * Web Clipboard Service
 * Browser-only implementation using navigator.clipboard API
 */
export class WebClipboardService {
    constructor(private adapter: IClipboard) { }

    /**
     * Get clipboard content
     */
    async getContent(): Promise<ClipboardData | null> {
        try {
            const text = await this.adapter.readText();
            if (!text) return null;

            return {
                type: 'text',
                text,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[CLIPBOARD] Error reading:', error);
            return null;
        }
    }

    /**
     * Set clipboard content
     */
    async setContent(data: ClipboardData): Promise<void> {
        try {
            if (data.text) {
                await this.adapter.writeText(data.text);
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
            await this.adapter.writeText('');
        } catch (error) {
            console.error('[CLIPBOARD] Error clearing:', error);
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
}