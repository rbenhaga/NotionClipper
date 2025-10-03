import { NotionBlock } from '../types/notion.types.js';
import { DetectionResult } from './content-detector.js';
/**
 * Parsing options for Notion blocks
 */
export interface ParsingOptions {
    maxRichTextLength?: number;
    maxBlocksPerRequest?: number;
    maxEquationLength?: number;
    maxUrlLength?: number;
    contentType?: string;
    metadata?: Record<string, any>;
}
/**
 * Rich text element for Notion
 */
export interface NotionRichText {
    type: 'text' | 'mention' | 'equation';
    text?: {
        content: string;
        link?: {
            url: string;
        } | null;
    };
    annotations?: {
        bold?: boolean;
        italic?: boolean;
        strikethrough?: boolean;
        underline?: boolean;
        code?: boolean;
        color?: string;
    };
    plain_text?: string;
    href?: string | null;
}
/**
 * Notion Markdown Parser with TypeScript support
 * Extracted from notionMarkdownParser.js with enhanced typing
 */
export declare class NotionMarkdownParser {
    private readonly patterns;
    private readonly limits;
    private readonly handlers;
    constructor();
    /**
     * Parse content to Notion blocks based on detected type
     */
    parseContent(content: string, detection: DetectionResult, options?: ParsingOptions): NotionBlock[];
    /**
     * Convert markdown to Notion blocks
     */
    private markdownToNotionBlocks;
    /**
     * Convert plain text to Notion blocks
     */
    private textToNotionBlocks;
    /**
     * Convert code to Notion blocks
     */
    private codeToNotionBlocks;
    /**
     * Convert URL to Notion blocks
     */
    private urlToNotionBlocks;
    /**
     * Convert image to Notion blocks
     */
    private imageToNotionBlocks;
    /**
     * Convert table to Notion blocks
     */
    private tableToNotionBlocks;
    /**
     * Convert CSV to Notion blocks
     */
    private csvToNotionBlocks;
    /**
     * Convert JSON to Notion blocks
     */
    private jsonToNotionBlocks;
    /**
     * Convert HTML to Notion blocks
     */
    private htmlToNotionBlocks;
    /**
     * Convert XML to Notion blocks
     */
    private xmlToNotionBlocks;
    private createParagraphBlock;
    private createHeadingBlock;
    private createCodeBlock;
    private createBulletListBlock;
    private createNumberedListBlock;
    private createCheckboxBlock;
    private createQuoteBlock;
    private createDividerBlock;
    private processTextBlock;
    private parseRichText;
    private splitTextWithFormatting;
}
export declare const notionMarkdownParser: NotionMarkdownParser;
//# sourceMappingURL=notion-markdown-parser.d.ts.map