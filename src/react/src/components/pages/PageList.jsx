// src/react/src/components/pages/PageList.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Star, 
  Clock, 
  Folder, 
  Database, 
  FileText,
  TrendingUp,
  X,
  RotateCcw,
  CheckSquare
} from 'lucide-react';
import PageItem from './PageItem';
import { TAB_TYPES } from '../../utils/constants';

// Fonction pour obtenir l'icône d'un tab
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
  selectedPage = null,
  selectedPages = [],
  multiSelectMode = false,
  favorites = [],
  recentPages = [],
  searchQuery = '',
  activeTab,
  onPageSelect,
  onPageToggle,
  onToggleFavorite,
  onSearchChange,
  onTabChange,
  onSelectAll,
  onClearSelection,
  onRefresh,
  loading = false,
  error = null
}) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '');

  // Synchroniser avec la prop searchQuery
  useEffect(() => {
    setLocalSearchQuery(searchQuery || '');
  }, [searchQuery]);

  // Tabs de navigation
  const tabs = [
    { 
      id: TAB_TYPES.SUGGESTED, 
      label: 'Suggérées', 
      icon: 'TrendingUp',
      count: [...new Set([...favorites, ...recentPages])].length 
    },
    { 
      id: TAB_TYPES.ALL, 
      label: 'Toutes', 
      icon: 'Folder',
      count: pages.length 
    },
    { 
      id: TAB_TYPES.FAVORITES, 
      label: 'Favoris', 
      icon: 'Star',
      count: favorites.length 
    },
    { 
      id: TAB_TYPES.RECENT, 
      label: 'Récentes', 
      icon: 'Clock',
      count: recentPages.length 
    }
  ];

  // Gérer la recherche locale
  const handleSearchChange = (value) => {
    setLocalSearchQuery(value);
    onSearchChange(value);
  };

  // Calculer le nombre de pages affichées
  const displayedPagesCount = pages.filter(page => {
    if (!localSearchQuery) return true;
    return page.title?.toLowerCase().includes(localSearchQuery.toLowerCase());
  }).length;

  return (
    <div className="flex flex-col h-full bg-notion-gray-50 border-r border-notion-gray-200">
      {/* Header avec recherche */}
      <div className="p-4 bg-white border-b border-notion-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" size={16} />
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher une page..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-notion-gray-50 border border-notion-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
          {localSearchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
            >
              <X size={14} className="text-notion-gray-400" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-notion-gray-600 hover:bg-notion-gray-100'
                }
              `}
            >
              <TabIcon name={tab.icon} size={14} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  ml-1 px-1.5 py-0.5 rounded-full text-xs
                  ${activeTab === tab.id 
                    ? 'bg-blue-200 text-blue-800' 
                    : 'bg-notion-gray-200 text-notion-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions multi-sélection */}
      {multiSelectMode && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              {pages.length > 0 && (
                <button
                  onClick={onSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Tout sélectionner
                </button>
              )}
              {selectedPages.length > 0 && (
                <button
                  onClick={onClearSelection}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Tout désélectionner
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des pages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-notion-gray-500">Chargement des pages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw size={14} />
              Réessayer
            </button>
          </div>
        ) : displayedPagesCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <p className="text-sm text-notion-gray-500 text-center">
              {localSearchQuery 
                ? `Aucune page trouvée pour "${localSearchQuery}"`
                : activeTab === TAB_TYPES.FAVORITES 
                  ? 'Aucune page favorite'
                  : activeTab === TAB_TYPES.RECENT
                    ? 'Aucune page récente'
                    : 'Aucune page disponible'
              }
            </p>
          </div>
        ) : (
          <div className="p-2">
            <AnimatePresence>
              {pages.map(page => (
                <PageItem
                  key={page.id}
                  page={page}
                  isSelected={multiSelectMode ? selectedPages.includes(page.id) : selectedPage?.id === page.id}
                  isFavorite={favorites.includes(page.id)}
                  multiSelectMode={multiSelectMode}
                  onClick={() => multiSelectMode ? onPageToggle(page) : onPageSelect(page)}
                  onToggleFavorite={() => onToggleFavorite(page.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}