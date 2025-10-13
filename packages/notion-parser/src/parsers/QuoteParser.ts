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

        // ✅ Vérifier si c'est un callout ou toggle heading (déjà traité ailleurs)
        if (content.match(/^\[!(\w+)\]/) || content.match(/^#{1,3}\s+/)) {
            // Ce n'est pas une quote simple, laisser les autres parsers s'en occuper
            return null;
        }

        // ✅ CORRECTION: Une seule ligne par bloc de citation (limitation Notion API)
        // Chaque ligne de citation sera un bloc séparé
        return this.createNode('quote', content);
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

    /**
     * ✅ Détermine si les lignes forment un toggle ou une quote simple
     */
    private shouldBeToggle(lines: string[]): boolean {
        // ✅ CORRECTION: Être plus conservateur - la plupart des quotes doivent rester des quotes

        // Si contient des éléments structurés (listes, headings), c'est un toggle
        const hasStructuredContent = lines.some(line =>
            line.match(/^#{1,6}\s/) ||    // Heading
            line.match(/^[-*+]\s/) ||     // Liste
            line.match(/^\d+\.\s/) ||     // Liste numérotée
            line.match(/^\|.*\|/) ||      // Table
            line.match(/^```/)            // Code block
        );

        if (hasStructuredContent) {
            return true;
        }

        // ✅ NOUVELLE HEURISTIQUE: Seulement si explicitement marqué comme toggle
        const firstLine = lines[0] || '';
        if (firstLine.toLowerCase().match(/^(toggle|contenu|section|chapitre)/)) {
            return true;
        }

        // ✅ CORRECTION: Les quotes multi-lignes restent des quotes
        // Seulement si c'est VRAIMENT long (>20 lignes) ET semble structuré
        if (lines.length > 20 && hasStructuredContent) {
            return true;
        }

        // Par défaut, c'est une quote normale
        return false;
    }

    /**
     * ✅ Crée un toggle à partir des lignes
     */
    private createToggleFromLines(lines: string[]): ASTNode {
        // Le premier élément devient le titre du toggle
        const title = lines[0] || 'Toggle';
        const contentLines = lines.slice(1);

        const children: ASTNode[] = [];

        // Parser le contenu restant comme des paragraphes
        if (contentLines.length > 0) {
            const content = contentLines.join('\n');
            if (content.trim()) {
                children.push(this.createNode('paragraph', content));
            }
        }

        return this.createNode('toggle', title, {
            hasChildren: children.length > 0,
            children
        });
    }
}

/**
 * Parser pour les callouts (> [!type])
 */
export class CalloutParser extends BaseBlockParser {
    priority = 90;

    canParse(stream: TokenStream): boolean {
        const token = stream.peek();
        return token?.type === 'CALLOUT' || token?.type === 'CALLOUT_HTML';
    }

    parse(stream: TokenStream): ASTNode | null {
        const calloutToken = this.consumeToken(stream);
        if (!calloutToken) return null;

        const calloutType = calloutToken.metadata?.calloutType || 'note';
        const icon = calloutToken.metadata?.icon || '📝';
        const color = calloutToken.metadata?.color || 'gray';
        let content = calloutToken.content || '';

        // ✅ NOUVEAU: Gestion spéciale pour les callouts HTML
        if (calloutToken.type === 'CALLOUT_HTML') {
            // Pour les callouts HTML, le contenu est sur la ligne suivante
            const contentLines: string[] = [];

            // Collecter la ligne suivante comme contenu
            if (stream.hasNext()) {
                const nextToken = stream.peek();
                if (nextToken && nextToken.type === 'PARAGRAPH') {
                    const contentToken = stream.next()!;
                    contentLines.push(contentToken.content || '');
                }
            }

            content = contentLines.join('\n').trim();
        } else {
            // ✅ COLLECTER LES LIGNES SUIVANTES DU CALLOUT (CONSERVATEUR)
            const contentLines: string[] = [content];
            let consecutiveQuoteLines = 0;
            const maxConsecutiveLines = 10; // Limite pour éviter de consommer trop

            while (stream.hasNext() && consecutiveQuoteLines < maxConsecutiveLines) {
                const nextToken = stream.peek();

                if (!nextToken || nextToken.type === 'EOF') break;

                // Si c'est une continuation de blockquote
                if (nextToken.type === 'QUOTE_BLOCK') {
                    const lineContent = this.extractBlockquoteContent(nextToken.content);

                    // Arrêter si c'est un nouveau callout
                    if (lineContent.match(/^\[!/)) break;

                    // ✅ HEURISTIQUE: Si la ligne semble être une quote indépendante
                    // (commence par une majuscule et n'est pas une continuation logique)
                    if (consecutiveQuoteLines > 0 && this.looksLikeIndependentQuote(lineContent, contentLines[contentLines.length - 1])) {
                        break;
                    }

                    contentLines.push(lineContent);
                    stream.next(); // Consommer
                    consecutiveQuoteLines++;
                } else {
                    break;
                }
            }

            content = contentLines.join('\n').trim();
        }

        // ✅ Parser le rich text
        const richText = RichTextBuilder.fromMarkdown(content);

        return {
            type: 'callout',
            content: content,
            metadata: {
                calloutType,
                icon,
                color,
                richText: richText
            },
            children: []
        };
    }

    private extractBlockquoteContent(line: string): string {
        let content = line.trim();

        while (content.startsWith('>')) {
            content = content.substring(1).trim();
        }

        return content;
    }

    /**
     * ✅ HEURISTIQUE: Détermine si une ligne semble être une quote indépendante
     */
    private looksLikeIndependentQuote(currentLine: string, previousLine: string): boolean {
        // Si la ligne précédente se termine par un point et la nouvelle commence par une majuscule
        if (previousLine.endsWith('.') && /^[A-Z]/.test(currentLine)) {
            return true;
        }

        // Si la nouvelle ligne est très différente en style (ex: commence par "Citation")
        if (currentLine.toLowerCase().startsWith('citation')) {
            return true;
        }

        // Si la ligne précédente était courte et la nouvelle est longue (changement de contexte)
        if (previousLine.length < 20 && currentLine.length > 50) {
            return true;
        }

        return false;
    }

}