// packages/ui/src/hooks/useSuggestions.ts
import { useState, useCallback } from 'react';
import type { NotionPage } from '../types';

export interface SuggestionResult {
    page: NotionPage;
    score: number;
    reason: string;
}

export interface UseSuggestionsReturn {
    suggestions: SuggestionResult[];
    loading: boolean;
    getSuggestions: (content: string, pages: NotionPage[], favorites: string[]) => Promise<SuggestionResult[]>;
    clearSuggestions: () => void;
}

/**
 * Hook pour gérer les suggestions de pages basées sur le contenu
 * Compatible avec Electron et WebExtension
 * 
 * @param getSuggestionsFn - Fonction callback pour obtenir les suggestions depuis le service
 */
export function useSuggestions(
    getSuggestionsFn?: (content: string, pages: NotionPage[], favorites: string[]) => Promise<SuggestionResult[]>
): UseSuggestionsReturn {
    const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
    const [loading, setLoading] = useState(false);

    /**
     * Obtenir les suggestions pour un contenu donné
     */
    const getSuggestions = useCallback(async (
        content: string,
        pages: NotionPage[],
        favorites: string[]
    ): Promise<SuggestionResult[]> => {
        if (!content || !pages.length) {
            setSuggestions([]);
            return [];
        }

        setLoading(true);
        try {
            let results: SuggestionResult[];

            if (getSuggestionsFn) {
                // Utiliser la fonction callback fournie (IPC Electron ou message extension)
                results = await getSuggestionsFn(content, pages, favorites);
            } else {
                // Fallback : suggestions simples basées sur les favoris et récence
                results = pages
                    // ✅ CORRECTION : Utiliser l'opérateur de coalescence nulle
                    .filter(page => !(page.archived ?? false) && !(page.in_trash ?? false))
                    .map(page => {
                        let score = 0;
                        let reason = '';

                        // Favoris
                        if (favorites.includes(page.id)) {
                            score += 50;
                            reason = 'Favori';
                        }

                        // Récence
                        if (page.last_edited_time) {
                            const hoursSinceEdit = (Date.now() - new Date(page.last_edited_time).getTime()) / (1000 * 60 * 60);
                            if (hoursSinceEdit < 24) {
                                score += 30;
                                reason = reason ? `${reason}, Édité récemment` : 'Édité récemment';
                            }
                        }

                        return { page, score, reason };
                    })
                    .filter(result => result.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10);
            }

            setSuggestions(results);
            return results;
        } catch (error) {
            console.error('Error getting suggestions:', error);
            setSuggestions([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [getSuggestionsFn]);

    /**
     * Clear suggestions
     */
    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
    }, []);

    return {
        suggestions,
        loading,
        getSuggestions,
        clearSuggestions
    };
}