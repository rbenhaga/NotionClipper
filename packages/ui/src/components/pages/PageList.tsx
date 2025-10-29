// PageList.tsx - Redesign ultra premium Notion/Apple + Infinite Scroll
import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { PageCard } from './PageCard';
import { SearchBar } from '../common/SearchBar';
import { TabBar, Tab } from '../common/TabBar';

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
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<List>(null);
    const [flipKey, setFlipKey] = useState(0);

    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollToItem(0);
        }
    }, [activeTab]);

    useEffect(() => {
        setFlipKey(prev => prev + 1);
    }, [favorites]);

    // Détection du scroll infini
    const handleItemsRendered = useCallback(({ visibleStopIndex }: { visibleStopIndex: number }) => {
        const threshold = filteredPages.length - 5; // Trigger 5 items avant la fin
        
        if (visibleStopIndex >= threshold && hasMorePages && !loadingMore && onLoadMore) {
            console.log('[PageList] 🔄 Triggering infinite scroll load');
            onLoadMore();
        }
    }, [filteredPages.length, hasMorePages, loadingMore, onLoadMore]);

    const handlePageClick = useCallback((page: any) => {
        onPageSelect(page);
    }, [onPageSelect]);

    const handleFavoriteToggle = useCallback((pageId: string) => {
        onToggleFavorite(pageId);
    }, [onToggleFavorite]);

    const ITEM_HEIGHT = 72; // Card height
    const GAP_SIZE = 8;
    const ITEM_SIZE = ITEM_HEIGHT + GAP_SIZE;

    const getListHeight = useCallback(() => {
        const windowHeight = window.innerHeight;
        const headerHeight = 44;
        const searchHeight = 56;
        const tabsHeight = 52;
        const countHeight = 48;
        const multiSelectHeight = (multiSelectMode && selectedPages.length > 0) ? 40 : 0;
        const bufferHeight = 8;

        const availableHeight = windowHeight - headerHeight - searchHeight - tabsHeight - countHeight - multiSelectHeight - bufferHeight;
        return Math.max(availableHeight, 200);
    }, [multiSelectMode, selectedPages.length]);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        // Afficher le loader à la fin si on a plus de pages
        if (index === filteredPages.length && hasMorePages) {
            return (
                <div style={style}>
                    <div className="px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="h-[72px] flex items-center justify-center"
                        >
                            {loadingMore ? (
                                <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200/50 dark:border-purple-700/50">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 blur-md rounded-full" />
                                        <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin relative" strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[13px] font-medium text-purple-900 dark:text-purple-200">
                                        Chargement...
                                    </span>
                                </div>
                            ) : (
                                <motion.button
                                    onClick={onLoadMore}
                                    className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-200 shadow-sm hover:shadow-md"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" strokeWidth={2.5} />
                                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-900 dark:group-hover:text-purple-200 transition-colors">
                                        Charger plus de pages
                                    </span>
                                </motion.button>
                            )}
                        </motion.div>
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
        <div className="h-full bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col">
            {/* Barre de recherche */}
            <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Rechercher des pages..."
                autoFocus
                inputRef={searchRef}
            />

            {/* Contrôle multi-sélection */}
            {multiSelectMode && selectedPages.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-purple-900 dark:text-purple-200">
                            {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={onDeselectAll}
                            className="text-[12px] text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200 font-medium px-2 py-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        >
                            Effacer
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Barre d'onglets */}
            <TabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={onTabChange}
            />

            {/* Compteur de pages */}
            <div className="px-4 py-3 text-[12px] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                    {filteredPages.length}
                </span>{' '}
                page{filteredPages.length !== 1 ? 's' : ''}
                {searchQuery && (
                    <span className="text-gray-400 dark:text-gray-500">
                        {' '}· "{searchQuery.length > 30 ? searchQuery.substring(0, 30) + '...' : searchQuery}"
                    </span>
                )}
                {hasMorePages && !loadingMore && (
                    <span className="text-gray-400 dark:text-gray-500"> · Plus disponibles</span>
                )}
            </div>

            {/* Liste des pages */}
            {loading ? (
                <motion.div
                    className="flex flex-col items-center justify-center h-64"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 blur-xl absolute inset-0" />
                        <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin relative" strokeWidth={2.5} />
                    </div>
                    <p className="text-[14px] text-gray-600 dark:text-gray-400 mt-4">Chargement des pages...</p>
                </motion.div>
            ) : filteredPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 p-4">
                    <div className="text-center flex flex-col items-center max-w-md">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4">
                            <span className="text-2xl">🔍</span>
                        </div>
                        <p className="text-[14px] text-gray-700 dark:text-gray-300 font-medium mb-2">
                            {searchQuery
                                ? 'Aucun résultat'
                                : activeTab === 'suggested'
                                    ? 'Aucune suggestion'
                                    : activeTab === 'favorites'
                                        ? 'Aucun favori'
                                        : activeTab === 'recent'
                                            ? 'Aucune page récente'
                                            : 'Aucune page'
                            }
                        </p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
                            {searchQuery
                                ? `Aucune page ne correspond à "${searchQuery.length > 40 ? searchQuery.substring(0, 40) + '...' : searchQuery}"`
                                : 'Commencez par créer des pages dans Notion'
                            }
                        </p>
                        {searchQuery && (
                            <motion.button
                                onClick={() => onSearchChange('')}
                                className="text-[13px] font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all duration-200 flex items-center gap-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <X size={14} strokeWidth={2.5} />
                                Effacer la recherche
                            </motion.button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden">
                    <Flipper flipKey={flipKey} spring={{ stiffness: 350, damping: 25 }}>
                        <div className="pt-4 pb-12">
                            <List
                                ref={listRef}
                                height={getListHeight() - 60}
                                itemCount={filteredPages.length + (hasMorePages ? 1 : 0)}
                                itemSize={ITEM_SIZE}
                                width="100%"
                                overscanCount={5}
                                onItemsRendered={handleItemsRendered}
                                className="notion-scrollbar-vertical"
                            >
                                {Row}
                            </List>
                        </div>
                    </Flipper>
                </div>
            )}

            {/* Styles du scrollbar premium */}
            <style>{`
        .notion-scrollbar-vertical {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar {
          width: 10px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.3));
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
          transition: all 0.2s;
        }
        
        .notion-scrollbar-vertical:hover::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(168, 85, 247, 0.5), rgba(59, 130, 246, 0.5));
          background-clip: padding-box;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(168, 85, 247, 0.7), rgba(59, 130, 246, 0.7));
          background-clip: padding-box;
        }
      `}</style>
        </div>
    );
});