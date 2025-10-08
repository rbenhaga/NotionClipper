// packages/core-electron/src/services/parser.service.ts
import type { NotionBlock } from '@notion-clipper/core-shared';

export type ContentType = 'auto' | 'text' | 'markdown' | 'html' | 'code' | 'url' | 'table' | 'json';

export interface ParseResult {
    type: ContentType;
    blocks: NotionBlock[];
    metadata?: Record<string, any>;
}

/**
 * Electron Parser Service
 * Converts different content types to Notion blocks
 */
export class ElectronParserService {

    /**
     * Parse content and convert to Notion blocks
     */
    async parse(content: string, type: ContentType = 'auto'): Promise<ParseResult> {
        if (!content || !content.trim()) {
            return {
                type: 'text',
                blocks: []
            };
        }

        // Auto-detect type if needed
        const detectedType = type === 'auto' ? this.detectType(content) : type;

        let blocks: NotionBlock[] = [];
        let metadata: Record<string, any> = {};

        try {
            switch (detectedType) {
                case 'markdown':
                    blocks = this.parseMarkdown(content);
                    break;

                case 'code':
                    blocks = this.parseCode(content);
                    break;

                case 'url':
                    blocks = this.parseUrl(content);
                    break;

                case 'table':
                    const tableResult = this.parseTable(content);
                    blocks = tableResult.blocks;
                    metadata = tableResult.metadata;
                    break;

                case 'json':
                    blocks = this.parseJson(content);
                    break;

                case 'html':
                    blocks = this.parseHtml(content);
                    break;

                case 'text':
                default:
                    blocks = this.parseText(content);
                    break;
            }
        } catch (error) {
            console.error('[PARSER] Error parsing content:', error);
            // Fallback to plain text
            blocks = this.parseText(content);
        }

        return {
            type: detectedType,
            blocks,
            metadata
        };
    }

    /**
     * Detect content type
     */
    private detectType(content: string): ContentType {
        const trimmed = content.trim();

        // URL detection
        if (this.isUrl(trimmed)) {
            return 'url';
        }

        // JSON detection
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch {
                // Not valid JSON
            }
        }

        // HTML detection
        if (trimmed.startsWith('<') && trimmed.includes('</')) {
            return 'html';
        }

        // Table detection (TSV/CSV)
        const lines = trimmed.split('\n');
        if (lines.length > 1) {
            const firstLine = lines[0];
            if (firstLine.includes('\t') || firstLine.split(',').length > 1) {
                return 'table';
            }
        }

        // Markdown detection (simple heuristics)
        if (trimmed.match(/^#{1,6}\s/) || // Headers
            trimmed.includes('```') ||     // Code blocks
            trimmed.match(/^\*\s/) ||      // Lists
            trimmed.match(/^-\s/) ||
            trimmed.match(/^\d+\.\s/)) {   // Numbered lists
            return 'markdown';
        }

        // Code detection (multiple lines with indentation or braces)
        if (lines.length > 3 && (
            trimmed.includes('function') ||
            trimmed.includes('const ') ||
            trimmed.includes('class ') ||
            (trimmed.includes('{') && trimmed.includes('}'))
        )) {
            return 'code';
        }

        return 'text';
    }

    /**
     * Parse plain text
     */
    private parseText(content: string): NotionBlock[] {
        const lines = content.split('\n').filter(line => line.trim());

        return lines.map(line => ({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [{
                    type: 'text',
                    text: { content: line }
                }]
            }
        } as NotionBlock));
    }

    /**
     * Parse markdown (basic support)
     */
    private parseMarkdown(content: string): NotionBlock[] {
        const lines = content.split('\n');
        const blocks: NotionBlock[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Headers
            const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                blocks.push({
                    object: 'block',
                    type: `heading_${level}` as any,
                    [`heading_${level}`]: {
                        rich_text: [{
                            type: 'text',
                            text: { content: headerMatch[2] }
                        }]
                    }
                } as NotionBlock);
                continue;
            }

            // Code blocks
            if (trimmed.startsWith('```')) {
                continue; // Skip for now
            }

            // Lists
            if (trimmed.match(/^[\*\-]\s/)) {
                blocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: [{
                            type: 'text',
                            text: { content: trimmed.replace(/^[\*\-]\s/, '') }
                        }]
                    }
                } as NotionBlock);
                continue;
            }

            // Numbered lists
            if (trimmed.match(/^\d+\.\s/)) {
                blocks.push({
                    object: 'block',
                    type: 'numbered_list_item',
                    numbered_list_item: {
                        rich_text: [{
                            type: 'text',
                            text: { content: trimmed.replace(/^\d+\.\s/, '') }
                        }]
                    }
                } as NotionBlock);
                continue;
            }

            // Default to paragraph
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: trimmed }
                    }]
                }
            } as NotionBlock);
        }

        return blocks;
    }

    /**
     * Parse code
     */
    private parseCode(content: string): NotionBlock[] {
        return [{
            object: 'block',
            type: 'code',
            code: {
                rich_text: [{
                    type: 'text',
                    text: { content }
                }],
                language: this.detectCodeLanguage(content)
            }
        } as NotionBlock];
    }

    /**
     * Parse URL
     */
    private parseUrl(content: string): NotionBlock[] {
        return [{
            object: 'block',
            type: 'bookmark',
            bookmark: {
                url: content.trim()
            }
        } as NotionBlock];
    }

    /**
     * Parse table (TSV/CSV)
     */
    private parseTable(content: string): { blocks: NotionBlock[]; metadata: Record<string, any> } {
        const lines = content.split('\n').filter(line => line.trim());

        // Detect delimiter
        const delimiter = lines[0].includes('\t') ? '\t' : ',';

        // Parse rows
        const rows = lines.map(line => line.split(delimiter));

        // Create table block (simplified as paragraphs for now)
        const blocks: NotionBlock[] = rows.map(row => ({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [{
                    type: 'text',
                    text: { content: row.join(' | ') }
                }]
            }
        } as NotionBlock));

        return {
            blocks,
            metadata: {
                rowCount: rows.length,
                columnCount: rows[0]?.length || 0,
                delimiter
            }
        };
    }

    /**
     * Parse JSON
     */
    private parseJson(content: string): NotionBlock[] {
        try {
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, 2);

            return [{
                object: 'block',
                type: 'code',
                code: {
                    rich_text: [{
                        type: 'text',
                        text: { content: formatted }
                    }],
                    language: 'json'
                }
            } as NotionBlock];
        } catch {
            return this.parseText(content);
        }
    }

    /**
     * Parse HTML (basic support)
     */
    private parseHtml(content: string): NotionBlock[] {
        // For now, treat as code block
        // A more advanced implementation could convert HTML to Notion blocks
        return [{
            object: 'block',
            type: 'code',
            code: {
                rich_text: [{
                    type: 'text',
                    text: { content }
                }],
                language: 'html'
            }
        } as NotionBlock];
    }

    /**
     * Detect code language
     */
    private detectCodeLanguage(content: string): string {
        if (content.includes('function') || content.includes('const ') || content.includes('let ')) {
            return 'javascript';
        }
        if (content.includes('def ') || content.includes('import ')) {
            return 'python';
        }
        if (content.includes('public class') || content.includes('private ')) {
            return 'java';
        }
        return 'plain text';
    }

    /**
     * Check if string is a URL
     */
    private isUrl(str: string): boolean {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }
}