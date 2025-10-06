import type { IClipboard, ClipboardContent } from '@notion-clipper/core-shared';
import { hashContent } from '@notion-clipper/core-shared';

export class WebClipboardAdapter implements IClipboard {
    async read(): Promise<ClipboardContent | null> {
        try {
            if (!navigator.clipboard) {
                console.warn('Clipboard API not available');
                return null;
            }

            const text = await navigator.clipboard.readText();
            if (!text) return null;

            return {
                type: this.detectType(text),
                data: text,
                content: text,
                timestamp: Date.now(),
                hash: hashContent(text),
                metadata: this.extractMetadata(text)
            };
        } catch (error) {
            console.error('Clipboard read error:', error);
            return null;
        }
    }

    async write(content: ClipboardContent): Promise<void> {
        if (!navigator.clipboard) {
            throw new Error('Clipboard API not available');
        }
        await navigator.clipboard.writeText(content.content);
    }

    async hasContent(): Promise<boolean> {
        try {
            const content = await this.read();
            return content !== null;
        } catch {
            return false;
        }
    }

    async getAvailableFormats(): Promise<string[]> {
        return ['text/plain'];
    }

    async clear(): Promise<void> {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText('');
        }
    }

    private detectType(text: string): 'text' | 'url' | 'code' | 'html' {
        if (text.startsWith('http://') || text.startsWith('https://')) {
            return 'url';
        }
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            return 'html';
        }
        if (text.includes('function') || text.includes('const ') || text.includes('import ')) {
            return 'code';
        }
        return 'text';
    }

    private extractMetadata(text: string): Record<string, any> {
        const metadata: Record<string, any> = {};

        if (text.startsWith('http')) {
            try {
                const url = new URL(text);
                metadata.url = text;
                metadata.title = url.hostname;
            } catch { }
        }

        return metadata;
    }
}