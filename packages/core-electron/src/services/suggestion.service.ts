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
    async getHybridSuggestions(
        content: string,
        pages: NotionPage[],
        favorites: string[],
        usageHistory: Record<string, number> = {}
    ): Promise<NotionPage[]> {
        const suggestions = await this.getSuggestions(content, pages, favorites, {
            maxSuggestions: 5,
            includeRecent: true,
            includeFavorites: true,
            usageHistory
        });

        return suggestions.map(s => s.page);
    }

    /**
     * Get default suggestions when no content or no matches
     */
    private getDefaultSuggestions(
        pages: NotionPage[],
        favorites: string[],
        maxSuggestions: number
    ): SuggestionResult[] {
        // Return favorites first, then recent
        const favoritePages = pages
            .filter(p => favorites.includes(p.id))
            .map(page => ({
                page,
                score: 5,
                reasons: ['Page favorite']
            }));

        const recentPages = pages
            .filter(p => !favorites.includes(p.id))
            .sort((a, b) =>
                new Date(b.last_edited_time).getTime() - new Date(a.last_edited_time).getTime()
            )
            .slice(0, maxSuggestions - favoritePages.length)
            .map(page => ({
                page,
                score: 3,
                reasons: ['Page récente']
            }));

        return [...favoritePages, ...recentPages].slice(0, maxSuggestions);
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