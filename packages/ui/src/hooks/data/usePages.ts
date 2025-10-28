// packages/ui/src/hooks/usePages.ts - VERSION CORRIGÉE

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { NotionPage } from '../../lib/types';

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

    // ✅ SOLUTION OPTIMALE: Fonctions stables avec refs
    const loadPagesFnRef = useRef(loadPagesFn);
    const loadFavoritesFnRef = useRef(loadFavoritesFn);
    const toggleFavoriteFnRef = useRef(toggleFavoriteFn);
    const loadRecentPagesFnRef = useRef(loadRecentPagesFn);

    // Mettre à jour les refs
    useEffect(() => {
        loadPagesFnRef.current = loadPagesFn;
        loadFavoritesFnRef.current = loadFavoritesFn;
        toggleFavoriteFnRef.current = toggleFavoriteFn;
        loadRecentPagesFnRef.current = loadRecentPagesFn;
    });

    // Load pages avec fonction stable
    const loadPages = useCallback(async () => {
        if (!loadPagesFnRef.current) return;

        setPagesLoading(true);
        try {
            const loaded = await loadPagesFnRef.current();
            
            // ✅ FIX: Dédupliquer les pages par ID
            const uniquePages = Array.from(
                new Map(loaded.map(page => [page.id, page])).values()
            );
            
            setPages(uniquePages);
            
            // ✅ FIX: Calculer automatiquement les pages récentes (10 plus récentes)
            const sorted = [...uniquePages].sort((a, b) => {
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
    }, []); // ✅ Fonction stable

    // Load favorites
    useEffect(() => {
        const loadFavorites = async () => {
            if (loadFavoritesFnRef.current) {
                try {
                    const loaded = await loadFavoritesFnRef.current();
                    setFavorites(loaded);
                } catch (error) {
                    console.error('Error loading favorites:', error);
                }
            }
        };
        loadFavorites();
    }, []); // ✅ Fonction stable via ref

    // Load recent pages (optionnel si fonction fournie)
    const loadRecentPages = useCallback(async (limit: number) => {
        if (!loadRecentPagesFnRef.current) return;

        try {
            const loaded = await loadRecentPagesFnRef.current(limit);
            setRecentPages(loaded);
        } catch (error) {
            console.error('Error loading recent pages:', error);
        }
    }, []); // ✅ Fonction stable

    const toggleFavorite = useCallback(async (pageId: string) => {
        if (toggleFavoriteFnRef.current) {
            await toggleFavoriteFnRef.current(pageId);
            
            // Recharger les favoris après le toggle
            if (loadFavoritesFnRef.current) {
                const updatedFavorites = await loadFavoritesFnRef.current();
                setFavorites(updatedFavorites);
            }
        } else {
            // Fallback: toggle local avec fonction de mise à jour
            setFavorites(currentFavorites => {
                return currentFavorites.includes(pageId)
                    ? currentFavorites.filter(id => id !== pageId)
                    : [...currentFavorites, pageId];
            });
        }
    }, []); // ✅ Fonction stable

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
            // ✅ FIX: Top 10 pages récentes pour "suggérées"
            filtered = recentPages.slice(0, 10);
        }
        // Pour 'all', on garde toutes les pages

        // Filtre par recherche
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(page => {
                const titleMatch = page.title?.toLowerCase().includes(query);
                const emojiMatch = typeof page.icon === 'object' && page.icon?.type === 'emoji' 
                    ? page.icon.emoji?.toLowerCase().includes(query)
                    : false;
                return titleMatch || emojiMatch;
            });
        }

        // ✅ FIX FINAL: Dédupliquer les résultats filtrés par ID
        const uniqueFiltered = Array.from(
            new Map(filtered.map(page => [page.id, page])).values()
        );

        return uniqueFiltered;
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