import type { NotionBlock, ClipboardContent } from '../types';
import { MarkdownParser } from '../parsers/markdown-parser';
import { HTMLParser } from '../parsers/html-parser';

export class NotionBlocksConverter {
    private markdownParser = new MarkdownParser();
    private htmlParser = new HTMLParser();

    convert(content: ClipboardContent): NotionBlock[] {
        switch (content.type) {
            case 'text':
                return this.convertText(content.content);

            case 'html':
                return this.htmlParser.parse(content.content);

            case 'code':
                return [{
                    type: 'code',
                    code: {
                        rich_text: [{ type: 'text', text: { content: content.content } }],
                        language: content.metadata?.language || 'plain text'
                    }
                }];

            case 'url':
                return [{
                    type: 'bookmark',
                    bookmark: {
                        url: content.content
                    }
                }];

            default:
                return [{
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: content.content } }]
                    }
                }];
        }
    }

    private convertText(text: string): NotionBlock[] {
        // Détection simple de markdown
        if (this.isMarkdown(text)) {
            return this.markdownParser.parse(text);
        }

        // Sinon, paragraphe simple
        return [{
            type: 'paragraph',
            paragraph: {
                rich_text: [{ type: 'text', text: { content: text } }]
            }
        }];
    }

    private isMarkdown(text: string): boolean {
        const markdownPatterns = [
            /^#{1,6}\s/m,        // Headers
            /^\*\*.*\*\*/m,      // Bold
            /^\*.*\*/m,          // Italic
            /^\[.*\]\(.*\)/m,    // Links
            /^```/m,             // Code blocks
            /^- /m,              // Lists
            /^\d+\. /m           // Numbered lists
        ];

        return markdownPatterns.some(pattern => pattern.test(text));
    }
}