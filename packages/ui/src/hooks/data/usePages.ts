// packages/ui/src/hooks/data/usePages.ts
// 🎯 SYSTÈME OPTIMISÉ - Utilise useInfinitePages pour le scroll infini

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { NotionPage } from '../../lib/types';
import { useInfinitePages } from './useInfinitePages';

export interface UsePagesReturn {
    pages: NotionPage[];
    filteredPages: NotionPage[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    favorites: string[];
    recentPages: NotionPage[];
    suggestedPages: NotionPage[];
    toggleFavorite: (pageId: string) => Promise<void>;
    addToRecent: (page: NotionPage) => void;
    loadPages: () => Promise<void>;
    loadMorePages: () => Promise<void>; // ✅ NOUVEAU: Scroll infini
    pagesLoading: boolean;
    loadingMore: boolean; // ✅ NOUVEAU: Loading pour scroll infini
    hasMorePages: boolean; // ✅ NOUVEAU: Indicateur s'il y a plus de pages
    selectedPageId: string | null;
    setSelectedPageId: (id: string | null) => void;
    loadingProgress: { current: number; total: number; message: string } | null;
    refreshTab: (tab?: string) => Promise<void>; // ✅ NOUVEAU: Refresh spécifique
}

export function usePages(
    loadFavoritesFn?: () => Promise<string[]>,
    toggleFavoriteFn?: (pageId: string) => Promise<void>
): UsePagesReturn {
    // États principaux
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    // ✅ NOUVEAU: Utiliser useInfinitePages pour le scroll infini
    const infinitePages = useInfinitePages({
        tab: activeTab as 'all' | 'recent' | 'favorites' | 'suggested',
        pageSize: activeTab === 'suggested' ? 10 : activeTab === 'recent' ? 20 : 50
    });

    // Refs pour éviter les re-renders
    const loadFavoritesFnRef = useRef(loadFavoritesFn);
    const toggleFavoriteFnRef = useRef(toggleFavoriteFn);

    useEffect(() => {
        loadFavoritesFnRef.current = loadFavoritesFn;
        toggleFavoriteFnRef.current = toggleFavoriteFn;
    });

    // ============================================
    // FONCTIONS SIMPLIFIÉES AVEC useInfinitePages
    // ============================================

    /**
     * Charger les pages (délégué à useInfinitePages)
     */
    const loadPages = useCallback(async () => {
        console.log(`[PAGES] Loading pages for tab: ${activeTab} (delegated to useInfinitePages)`);
        // useInfinitePages gère automatiquement le chargement
    }, [activeTab]);

    /**
     * Charger plus de pages (scroll infini)
     */
    const loadMorePages = useCallback(async () => {
        console.log(`[PAGES] Loading more pages for tab: ${activeTab}`);
        await infinitePages.loadMore();
    }, [activeTab, infinitePages]);

    /**
     * Refresh un onglet spécifique
     */
    const refreshTab = useCallback(async (tab?: string) => {
        const targetTab = tab || activeTab;
        console.log(`[PAGES] Refreshing tab: ${targetTab}`);
        
        if (targetTab === activeTab) {
            await infinitePages.refresh();
        }
        // Si c'est un autre onglet, il sera rafraîchi automatiquement au changement
    }, [activeTab, infinitePages.refresh]);

    /**
     * Changer d'onglet (useInfinitePages gère automatiquement le chargement)
     */
    const setActiveTabWithLoad = useCallback(async (tab: string) => {
        console.log(`[PAGES] Tab changed: ${activeTab} → ${tab}`);
        setActiveTab(tab);
        // useInfinitePages se recharge automatiquement quand activeTab change
    }, [activeTab]);

    /**
     * Toggle favori avec invalidation intelligente
     */
    const toggleFavorite = useCallback(async (pageId: string) => {
        if (!toggleFavoriteFnRef.current) return;

        try {
            await toggleFavoriteFnRef.current(pageId);
            
            // Recharger les favoris
            if (loadFavoritesFnRef.current) {
                const newFavorites = await loadFavoritesFnRef.current();
                setFavorites(newFavorites);
            }

            // Si on est sur l'onglet favoris, recharger
            if (activeTab === 'favorites') {
                await infinitePages.refresh();
            }

        } catch (error) {
            console.error('[PAGES] ❌ Error toggling favorite:', error);
        }
    }, [activeTab, infinitePages.refresh]);

    /**
     * Ajouter à l'historique récent (pas implémenté avec useInfinitePages)
     */
    const addToRecent = useCallback((_page: NotionPage) => {
        console.log('[PAGES] addToRecent called but not implemented with useInfinitePages');
        // TODO: Implémenter si nécessaire
    }, []);

    // ============================================
    // COMPUTED VALUES AVEC useInfinitePages
    // ============================================

    // Pages actuelles depuis useInfinitePages
    const pages = useMemo(() => {
        return infinitePages.pages;
    }, [infinitePages.pages]);

    // Pages filtrées par recherche
    const filteredPages = useMemo(() => {
        if (!searchQuery.trim()) {
            return pages;
        }

        const query = searchQuery.toLowerCase();
        return pages.filter(page => {
            const titleMatch = page.title?.toLowerCase().includes(query);
            const emojiMatch = typeof page.icon === 'object' && page.icon?.type === 'emoji' && page.icon.emoji?.includes(query);
            return titleMatch || emojiMatch;
        });
    }, [pages, searchQuery]);



    // Pages par catégorie (pour compatibilité - TODO: implémenter si nécessaire)
    const recentPages = useMemo(() => {
        return activeTab === 'recent' ? pages : [];
    }, [activeTab, pages]);
    
    const suggestedPages = useMemo(() => {
        return activeTab === 'suggested' ? pages : [];
    }, [activeTab, pages]);

    // ============================================
    // EFFECTS SIMPLIFIÉS
    // ============================================

    // Charger les favoris au démarrage
    useEffect(() => {
        if (loadFavoritesFnRef.current) {
            loadFavoritesFnRef.current().then(setFavorites).catch(console.error);
        }
    }, []);

    return {
        pages,
        filteredPages,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab: setActiveTabWithLoad,
        favorites,
        recentPages,
        suggestedPages,
        toggleFavorite,
        addToRecent,
        loadPages,
        loadMorePages, // ✅ Délégué à useInfinitePages
        pagesLoading: infinitePages.loading,
        loadingMore: infinitePages.loading,
        hasMorePages: infinitePages.hasMore,
        selectedPageId,
        setSelectedPageId,
        loadingProgress: infinitePages.error ? { current: 0, total: 100, message: infinitePages.error } : null,
        refreshTab
    };
}