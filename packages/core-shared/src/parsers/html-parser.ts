import type { NotionBlock } from '../types';

export class HTMLParser {
    parse(html: string): NotionBlock[] {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const blocks: NotionBlock[] = [];

        const processNode = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text) {
                    blocks.push({
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{ type: 'text', text: { content: text } }]
                        }
                    });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;

                switch (element.tagName.toLowerCase()) {
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                        const level = parseInt(element.tagName[1]);
                        blocks.push({
                            type: `heading_${level}`,
                            [`heading_${level}`]: {
                                rich_text: [{ type: 'text', text: { content: element.textContent || '' } }]
                            }
                        });
                        break;

                    case 'p':
                        blocks.push({
                            type: 'paragraph',
                            paragraph: {
                                rich_text: [{ type: 'text', text: { content: element.textContent || '' } }]
                            }
                        });
                        break;

                    case 'code':
                    case 'pre':
                        blocks.push({
                            type: 'code',
                            code: {
                                rich_text: [{ type: 'text', text: { content: element.textContent || '' } }],
                                language: 'plain text'
                            }
                        });
                        break;

                    default:
                        element.childNodes.forEach(processNode);
                }
            }
        };

        doc.body.childNodes.forEach(processNode);
        return blocks;
    }
}