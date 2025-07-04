// src/react/src/components/pages/PageList.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  RotateCcw,
  CheckSquare,
  Loader
} from 'lucide-react';
import PageItem from './PageItem';
import TabIcon from '../common/TabIcon';
import { TAB_TYPES } from '../../utils/constants';

export default function PageList({
  pages = [],
  filteredPages = [],
  selectedPage = null,
  selectedPages = [],
  multiSelectMode = false,
  favorites = [],
  recentPages = [],
  searchQuery = '',
  activeTab = 'suggested',
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
  const searchRef = useRef(null);

  // Tabs configuration
  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'all', label: 'Toutes', icon: 'Folder' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
    { id: 'recent', label: 'Récentes', icon: 'Clock' }
  ];

  // Focus sur la recherche au montage
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  // Gestion de la sélection multiple
  const handleSelectAll = () => {
    const allPageIds = filteredPages.map(page => page.id);
    onSelectAll?.(allPageIds);
  };

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
                  ? 'bg-notion-gray-900 text-white'
                  : 'text-notion-gray-600 hover:bg-notion-gray-100'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <TabIcon name={tab.icon} size={12} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-select controls */}
      {multiSelectMode && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700 font-medium">
            {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} sélectionnée{selectedPages.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Tout sélectionner
            </button>
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-notion-gray-100">
        <span className="text-xs text-notion-gray-500">
          {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 hover:bg-notion-gray-100 rounded transition-colors disabled:opacity-50"
          title="Rafraîchir"
        >
          {loading ? (
            <Loader size={14} className="text-notion-gray-400 animate-spin" />
          ) : (
            <RotateCcw size={14} className="text-notion-gray-400" />
          )}
        </button>
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {loading && filteredPages.length === 0 ? (
            <motion.div
              className="flex items-center justify-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader className="animate-spin text-notion-gray-400" />
            </motion.div>
          ) : filteredPages.length === 0 ? (
            <motion.div
              className="text-center text-notion-gray-500 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm">Aucune page trouvée</p>
              {error && (
                <button
                  onClick={onRefresh}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Réessayer
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div className="p-4 space-y-0">
              {filteredPages.map((page, index) => (
                <motion.div
                  key={page.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                >
                  <PageItem
                    page={page}
                    onClick={() => onPageSelect(page)}
                    isFavorite={favorites.includes(page.id)}
                    onToggleFavorite={onToggleFavorite}
                    isSelected={selectedPages.includes(page.id)}
                    onToggleSelect={onPageToggle}
                    multiSelectMode={multiSelectMode}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}