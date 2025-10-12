// packages/ui/src/hooks/usePages.ts - VERSION CORRIGÉE

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { NotionPage } from '../types';

export interface UsePagesReturn {
    pages: NotionPage[];
    filteredPages: NotionPage[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    favorites: string[];
    recentPages: NotionPage[];
    toggleFavorite: (pageId: string) => Promise<void>;
    addToRecent: (page: NotionPage) => void;
    loadPages: () => Promise<void>;
    pagesLoading: boolean;
    selectedPageId: string | null;
    setSelectedPageId: (id: string | null) => void;
}

export function usePages(
    loadPagesFn?: () => Promise<NotionPage[]>,
    loadFavoritesFn?: () => Promise<string[]>,
    toggleFavoriteFn?: (pageId: string) => Promise<void>,
    loadRecentPagesFn?: (limit: number) => Promise<NotionPage[]>
): UsePagesReturn {
    const [pages, setPages] = useState<NotionPage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [recentPages, setRecentPages] = useState<NotionPage[]>([]);
    const [pagesLoading, setPagesLoading] = useState(false);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    // Load pages
    const loadPages = useCallback(async () => {
        if (!loadPagesFn) return;

        setPagesLoading(true);
        try {
            const loaded = await loadPagesFn();
            setPages(loaded);
            
            // ✅ FIX: Calculer automatiquement les pages récentes (10 plus récentes)
            const sorted = [...loaded].sort((a, b) => {
                const dateA = new Date(a.last_edited_time || 0).getTime();
                const dateB = new Date(b.last_edited_time || 0).getTime();
                return dateB - dateA; // Plus récent en premier
            });
            setRecentPages(sorted.slice(0, 10));
        } catch (error) {
            console.error('Error loading pages:', error);
        } finally {
            setPagesLoading(false);
        }
    }, [loadPagesFn]);

    // Load favorites
    useEffect(() => {
        const loadFavorites = async () => {
            if (loadFavoritesFn) {
                try {
                    const loaded = await loadFavoritesFn();
                    setFavorites(loaded);
                } catch (error) {
                    console.error('Error loading favorites:', error);
                }
            }
        };
        loadFavorites();
    }, [loadFavoritesFn]);

    // Load recent pages (optionnel si fonction fournie)
    const loadRecentPages = useCallback(async (limit: number) => {
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
    }, [favorites, toggleFavoriteFn, loadFavoritesFn]);

    const addToRecent = useCallback((page: NotionPage) => {
        setRecentPages(prev => {
            const filtered = prev.filter(p => p.id !== page.id);
            return [page, ...filtered].slice(0, 10);
        });
    }, []);

    // ✅ FIX: Filtrer les pages selon la recherche et l'onglet actif
    const filteredPages = useMemo(() => {
        let filtered = pages;

        // Filtre par onglet - CORRECTION ICI
        if (activeTab === 'favorites') {
            filtered = filtered.filter(page => favorites.includes(page.id));
        } else if (activeTab === 'recent') {
            // ✅ FIX: Utiliser recentPages directement
            filtered = recentPages;
        } else if (activeTab === 'suggested') {
            // ✅ FIX: Top 5 pages récentes pour "suggérées"
            filtered = recentPages.slice(0, 5);
        }
        // Pour 'all', on garde toutes les pages

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