// packages/core-electron/src/services/suggestion.service.ts
import type { NotionPage, NotionDatabase } from '@notion-clipper/core-shared';
import { NLPService } from './nlp.service';

export interface SuggestionOptions {
    maxSuggestions?: number;
    includeRecent?: boolean;
    includeFavorites?: boolean;
    usageHistory?: Record<string, number>;
}

export interface SuggestionResult {
    page: NotionPage | NotionDatabase;
    score: number;
    reasons: string[];
}

/**
 * Electron Suggestion Service
 * Uses NLP to suggest relevant pages based on content
 */
export class ElectronSuggestionService {
    private nlpService: NLPService;

    constructor() {
        this.nlpService = new NLPService();
    }

    /**
     * Get page suggestions based on content
     */
    async getSuggestions(
        content: string,
        pages: NotionPage[],
        favorites: string[] = [],
        options: SuggestionOptions = {}
    ): Promise<SuggestionResult[]> {
        const { maxSuggestions = 10 } = options;

        // Si pas de contenu, retourner favoris + récents
        if (!content || !content.trim()) {
            return this.getDefaultSuggestions(pages, favorites, maxSuggestions);
        }

        try {
            // 1. Extraire les mots-clés du contenu
            const keywords = this.nlpService.extractKeywords(content, 10);

            if (keywords.length === 0) {
                return this.getDefaultSuggestions(pages, favorites, maxSuggestions);
            }

            console.log('[SUGGESTION] Keywords extracted:', keywords);

            // 2. Scorer chaque page
            const scoredPages: SuggestionResult[] = pages
                .filter(p => !p.archived && !p.in_trash)
                .map(page => {
                    const reasons: string[] = [];
                    let score = 0;

                    const titleLower = (page.title || '').toLowerCase();
                    const contentLower = content.toLowerCase();

                    // 3. Score de correspondance du titre (le plus important)
                    // Correspondance exacte
                    if (titleLower === contentLower) {
                        score += 50;
                        reasons.push('Titre correspond exactement');
                    }
                    // Titre contient le contenu
                    else if (titleLower.includes(contentLower)) {
                        score += 30;
                        reasons.push('Titre contient le texte');
                    }
                    // Contenu contient le titre
                    else if (contentLower.includes(titleLower)) {
                        score += 25;
                        reasons.push('Texte contient le titre');
                    }

                    // 4. Score par mots-clés
                    keywords.forEach(keyword => {
                        const kw = keyword.toLowerCase();
                        if (titleLower.includes(kw)) {
                            score += 8;
                            reasons.push(`Mot-clé: "${keyword}"`);
                        }
                    });

                    // 5. Score de récence (last_edited_time)
                    if (page.last_edited_time) {
                        const hoursSinceEdit = (Date.now() - new Date(page.last_edited_time).getTime()) / (1000 * 60 * 60);

                        if (hoursSinceEdit < 1) {
                            score += 8;
                            reasons.push('Modifiée il y a < 1h');
                        } else if (hoursSinceEdit < 24) {
                            score += 6;
                            reasons.push('Modifiée aujourd\'hui');
                        } else if (hoursSinceEdit < 48) {
                            score += 5;
                            reasons.push('Modifiée hier');
                        } else if (hoursSinceEdit < 168) {
                            score += 4;
                            reasons.push('Modifiée cette semaine');
                        } else if (hoursSinceEdit < 720) {
                            score += 2;
                            reasons.push('Modifiée ce mois');
                        }
                    }

                    // 6. Bonus favori
                    if (favorites.includes(page.id)) {
                        score += 5;
                        reasons.push('⭐ Favori');
                    }

                    // 7. Bonus page racine
                    if (!page.parent || page.parent.type === 'workspace') {
                        score += 2;
                        reasons.push('Page principale');
                    }

                    return { page, score, reasons };
                });

            // 3. Trier par score puis par date si égalité
            const suggestions = scoredPages
                .filter(s => s.score > 0)
                .sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    // Si scores égaux, trier par date
                    const dateA = new Date(a.page.last_edited_time || 0).getTime();
                    const dateB = new Date(b.page.last_edited_time || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, maxSuggestions);

            console.log(`[SUGGESTION] Found ${suggestions.length} suggestions, top scores:`,
                suggestions.slice(0, 3).map(s => ({ title: s.page.title, score: s.score }))
            );

            return suggestions;

        } catch (error) {
            console.error('[SUGGESTION] Error:', error);
            return this.getDefaultSuggestions(pages, favorites, maxSuggestions);
        }
    }

    /**
     * Get hybrid suggestions (NLP + usage + favorites)
     */
    /**
     * Get hybrid suggestions combining NLP, favorites, and usage history
     */
    async getHybridSuggestions(
        content: string,
        pages: NotionPage[],
        favorites: string[] = [],
        usageHistory: Record<string, number> = {}
    ): Promise<SuggestionResult[]> {
        if (!content || !content.trim()) {
            return this.getDefaultSuggestions(pages, favorites, 5);
        }

        return this.getSuggestions(content, pages, favorites, {
            maxSuggestions: 5,
            includeRecent: true,
            includeFavorites: true,
            usageHistory
        });
    }

    /**
     * Get default suggestions when no content is provided
     */
    private getDefaultSuggestions(
        pages: NotionPage[],
        favorites: string[],
        maxSuggestions: number
    ): SuggestionResult[] {
        return pages
            .filter(p => !p.archived && !p.in_trash)
            .map(page => {
                let score = 0;
                const reasons: string[] = [];

                // Favoris
                if (favorites.includes(page.id)) {
                    score += 10;
                    reasons.push('⭐ Favori');
                }

                // Récence
                if (page.last_edited_time) {
                    const daysSince = this.daysSince(page.last_edited_time);
                    if (daysSince < 7) {
                        score += 5;
                        reasons.push('Récente');
                    }
                }

                return { page, score, reasons };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSuggestions);
    }

    /**
     * Calculate days since a date
     */
    private daysSince(dateString: string): number {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
}