import React, { useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { Search, X, TrendingUp, Star, Clock, Folder } from 'lucide-react';
import PageCard from './PageCard';

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
  activeTab = 'recent',
  onPageSelect,
  onToggleFavorite,
  onSearchChange,
  onTabChange,
  loading = false,
  onDeselectAll
}) {
  const searchRef = useRef(null);

  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
    { id: 'recent', label: 'Récents', icon: 'Clock' },
    { id: 'all', label: 'Toutes', icon: 'Folder' }
  ];

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Mémorisation du filtrage
  const filtered = useMemo(() => {
    if (filteredPages && filteredPages.length > 0) return filteredPages;
    if (!searchQuery) return pages;
    const query = searchQuery.toLowerCase();
    return pages.filter(page =>
      page.title?.toLowerCase().includes(query) ||
      page.parent_title?.toLowerCase().includes(query)
    );
  }, [pages, filteredPages, searchQuery]);

  // Mémorisation des callbacks
  const handlePageClick = useCallback((page) => {
    onPageSelect(page);
  }, [onPageSelect]);

  const handleFavoriteToggle = useCallback((pageId) => {
    onToggleFavorite(pageId);
  }, [onToggleFavorite]);

  const pluralize = (count, singular, plural) => count === 1 ? singular : plural;

  // Virtualisation si > 50 éléments
  let pageListContent;
  if (filtered.length > 50) {
    const Row = ({ index, style }) => {
      const page = filtered[index];
      return (
        <div style={style}>
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
      );
    };
    pageListContent = (
      <div className="flex-1 overflow-hidden">
        <List
          height={600}
          itemCount={filtered.length}
          itemSize={64}
          width="100%"
        >
          {Row}
        </List>
      </div>
    );
  } else {
    pageListContent = (
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {filtered.map(page => (
          <PageCard
            key={page.id}
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
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="p-4 border-b border-notion-gray-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher des pages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-notion-gray-50 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-200 rounded transition-colors"
            >
              <X size={12} className="text-notion-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-notion-gray-100">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-notion-gray-100 text-notion-gray-900'
                  : 'text-notion-gray-600 hover:bg-notion-gray-50'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <TabIcon name={tab.icon} size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Affichage du nombre total de pages */}
      <div className="px-4 py-2 border-b border-notion-gray-100 bg-notion-gray-50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-notion-gray-600">Total pages</span>
          <span className="font-medium text-notion-gray-900">{pages.length}</span>
        </div>
        {loading && (
          <div className="mt-1 w-full h-1 bg-notion-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse" />
          </div>
        )}
      </div>

      {/* Mode sélection multiple indicator */}
      {multiSelectMode && selectedPages.length > 0 && (
        <button
          onClick={() => {
            if (onDeselectAll) {
              onDeselectAll();
            }
          }}
          className="ml-2 px-2 py-1 text-xs bg-notion-gray-100 hover:bg-notion-gray-200 
                    rounded text-notion-gray-700 transition-colors"
        >
          Tout désélectionner ({selectedPages.length})
        </button>
      )}

      {/* Pages list */}
      {loading ? (
        <motion.div
          className="flex flex-col items-center justify-center h-full text-notion-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-6 h-6 border-2 border-notion-gray-300 border-t-notion-gray-600 rounded-full loading-spinner mb-3"></div>
          <p className="text-sm">Chargement des pages...</p>
        </motion.div>
      ) : (
        pageListContent
      )}
    </>
  );
});

export default PageList;