// PageList.tsx - Design System Notion/Apple ultra épuré
import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { MotionDiv, MotionButton } from '../common/MotionWrapper';
import { FixedSizeList as List } from 'react-window';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { PageCard } from './PageCard';
import { SearchBar } from '../common/SearchBar';
import { TabBar, Tab } from '../common/TabBar';
import { useTranslation } from '@notion-clipper/i18n';


interface PageListProps {
    filteredPages: any[];
    selectedPage: any | null;
    selectedPages: string[];
    multiSelectMode: boolean;
    favorites: string[];
    searchQuery: string;
    activeTab: string;
    onPageSelect: (page: any) => void;
    onToggleFavorite: (pageId: string) => void;
    onSearchChange: (query: string) => void;
    onTabChange: (tab: string) => void;
    loading?: boolean;
    loadingMore?: boolean;
    hasMorePages?: boolean;
    onLoadMore?: () => void;
    onDeselectAll: () => void;
    tabs?: Tab[];
}

export const PageList = memo(function PageList({
    filteredPages = [],
    selectedPage = null,
    selectedPages = [],
    multiSelectMode = false,
    favorites = [],
    searchQuery = '',
    activeTab = 'all',
    onPageSelect,
    onToggleFavorite,
    onSearchChange,
    onTabChange,
    loading = false,
    loadingMore = false,
    hasMorePages = false,
    onLoadMore,
    onDeselectAll,
    tabs = [
        { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' as const },
        { id: 'favorites', label: 'Favoris', icon: 'Star' as const },
        { id: 'recent', label: 'Récents', icon: 'Clock' as const },
        { id: 'all', label: 'Toutes', icon: 'Folder' as const }
    ]
}: PageListProps) {
    const { t } = useTranslation();
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<List>(null);
    const [flipKey, setFlipKey] = useState(0);
    const previousPageCountRef = useRef(0);

    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    useEffect(() => {
        // Seulement remonter en haut lors du changement d'onglet, pas lors du chargement de plus de pages
        if (listRef.current) {
            listRef.current.scrollToItem(0);
        }
        previousPageCountRef.current = 0; // Reset le compteur pour le nouvel onglet
    }, [activeTab]); // Seulement quand l'onglet change, pas quand les pages changent

    // Effet pour gérer le scroll lors de l'ajout de nouvelles pages
    useEffect(() => {
        const currentPageCount = filteredPages.length;
        const previousPageCount = previousPageCountRef.current;
        
        // Si on a ajouté des pages (scroll infini) et qu'on n'est pas sur un nouvel onglet
        if (currentPageCount > previousPageCount && previousPageCount > 0) {
            console.log(`[PageList] Pages added: ${previousPageCount} -> ${currentPageCount}, maintaining scroll position`);
            // Ne pas faire de scroll automatique, laisser l'utilisateur où il est
        }
        
        previousPageCountRef.current = currentPageCount;
    }, [filteredPages.length]);

    useEffect(() => {
        setFlipKey(prev => prev + 1);
    }, [favorites]);

    const handleItemsRendered = useCallback(({ visibleStopIndex }: { visibleStopIndex: number }) => {
        const threshold = filteredPages.length - 5;
        
        if (visibleStopIndex >= threshold && hasMorePages && !loadingMore && onLoadMore) {
            console.log(`[PageList] Triggering load more at index ${visibleStopIndex}, threshold: ${threshold}`);
            onLoadMore();
        }
    }, [filteredPages.length, hasMorePages, loadingMore, onLoadMore]);

    const handlePageClick = useCallback((page: any) => {
        onPageSelect(page);
    }, [onPageSelect]);

    const handleFavoriteToggle = useCallback((pageId: string) => {
        onToggleFavorite(pageId);
    }, [onToggleFavorite]);

    const ITEM_HEIGHT = 64;
    const GAP_SIZE = 8;
    const ITEM_SIZE = ITEM_HEIGHT + GAP_SIZE;

    const getListHeight = useCallback(() => {
        const windowHeight = window.innerHeight;
        const headerHeight = 44;
        const searchHeight = 56;
        const tabsHeight = 52;
        const countHeight = 40;
        const multiSelectHeight = (multiSelectMode && selectedPages.length > 0) ? 40 : 0;
        const bufferHeight = 8;

        const availableHeight = windowHeight - headerHeight - searchHeight - tabsHeight - countHeight - multiSelectHeight - bufferHeight;
        return Math.max(availableHeight, 200);
    }, [multiSelectMode, selectedPages.length]);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        if (index === filteredPages.length && hasMorePages) {
            return (
                <div style={style}>
                    <div className="px-4">
                        <div className="h-16 flex items-center justify-center">
                            {loadingMore ? (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <Loader2 className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin" strokeWidth={2} />
                                    <span className="text-[13px] text-gray-600 dark:text-gray-400">
                                        {t('common.loading')}
                                    </span>
                                </div>
                            ) : (
                                <button
                                    onClick={onLoadMore}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all duration-200"
                                >
                                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                                        {t('common.loadMore')}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        
        const page = filteredPages[index];
        if (!page) return null;

        return (
            <div style={style}>
                <div className="px-4">
                    <Flipped flipId={page.id} stagger>
                        <div>
                            <PageCard
                                page={page}
                                isSelected={multiSelectMode
                                    ? selectedPages.includes(page.id)
                                    : selectedPage?.id === page.id}
                                isFavorite={favorites.includes(page.id)}
                                onToggleFavorite={handleFavoriteToggle}
                                onClick={handlePageClick}
                                multiSelectMode={multiSelectMode}
                            />
                        </div>
                    </Flipped>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full bg-white dark:bg-[#191919] flex flex-col">
            {/* Barre de recherche */}
            <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Rechercher..."
                autoFocus
                inputRef={searchRef}
            />

            {/* Contrôle multi-sélection */}
            {multiSelectMode && selectedPages.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] text-gray-600 dark:text-gray-400">
                            {t('common.pagesSelected', { count: selectedPages.length })}
                        </span>
                        <button
                            onClick={onDeselectAll}
                            className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
                        >
                            {t('common.clear')}
                        </button>
                    </div>
                </div>
            )}

            {/* Barre d'onglets */}
            <TabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={onTabChange}
            />

            {/* Compteur minimaliste */}
            <div className="px-4 py-2.5 text-[12px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                {filteredPages.length} {filteredPages.length !== 1 ? t('common.pages') : t('common.page')}
                {searchQuery && (
                    <span className="text-gray-300 dark:text-gray-600">
                        {' '}· {searchQuery.length > 30 ? searchQuery.substring(0, 30) + '...' : searchQuery}
                    </span>
                )}
            </div>

            {/* Liste des pages */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin mb-3" strokeWidth={2} />
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
                </div>
            ) : filteredPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 p-4">
                    <div className="text-center max-w-md">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 mx-auto">
                            <span className="text-xl">🔍</span>
                        </div>
                        <p className="text-[14px] text-gray-700 dark:text-gray-300 font-medium mb-1">
                            {searchQuery ? t('common.noResults') : t('common.noPages')}
                        </p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
                            {searchQuery
                                ? t('common.noPagesMatch', { query: searchQuery.length > 40 ? searchQuery.substring(0, 40) + '...' : searchQuery })
                                : t('common.createPagesInNotion')
                            }
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                            >
                                <X size={12} strokeWidth={2} />
                                {t('common.clear')}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden">
                    <Flipper flipKey={flipKey} spring={{ stiffness: 350, damping: 25 }}>
                        <div className="pt-3 pb-12">
                            <List
                                ref={listRef}
                                height={getListHeight() - 40}
                                itemCount={filteredPages.length + (hasMorePages ? 1 : 0)}
                                itemSize={ITEM_SIZE}
                                width="100%"
                                overscanCount={5}
                                onItemsRendered={handleItemsRendered}
                                className="notion-scrollbar"
                            >
                                {Row}
                            </List>
                        </div>
                    </Flipper>
                </div>
            )}


        </div>
    );
});