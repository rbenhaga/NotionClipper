import React, { useRef, useEffect } from 'react';
import { Search, X, Loader } from 'lucide-react';
import PageItem from './PageItem';
import TabIcon from '../common/TabIcon';

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
    { id: 'recent', label: 'Récentes', icon: 'Clock' },
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

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-notion-gray-100">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-notion-gray-100 text-notion-gray-800'
                  : 'text-notion-gray-500 hover:bg-notion-gray-50'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <TabIcon icon={tab.icon} size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-5 h-5 animate-spin text-notion-gray-400" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 bg-notion-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search size={20} className="text-notion-gray-400" />
            </div>
            <p className="text-sm text-notion-gray-500">
              {searchQuery ? 'Aucune page trouvée' : 'Aucune page dans cette catégorie'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredPages.map(page => (
              <PageItem
                key={page.id}
                page={page}
                isSelected={multiSelectMode ? selectedPages.includes(page.id) : selectedPage?.id === page.id}
                onClick={() => onPageSelect(page)}
                multiSelectMode={multiSelectMode}
                isFavorite={favorites.includes(page.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-notion-gray-100 bg-notion-gray-50">
        <div className="text-xs text-notion-gray-500 text-center">
          {pages.length} {pluralize(pages.length, 'page', 'pages')} au total
          {filteredPages.length !== pages.length && (
            <span> • {filteredPages.length} affichées</span>
          )}
        </div>
      </div>
    </>
  );
}