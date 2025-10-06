import { clipboard } from 'electron';
import type { IClipboard, ClipboardContent } from '@notion-clipper/core-shared';
import { hashContent } from '@notion-clipper/core-shared';

export class ElectronClipboardAdapter implements IClipboard {
    async read(): Promise<ClipboardContent | null> {
        const formats = clipboard.availableFormats();

        if (formats.includes('text/plain')) {
            const text = clipboard.readText();
            if (!text) return null;

            return {
                type: this.detectType(text),
                data: text,
                content: text,
                timestamp: Date.now(),
                hash: hashContent(text),
                metadata: this.extractMetadata(text)
            };
        }

        if (formats.includes('image/png')) {
            const image = clipboard.readImage();
            const buffer = image.toPNG();

            return {
                type: 'image',
                data: buffer,
                content: buffer.toString('base64'),
                timestamp: Date.now(),
                hash: hashContent(buffer.toString()),
                metadata: {
                    imageFormat: 'png'
                }
            };
        }

        return null;
    }

    async write(content: ClipboardContent): Promise<void> {
        if (content.type === 'text') {
            clipboard.writeText(content.content);
        } else if (content.type === 'image') {
            // TODO: Handle image
        }
    }

    async hasContent(): Promise<boolean> {
        return clipboard.availableFormats().length > 0;
    }

    async getAvailableFormats(): Promise<string[]> {
        return clipboard.availableFormats();
    }

    async clear(): Promise<void> {
        clipboard.clear();
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