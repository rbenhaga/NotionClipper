import React, { useState, useRef, useEffect, memo, useCallback, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { X, CheckSquare } from 'lucide-react';
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
    onDeselectAll: () => void;
    onToggleMultiSelect: () => void;
    tabs?: Tab[];
}

/**
 * Liste virtualisée de pages avec:
 * - Virtualisation (react-window) pour performance
 * - Animations (react-flip-toolkit)
 * - Recherche en temps réel
 * - Système d'onglets
 * - Mode multi-sélection
 * - Gestion des favoris
 */
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
    onDeselectAll,
    onToggleMultiSelect,
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

    // Focus automatique sur la recherche au montage
    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    // Scroll to top quand on change d'onglet
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollToItem(0);
        }
    }, [activeTab]);

    // Trigger animation quand les favoris changent
    useEffect(() => {
        setFlipKey(prev => prev + 1);
    }, [favorites]);

    const handlePageClick = useCallback((page: any) => {
        onPageSelect(page);
    }, [onPageSelect]);

    const handleFavoriteToggle = useCallback((pageId: string) => {
        onToggleFavorite(pageId);
    }, [onToggleFavorite]);

    // Calcul dynamique des dimensions
    const ITEM_HEIGHT = 56;
    const GAP_SIZE = 12; // ✅ 12px au lieu de 4px
    const ITEM_SIZE = ITEM_HEIGHT + GAP_SIZE;

    const getListHeight = useCallback(() => {
        const windowHeight = window.innerHeight;
        const headerHeight = 44;
        const searchHeight = 56;
        const tabsHeight = 52;
        const countHeight = 48;
        const bufferHeight = multiSelectMode ? 80 : 20;

        return windowHeight - headerHeight - searchHeight - tabsHeight - countHeight - bufferHeight;
    }, [multiSelectMode]);

    // Rendu d'une ligne virtualisée avec animation Flip
    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const page = filteredPages[index];
        if (!page) return null;

        return (
            <div style={style}>
                {/* ✅ FIX: Espacement correct entre les cartes */}
                <div className="px-4 pb-4">
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
        <div className="h-full bg-gradient-to-b from-gray-50/50 to-white flex flex-col">
            {/* Barre de recherche */}
            <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Rechercher des pages..."
                autoFocus
                inputRef={searchRef}
            />

            {/* Contrôle multi-sélection */}
            <div className="px-4 py-2 border-b border-gray-100 bg-white/95">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onToggleMultiSelect}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${multiSelectMode
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <CheckSquare size={14} />
                        Sélection multiple
                    </button>
                    {multiSelectMode && selectedPages.length > 0 && (
                        <button
                            onClick={onDeselectAll}
                            className="text-xs text-gray-600 hover:text-gray-900"
                        >
                            Tout désélectionner ({selectedPages.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Barre d'onglets */}
            <TabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={onTabChange}
            />

            {/* Compteur de pages */}
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''}
                {searchQuery && ` correspondant à "${searchQuery}"`}
            </div>

            {/* Liste des pages */}
            {loading ? (
                <motion.div
                    className="flex flex-col items-center justify-center h-64 text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm">Chargement des pages...</p>
                </motion.div>
            ) : filteredPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
                    <div className="text-center flex flex-col items-center max-w-full px-4">
                        <p className="text-sm mb-4 truncate max-w-full">
                            {searchQuery
                                ? `Aucun résultat pour "${searchQuery}"`
                                : activeTab === 'suggested'
                                    ? 'Aucune suggestion disponible'
                                    : activeTab === 'favorites'
                                        ? 'Aucune page favorite'
                                        : activeTab === 'recent'
                                            ? 'Aucune page récente'
                                            : 'Aucune page trouvée'
                            }
                        </p>
                        {searchQuery && (
                            <motion.button
                                onClick={() => onSearchChange('')}
                                className="text-xs text-blue-600 hover:text-blue-700 font-semibold 
                           px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-full 
                           transition-all duration-200 flex items-center gap-1.5"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <X size={12} />
                                Effacer la recherche
                            </motion.button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden">
                    <Flipper flipKey={flipKey} spring={{ stiffness: 350, damping: 25 }}>
                        <List
                            ref={listRef}
                            height={getListHeight()}
                            itemCount={filteredPages.length}
                            itemSize={ITEM_SIZE}
                            width="100%"
                            overscanCount={5}
                            className="notion-scrollbar-vertical"
                            style={{
                                paddingBottom: '16px'
                            }}
                        >
                            {Row}
                        </List>
                    </Flipper>
                </div>
            )}

            {/* Styles du scrollbar custom */}
            <style>{`
        .notion-scrollbar-vertical {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f9fafb;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar {
          width: 8px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 4px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 4px;
          border: 2px solid #f9fafb;
          transition: background-color 0.2s;
        }
        
        .notion-scrollbar-vertical:hover::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
      `}</style>
        </div>
    );
});