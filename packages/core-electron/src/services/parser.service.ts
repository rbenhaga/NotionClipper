// packages/core-electron/src/services/parser.service.ts
import type { NotionBlock } from '@notion-clipper/core-shared';
import { parseContent } from '@notion-clipper/core-shared';

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
     * Parse content and convert to Notion blocks using the new parser
     */
    async parse(content: string, type: ContentType = 'auto'): Promise<ParseResult> {
        if (!content || !content.trim()) {
            return {
                type: 'text',
                blocks: []
            };
        }

        try {
            // Use the new parser with full capabilities
            const result = parseContent(content, {
                contentType: type === 'auto' ? 'auto' : (type as any),
                maxBlocks: 100,

                detection: {
                    enableMarkdownDetection: true,
                    enableCodeDetection: true,
                    enableTableDetection: true,
                    enableUrlDetection: true,
                    enableHtmlDetection: true
                },

                conversion: {
                    preserveFormatting: true,
                    convertLinks: true,
                    convertImages: true,
                    convertTables: true,
                    convertCode: true
                },

                formatting: {
                    removeEmptyBlocks: true,
                    normalizeWhitespace: true,
                    trimRichText: true
                },

                validation: {
                    strictMode: false,
                    validateRichText: true,
                    validateBlockStructure: true
                },

                includeValidation: true
            }) as any;

            return {
                type: this.mapDetectedType(result.metadata?.detectedType || type),
                blocks: result.blocks || [],
                metadata: {
                    confidence: result.metadata?.confidence,
                    originalLength: result.metadata?.originalLength,
                    blockCount: result.metadata?.blockCount,
                    processingTime: result.metadata?.processingTime,
                    validation: result.validation
                }
            };
        } catch (error) {
            console.error('[PARSER] Error parsing content with new parser:', error);

            // Fallback to simple text parsing
            return {
                type: 'text',
                blocks: this.parseText(content),
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }

    /**
     * Map detected types from new parser to old ContentType
     */
    private mapDetectedType(detectedType: string): ContentType {
        switch (detectedType) {
            case 'markdown': return 'markdown';
            case 'code': return 'code';
            case 'url': return 'url';
            case 'table':
            case 'csv':
            case 'tsv': return 'table';
            case 'html': return 'html';
            case 'text':
            default: return 'text';
        }
    }

    /**
     * Legacy detect content type (kept for fallback)
     * The new parser handles detection automatically
     */
    private detectType(content: string): ContentType {
        // This method is now mainly used as fallback
        // The new parser has much better detection capabilities
        const trimmed = content.trim();

        if (this.isUrl(trimmed)) return 'url';
        if (this.isJson(trimmed)) return 'json';
        if (trimmed.startsWith('<') && trimmed.includes('</')) return 'html';

        const lines = trimmed.split('\n');
        if (lines.length > 1 && (lines[0].includes('\t') || lines[0].split(',').length > 1)) {
            return 'table';
        }

        if (trimmed.match(/^#{1,6}\s/) || trimmed.includes('```') ||
            trimmed.match(/^[\*\-]\s/) || trimmed.match(/^\d+\.\s/)) {
            return 'markdown';
        }

        if (lines.length > 3 && (trimmed.includes('function') || trimmed.includes('const ') ||
            trimmed.includes('class ') || (trimmed.includes('{') && trimmed.includes('}')))) {
            return 'code';
        }

        return 'text';
    }

    private isJson(content: string): boolean {
        if (!((content.startsWith('{') && content.endsWith('}')) ||
            (content.startsWith('[') && content.endsWith(']')))) {
            return false;
        }
        try {
            JSON.parse(content);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fallback text parsing (simple implementation)
     * Used only when the new parser fails
     */
    private parseText(content: string): NotionBlock[] {
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            return [{
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: content || '' }
                    }]
                }
            } as NotionBlock];
        }

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