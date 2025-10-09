// packages/ui/src/hooks/usePages.ts - VERSION FINALE CORRECTE
import { useState, useEffect, useCallback, useMemo } from 'react';
import { NotionPage } from '../types';

export interface UsePagesReturn {
    pages: NotionPage[];
    filteredPages: NotionPage[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: 'suggested' | 'favorites' | 'recent' | 'all';
    setActiveTab: (tab: 'suggested' | 'favorites' | 'recent' | 'all') => void;
    favorites: string[];
    recentPages: NotionPage[];
    toggleFavorite: (pageId: string) => Promise<void>;
    addToRecent: (page: NotionPage) => void;
    loadPages: (forceRefresh?: boolean) => Promise<void>;
    pagesLoading: boolean; // ✅ CORRECTION: pagesLoading au lieu de loading
    selectedPageId: string | null;
    setSelectedPageId: (pageId: string | null) => void;
}

/**
 * Hook pour gérer les pages Notion
 * Compatible avec Electron et WebExtension
 */
export function usePages(
    loadPagesFn?: (forceRefresh?: boolean) => Promise<NotionPage[]>,
    loadFavoritesFn?: () => Promise<string[]>,
    toggleFavoriteFn?: (pageId: string) => Promise<void>, // ✅ CORRECTION: Callback direct pour toggle
    loadRecentPagesFn?: (limit?: number) => Promise<NotionPage[]>, // ✅ CORRECTION: Accepte limit
    initialTab?: 'suggested' | 'favorites' | 'recent' | 'all', // ✅ AJOUT: Tab initial
    content?: string // ✅ AJOUT: Contenu pour suggestions (non utilisé pour l'instant)
): UsePagesReturn {
    const [pages, setPages] = useState<NotionPage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'suggested' | 'favorites' | 'recent' | 'all'>(initialTab || 'all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentPages, setRecentPages] = useState<NotionPage[]>([]);
    const [pagesLoading, setPagesLoading] = useState(false); // ✅ CORRECTION: pagesLoading
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    // Charger les pages initiales
    useEffect(() => {
        if (loadPagesFn) {
            loadPages();
        }
        if (loadFavoritesFn) {
            loadFavorites();
        }
        if (loadRecentPagesFn) {
            loadRecentPages();
        }
    }, []);

    const loadPages = useCallback(async (forceRefresh = false) => {
        if (!loadPagesFn) return;

        setPagesLoading(true);
        try {
            const loadedPages = await loadPagesFn(forceRefresh);
            setPages(loadedPages);
        } catch (error) {
            console.error('Error loading pages:', error);
        } finally {
            setPagesLoading(false);
        }
    }, [loadPagesFn]);

    const loadFavorites = useCallback(async () => {
        if (!loadFavoritesFn) return;

        try {
            const loadedFavorites = await loadFavoritesFn();
            setFavorites(loadedFavorites);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }, [loadFavoritesFn]);

    const loadRecentPages = useCallback(async (limit?: number) => {
        if (!loadRecentPagesFn) return;

        try {
            const loaded = await loadRecentPagesFn(limit);
            setRecentPages(loaded);
        } catch (error) {
            console.error('Error loading recent pages:', error);
        }
    }, [loadRecentPagesFn]);

    const toggleFavorite = useCallback(async (pageId: string) => {
        if (toggleFavoriteFn) {
            // ✅ CORRECTION: Utiliser le callback fourni directement
            await toggleFavoriteFn(pageId);
            
            // Recharger les favoris après le toggle
            if (loadFavoritesFn) {
                const updatedFavorites = await loadFavoritesFn();
                setFavorites(updatedFavorites);
            }
        } else {
            // Fallback: toggle local
            const newFavorites = favorites.includes(pageId)
                ? favorites.filter(id => id !== pageId)
                : [...favorites, pageId];
            setFavorites(newFavorites);
        }
    }, [toggleFavoriteFn, loadFavoritesFn, favorites]);

    const addToRecent = useCallback((page: NotionPage) => {
        setRecentPages(prev => {
            const filtered = prev.filter(p => p.id !== page.id);
            return [page, ...filtered].slice(0, 10);
        });
    }, []);

    // Filtrer les pages selon la recherche et l'onglet actif
    const filteredPages = useMemo(() => {
        let filtered = pages;

        // Filtre par onglet
        if (activeTab === 'favorites') {
            filtered = filtered.filter(page => favorites.includes(page.id));
        } else if (activeTab === 'recent') {
            filtered = recentPages;
        }

        // Filtre par recherche
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(page => {
                const titleMatch = page.title?.toLowerCase().includes(query);
                const emojiMatch = page.icon?.type === 'emoji' 
                    ? page.icon.emoji?.toLowerCase().includes(query)
                    : false;
                return titleMatch || emojiMatch;
            });
        }

        return filtered;
    }, [pages, searchQuery, activeTab, favorites, recentPages]);

    return {
        pages,
        filteredPages,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        favorites,
        recentPages,
        toggleFavorite,
        addToRecent,
        loadPages,
        pagesLoading,
        selectedPageId,
        setSelectedPageId
    };
}