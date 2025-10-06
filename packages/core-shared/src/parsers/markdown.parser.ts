import { marked } from 'marked';
import type { NotionBlock } from '../types';

export class MarkdownParser {
    parse(markdown: string): NotionBlock[] {
        const tokens = marked.lexer(markdown);
        const blocks: NotionBlock[] = [];

        for (const token of tokens) {
            switch (token.type) {
                case 'heading':
                    blocks.push({
                        type: `heading_${token.depth}`,
                        [`heading_${token.depth}`]: {
                            rich_text: [{ type: 'text', text: { content: token.text } }]
                        }
                    });
                    break;

                case 'paragraph':
                    blocks.push({
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{ type: 'text', text: { content: token.text } }]
                        }
                    });
                    break;

                case 'code':
                    blocks.push({
                        type: 'code',
                        code: {
                            rich_text: [{ type: 'text', text: { content: token.text } }],
                            language: token.lang || 'plain text'
                        }
                    });
                    break;

                case 'list':
                    token.items.forEach(item => {
                        blocks.push({
                            type: 'bulleted_list_item',
                            bulleted_list_item: {
                                rich_text: [{ type: 'text', text: { content: item.text } }]
                            }
                        });
                    });
                    break;
            }
        }

        return blocks;
    }
}