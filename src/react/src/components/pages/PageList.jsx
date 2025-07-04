import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function PageList({
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
  loading = false
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

  const pluralize = (count, singular, plural) => count === 1 ? singular : plural;

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

      {/* Tabs - Grille 2x2 comme dans App.jsx.old */}
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
      {multiSelectMode && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800">
              {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''}
            </span>
            {selectedPages.length > 0 && (
              <button
                onClick={() => onPageSelect([])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Désélectionner
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pages list */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
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
            <motion.div
              className="p-4 space-y-2 h-full overflow-y-auto custom-scrollbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredPages.length === 0 ? (
                <div className="text-center text-notion-gray-500 py-8">
                  <p className="text-sm">Aucune page trouvée</p>
                </div>
              ) : (
                filteredPages.map((page, index) => (
                  <motion.div
                    key={page.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  >
                    <PageCard
                      page={page}
                      onClick={onPageSelect}
                      isFavorite={favorites.includes(page.id)}
                      onToggleFavorite={onToggleFavorite}
                      isSelected={selectedPages.includes(page.id)}
                      multiSelectMode={multiSelectMode}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}