// packages/ui/src/hooks/data/usePages.ts
// ✅ CORRECTIONS: Chargement progressif et optimisation

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
    loadingProgress: { current: number; total: number; message: string } | null; // ✅ NOUVEAU
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
    const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number; message: string } | null>(null);

    // Refs pour éviter les re-renders
    const loadPagesFnRef = useRef(loadPagesFn);
    const loadFavoritesFnRef = useRef(loadFavoritesFn);
    const toggleFavoriteFnRef = useRef(toggleFavoriteFn);
    const loadRecentPagesFnRef = useRef(loadRecentPagesFn);

    useEffect(() => {
        loadPagesFnRef.current = loadPagesFn;
        loadFavoritesFnRef.current = loadFavoritesFn;
        toggleFavoriteFnRef.current = toggleFavoriteFn;
        loadRecentPagesFnRef.current = loadRecentPagesFn;
    });

    // ✅ Load pages avec chargement progressif
    const loadPages = useCallback(async () => {
        if (!loadPagesFnRef.current) return;

        setPagesLoading(true);
        setLoadingProgress({ current: 0, total: 100, message: 'Initialisation...' });

        try {
            // Simuler le progress
            setLoadingProgress({ current: 10, total: 100, message: 'Connexion à Notion...' });
            
            const loaded = await loadPagesFnRef.current();
            
            setLoadingProgress({ current: 50, total: 100, message: `Chargement de ${loaded.length} pages...` });
            
            // ✅ Charger progressivement par lots de 20
            const BATCH_SIZE = 20;
            const batches = [];
            for (let i = 0; i < loaded.length; i += BATCH_SIZE) {
                batches.push(loaded.slice(i, i + BATCH_SIZE));
            }

            // ✅ Afficher progressivement
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                setPages(prev => {
                    const newPages = [...prev, ...batch];
                    // Dédupliquer
                    return Array.from(new Map(newPages.map(p => [p.id, p])).values());
                });

                // Mettre à jour le progress
                const progress = Math.round(50 + (i + 1) / batches.length * 50);
                setLoadingProgress({
                    current: progress,
                    total: 100,
                    message: `Chargement... ${Math.min((i + 1) * BATCH_SIZE, loaded.length)}/${loaded.length}`
                });

                // Petit délai pour permettre le rendu
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // ✅ Calculer les pages récentes
            const sorted = [...loaded].sort((a, b) => {
                const dateA = new Date(a.last_edited_time || 0).getTime();
                const dateB = new Date(b.last_edited_time || 0).getTime();
                return dateB - dateA;
            });
            setRecentPages(sorted.slice(0, 10));

            setLoadingProgress({ current: 100, total: 100, message: 'Terminé !' });
            
            // Effacer le progress après un court délai
            setTimeout(() => setLoadingProgress(null), 500);
        } catch (error) {
            console.error('[usePages] Error loading pages:', error);
            setLoadingProgress(null);
        } finally {
            setPagesLoading(false);
        }
    }, []);

    // Load favorites
    useEffect(() => {
        const loadFavorites = async () => {
            if (loadFavoritesFnRef.current) {
                try {
                    const loaded = await loadFavoritesFnRef.current();
                    setFavorites(loaded);
                } catch (error) {
                    console.error('[usePages] Error loading favorites:', error);
                }
            }
        };
        loadFavorites();
    }, []);

    const toggleFavorite = useCallback(async (pageId: string) => {
        if (toggleFavoriteFnRef.current) {
            await toggleFavoriteFnRef.current(pageId);
            
            if (loadFavoritesFnRef.current) {
                const updatedFavorites = await loadFavoritesFnRef.current();
                setFavorites(updatedFavorites);
            }
        } else {
            setFavorites(currentFavorites => {
                return currentFavorites.includes(pageId)
                    ? currentFavorites.filter(id => id !== pageId)
                    : [...currentFavorites, pageId];
            });
        }
    }, []);

    const addToRecent = useCallback((page: NotionPage) => {
        setRecentPages(prev => {
            const filtered = prev.filter(p => p.id !== page.id);
            return [page, ...filtered].slice(0, 10);
        });
    }, []);

    // ✅ Filtrage optimisé avec dédoublonnage
    const filteredPages = useMemo(() => {
        let filtered = pages;

        // Filtre par onglet
        if (activeTab === 'favorites') {
            filtered = filtered.filter(page => favorites.includes(page.id));
        } else if (activeTab === 'recent') {
            filtered = recentPages;
        } else if (activeTab === 'suggested') {
            filtered = recentPages.slice(0, 10);
        }

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

        // Dédupliquer
        return Array.from(new Map(filtered.map(page => [page.id, page])).values());
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
        setSelectedPageId,
        loadingProgress
    };
}