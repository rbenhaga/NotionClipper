import { marked } from 'marked';
import type { NotionBlock } from '../types';

export class MarkdownParser {
    parse(markdown: string): NotionBlock[] {
        const lines = markdown.split('\n');
        const blocks: NotionBlock[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            // Heading
            if (line.startsWith('# ')) {
                blocks.push({
                    type: 'heading_1',
                    heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] }
                });
            } else if (line.startsWith('## ')) {
                blocks.push({
                    type: 'heading_2',
                    heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3) } }] }
                });
            } else if (line.startsWith('### ')) {
                blocks.push({
                    type: 'heading_3',
                    heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4) } }] }
                });
            }
            // Bullet list
            else if (line.match(/^[\*\-\+]\s+/)) {
                blocks.push({
                    type: 'bulleted_list_item',
                    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] }
                });
            }
            // Numbered list
            else if (line.match(/^\d+\.\s+/)) {
                blocks.push({
                    type: 'numbered_list_item',
                    numbered_list_item: { rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\.\s+/, '') } }] }
                });
            }
            // Paragraph
            else {
                blocks.push({
                    type: 'paragraph',
                    paragraph: { rich_text: [{ type: 'text', text: { content: line } }] }
                });
            }
        }

        return blocks;
    }
}

export const markdownParser = new MarkdownParser();