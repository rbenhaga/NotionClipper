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
        const {
            maxSuggestions = 5,
            includeRecent = true,
            includeFavorites = true,
            usageHistory = {}
        } = options;

        if (!content || !content.trim()) {
            return this.getDefaultSuggestions(pages, favorites, maxSuggestions);
        }

        try {
            // Extract keywords from content
            const keywords = this.nlpService.extractKeywords(content, 10);

            if (keywords.length === 0) {
                return this.getDefaultSuggestions(pages, favorites, maxSuggestions);
            }

            // Score each page
            const scoredPages: SuggestionResult[] = pages.map(page => {
                const reasons: string[] = [];
                let score = 0;

                // 1. Keyword matching in title
                const titleLower = page.title.toLowerCase();
                const titleScore = keywords.reduce((acc, keyword) => {
                    if (titleLower.includes(keyword.toLowerCase())) {
                        reasons.push(`Titre contient "${keyword}"`);
                        return acc + 3;
                    }
                    return acc;
                }, 0);
                score += titleScore;

                // 2. Favorite bonus
                if (includeFavorites && favorites.includes(page.id)) {
                    score += 2;
                    reasons.push('Page favorite');
                }

                // 3. Usage frequency
                const usageCount = usageHistory[page.id] || 0;
                if (usageCount > 0) {
                    score += Math.min(usageCount / 2, 2);
                    reasons.push(`Utilisée ${usageCount} fois`);
                }

                // 4. Recent pages bonus
                if (includeRecent) {
                    const daysSinceEdit = this.daysSince(page.last_edited_time);
                    if (daysSinceEdit <= 7) {
                        score += 1;
                        reasons.push('Récemment modifiée');
                    }
                }

                return {
                    page,
                    score,
                    reasons
                };
            });

            // Sort by score and return top suggestions
            const suggestions = scoredPages
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, maxSuggestions);

            console.log(`[SUGGESTION] Found ${suggestions.length} suggestions for content`);

            return suggestions;
        } catch (error) {
            console.error('[SUGGESTION] Error getting suggestions:', error);
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
        const scoredPages: SuggestionResult[] = pages.map(page => {
            const reasons: string[] = [];
            let score = 0;

            if (favorites.includes(page.id)) {
                score += 3;
                reasons.push('Page favorite');
            }

            if (page.last_edited_time) {
                const daysSinceEdit = (Date.now() - new Date(page.last_edited_time).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceEdit < 7) {
                    score += 2;
                    reasons.push('Récemment modifiée');
                }
            }

            return { page, score, reasons };
        });

        return scoredPages
            .filter(s => s.score > 0)
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