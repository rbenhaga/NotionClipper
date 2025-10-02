import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { Search, X, TrendingUp, Star, Clock, Folder, Check } from 'lucide-react';
import PageCard from './PageCard';
import { Flipper, Flipped } from 'react-flip-toolkit';

function TabIcon({ name, ...props }) {
  switch (name) {
    case 'TrendingUp':
      return <TrendingUp {...props} />;
    case 'Star':
      return <Star {...props} />;
    case 'Clock':
      return <Clock {...props} />;
    case 'Folder':
      return <Folder {...props} />;
    default:
      return null;
  }
}

const PageList = memo(function PageList({
  pages = [],
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
  clipboard = null
}) {
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [flipKey, setFlipKey] = useState(0);

  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
    { id: 'recent', label: 'Récents', icon: 'Clock' },
    { id: 'all', label: 'Toutes', icon: 'Folder' }
  ];

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [activeTab]);

  // Mettre à jour la clé quand les favoris changent pour déclencher l'animation
  useEffect(() => {
    setFlipKey(prev => prev + 1);
  }, [favorites]);

  const handlePageClick = useCallback((page) => {
    onPageSelect(page);
  }, [onPageSelect]);

  const handleFavoriteToggle = useCallback((pageId) => {
    onToggleFavorite(pageId);
  }, [onToggleFavorite]);

  const ITEM_HEIGHT = 56;
  const GAP_SIZE = 4;
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

  // Rendu virtualisé avec Flipper
  const Row = ({ index, style }) => {
    const page = filteredPages[index];
    if (!page) return null;
    
    return (
      <div style={style}>
        <div className={`px-4 ${index === 0 ? 'pt-2 pb-1' : 'py-1'}`}>
          <Flipped flipId={page.id} stagger>
            <div>
              <PageCard
                page={page}
                isSelected={multiSelectMode
                  ? selectedPages.includes(page.id)
                  : selectedPage?.id === page.id
                }
                isFavorite={favorites.includes(page.id)}
                onClick={handlePageClick}
                onToggleFavorite={handleFavoriteToggle}
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
      {/* Search */}
      <div className="p-4 pb-3 border-b border-gray-100 bg-white/70 backdrop-blur-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher des pages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <AnimatePresence mode="wait">
            {searchQuery && (
              <motion.button
                key="clear-search"
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, rotate: 180 }}
                transition={{ duration: 0.2, type: "spring", stiffness: 500 }}
                onClick={() => {
                  onSearchChange('');
                  searchRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
              >
                <X size={14} className="text-gray-400" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-gray-100 bg-white/50">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <TabIcon name={tab.icon} size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info section */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Total :</span> {filteredPages.length}
          </p>

          <div className="flex items-center gap-3">
            {multiSelectMode && selectedPages.length > 0 && (
              <motion.button
                onClick={() => onDeselectAll?.()}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 
                          rounded-lg border border-gray-200 hover:border-gray-300
                          transition-all duration-200 flex items-center gap-1.5 shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X size={12} className="text-gray-400" />
                <span>Tout désélectionner</span>
                <span className="text-gray-400 font-medium">
                  {selectedPages.length}
                </span>
              </motion.button>
            )}

            {loading && (
              <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pages list avec animation */}
      {loading && filteredPages.length === 0 ? (
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

export default PageList;