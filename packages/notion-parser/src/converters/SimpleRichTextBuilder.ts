import type { NotionRichText } from '../types/notion';

/**
 * Builder simplifié pour le rich text Notion
 * Évite la complexité excessive et se concentre sur les résultats
 */
export class SimpleRichTextBuilder {
    /**
     * Parse du markdown vers rich text de façon simple et efficace
     */
    static fromMarkdown(text: string): NotionRichText[] {
        if (!text) return [];

        // Pour l'instant, on fait un parsing simple mais efficace
        // Cela évite les bugs complexes du RichTextBuilder original
        
        const segments: NotionRichText[] = [];
        let currentPos = 0;
        
        // Patterns simples dans l'ordre de priorité
        const patterns = [
            { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
            { regex: /\*([^*]+)\*/g, type: 'italic' },
            { regex: /`([^`]+)`/g, type: 'code' },
            { regex: /~~([^~]+)~~/g, type: 'strikethrough' },
            { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' }
        ];

        let remainingText = text;
        let processedText = '';

        // Traitement simple : on remplace les patterns un par un
        while (remainingText.length > 0) {
            let foundMatch = false;
            let earliestMatch: { index: number; length: number; replacement: NotionRichText; originalLength: number } | null = null;

            // Chercher le premier match de tous les patterns
            for (const pattern of patterns) {
                pattern.regex.lastIndex = 0; // Reset regex
                const match = pattern.regex.exec(remainingText);
                
                if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
                    let richText: NotionRichText;
                    
                    if (pattern.type === 'link') {
                        richText = {
                            type: 'text',
                            text: { content: match[1], link: { url: match[2] } },
                            annotations: {
                                bold: false,
                                italic: false,
                                strikethrough: false,
                                underline: false,
                                code: false,
                                color: 'default'
                            }
                        };
                    } else {
                        richText = {
                            type: 'text',
                            text: { content: match[1] },
                            annotations: {
                                bold: pattern.type === 'bold',
                                italic: pattern.type === 'italic',
                                strikethrough: pattern.type === 'strikethrough',
                                underline: false,
                                code: pattern.type === 'code',
                                color: 'default'
                            }
                        };
                    }

                    earliestMatch = {
                        index: match.index,
                        length: match[1].length,
                        replacement: richText,
                        originalLength: match[0].length
                    };
                }
            }

            if (earliestMatch) {
                // Ajouter le texte avant le match
                if (earliestMatch.index > 0) {
                    const beforeText = remainingText.substring(0, earliestMatch.index);
                    if (beforeText) {
                        segments.push({
                            type: 'text',
                            text: { content: beforeText },
                            annotations: {
                                bold: false,
                                italic: false,
                                strikethrough: false,
                                underline: false,
                                code: false,
                                color: 'default'
                            }
                        });
                    }
                }

                // Ajouter le match formaté
                segments.push(earliestMatch.replacement);

                // Continuer avec le reste du texte
                remainingText = remainingText.substring(earliestMatch.index + earliestMatch.originalLength);
                foundMatch = true;
            } else {
                // Aucun match trouvé, ajouter le reste comme texte normal
                if (remainingText) {
                    segments.push({
                        type: 'text',
                        text: { content: remainingText },
                        annotations: {
                            bold: false,
                            italic: false,
                            strikethrough: false,
                            underline: false,
                            code: false,
                            color: 'default'
                        }
                    });
                }
                break;
            }
        }

        // Si aucun formatage trouvé, retourner le texte simple
        if (segments.length === 0) {
            return [{
                type: 'text',
                text: { content: text },
                annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: 'default'
                }
            }];
        }

        return segments;
    }

    /**
     * Créer un rich text simple sans formatage
     */
    static createPlainText(text: string): NotionRichText[] {
        if (!text) return [];
        
        return [{
            type: 'text',
            text: { content: text },
            annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
            }
        }];
    }

    /**
     * Créer un rich text avec formatage simple
     */
    static createFormattedText(text: string, annotations: Partial<{
        bold: boolean;
        italic: boolean;
        strikethrough: boolean;
        underline: boolean;
        code: boolean;
        color: string;
    }>): NotionRichText[] {
        if (!text) return [];
        
        return [{
            type: 'text',
            text: { content: text },
            annotations: {
                bold: annotations.bold || false,
                italic: annotations.italic || false,
                strikethrough: annotations.strikethrough || false,
                underline: annotations.underline || false,
                code: annotations.code || false,
                color: (annotations.color as any) || 'default'
            }
        }];
    }
}