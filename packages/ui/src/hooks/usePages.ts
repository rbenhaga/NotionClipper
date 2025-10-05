import { useState, useEffect, useCallback } from 'react';
import { NotionPage } from '../types';

export interface UsePagesReturn {
    pages: NotionPage[];
    filteredPages: NotionPage[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: 'suggested' | 'favorites' | 'recent' | 'all';
    setActiveTab: (tab: 'suggested' | 'favorites' | 'recent' | 'all') => void;
    favorites: string[];
    toggleFavorite: (pageId: string) => Promise<void>;
    loadPages: () => Promise<void>;
    loading: boolean;
    selectedPageId: string | null;
    setSelectedPageId: (pageId: string | null) => void;
}

/**
 * Hook pour gérer les pages Notion
 * Compatible avec Electron et WebExtension
 */
export function usePages(
    loadPagesFn?: () => Promise<NotionPage[]>,
    loadFavoritesFn?: () => Promise<string[]>,
    saveFavoritesFn?: (favorites: string[]) => Promise<void>
): UsePagesReturn {
    const [pages, setPages] = useState<NotionPage[]>([]);
    const [filteredPages, setFilteredPages] = useState<NotionPage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'suggested' | 'favorites' | 'recent' | 'all'>('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    const loadPages = useCallback(async () => {
        if (!loadPagesFn) return;

        setLoading(true);
        try {
            const loadedPages = await loadPagesFn();
            setPages(loadedPages);
            setFilteredPages(loadedPages);
        } catch (error) {
            console.error('Error loading pages:', error);
        } finally {
            setLoading(false);
        }
    }, [loadPagesFn]);

    const toggleFavorite = useCallback(async (pageId: string) => {
        const newFavorites = favorites.includes(pageId)
            ? favorites.filter(id => id !== pageId)
            : [...favorites, pageId];

        setFavorites(newFavorites);

        if (saveFavoritesFn) {
            await saveFavoritesFn(newFavorites);
        }
    }, [favorites, saveFavoritesFn]);

    // Charger les favoris au montage
    useEffect(() => {
        if (loadFavoritesFn) {
            loadFavoritesFn().then(setFavorites);
        }
    }, [loadFavoritesFn]);

    // Filtrer les pages selon la recherche et l'onglet actif
    useEffect(() => {
        let filtered = pages;

        // Filtre par recherche
        if (searchQuery) {
            filtered = filtered.filter(page =>
                page.title?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filtre par onglet
        switch (activeTab) {
            case 'favorites':
                filtered = filtered.filter(page => favorites.includes(page.id));
                break;
            case 'recent':
                filtered = [...filtered].sort((a, b) =>
                    new Date(b.last_edited_time || 0).getTime() - new Date(a.last_edited_time || 0).getTime()
                );
                break;
            case 'suggested':
                // Les suggestions sont gérées par une logique externe
                break;
        }

        setFilteredPages(filtered);
    }, [searchQuery, pages, activeTab, favorites]);

    return {
        pages,
        filteredPages,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        favorites,
        toggleFavorite,
        loadPages,
        loading,
        selectedPageId,
        setSelectedPageId
    };
}