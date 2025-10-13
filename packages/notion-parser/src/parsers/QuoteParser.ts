import type { TokenStream } from '../types/tokens';
import type { ASTNode } from '../types/ast';
import { BaseBlockParser } from './BlockParser';
import { RichTextBuilder } from '../converters/RichTextBuilder';

/**
 * Parser pour les blockquotes et callouts
 * ✅ PATCH #2: Retrait complet des > selon les spécifications
 */
export class QuoteParser extends BaseBlockParser {
    priority = 85;

    canParse(stream: TokenStream): boolean {
        const token = stream.peek();
        return token?.type === 'QUOTE_BLOCK';
    }

    parse(stream: TokenStream): ASTNode | null {
        const token = stream.peek();
        if (!token || token.type !== 'QUOTE_BLOCK') {
            return null;
        }

        const quoteToken = stream.next()!;
        const content = this.extractBlockquoteContent(quoteToken.content);

        // ✅ FIX: Ne pas traiter les callouts ou toggle headings ici
        if (content.match(/^\[!(\w+)\]/) || content.match(/^#{1,3}\s+/)) {
            return null;
        }

        // Chaque ligne de citation = un bloc séparé (limitation Notion API)
        const richText = RichTextBuilder.fromMarkdown(content);

        return this.createNode('quote', content, {
            richText
        });
    }

    /**
     * ✅ PATCH #2: Extrait le contenu en retirant TOUS les > au début
     */
    private extractBlockquoteContent(line: string): string {
        let content = line.trim();

        // ✅ SOLUTION SIMPLE: Retirer TOUS les > consécutifs au début
        while (content.startsWith('>')) {
            content = content.substring(1).trim();  // Retire > et trim
        }

        return content;
    }


}

/**
 * Parser pour les callouts (> [!type])
 */
/**
 * ✅ Parser pour les callouts (markdown ET HTML)
 */
export class CalloutParser extends BaseBlockParser {
    priority = 90;

    canParse(stream: TokenStream): boolean {
        const token = stream.peek();
        return token?.type === 'CALLOUT';
    }

    parse(stream: TokenStream): ASTNode | null {
        const token = this.consumeToken(stream);
        if (!token) return null;

        const calloutType = token.metadata?.calloutType || 'note';
        const icon = token.metadata?.icon || '📝';
        const color = token.metadata?.color || 'gray';
        const content = token.content || '';

        // Parser le rich text
        const richText = RichTextBuilder.fromMarkdown(content);

        return this.createNode('callout', content, {
            calloutType,
            icon,
            color,
            richText
        });
    }



}