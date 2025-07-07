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
  activeTab = 'all',
  onPageSelect,
  onToggleFavorite,
  onSearchChange,
  onTabChange,
  loading = false,
  onDeselectAll,
  clipboard = null // Pour la logique de suggestions
}) {
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const tabs = [
    { id: 'suggested', label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'favorites', label: 'Favoris', icon: 'Star' },
    { id: 'recent', label: 'Récents', icon: 'Clock' },
    { id: 'all', label: 'Toutes', icon: 'Folder' }
  ];

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Réinitialiser le scroll quand on change d'onglet
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [activeTab]);

  // Fonction pour calculer un score de suggestion
  const calculateSuggestionScore = useCallback((page) => {
    let score = 0;
    
    // Pages récemment modifiées (plus le score est élevé, plus c'est récent)
    const lastEdited = new Date(page.last_edited_time || 0);
    const hoursSinceEdit = (Date.now() - lastEdited) / (1000 * 60 * 60);
    if (hoursSinceEdit < 24) score += 50; // Modifié aujourd'hui
    else if (hoursSinceEdit < 168) score += 30; // Modifié cette semaine
    else if (hoursSinceEdit < 720) score += 10; // Modifié ce mois
    
    // Pages favorites
    if (favorites.includes(page.id)) score += 40;
    
    // Pages avec du contenu similaire au presse-papiers (amélioration)
    if (clipboard && clipboard.content && page.title) {
      const clipboardText = clipboard.content.toLowerCase();
      const pageTitle = page.title.toLowerCase();
      
      // Correspondance exacte du titre
      if (pageTitle.includes(clipboardText) || clipboardText.includes(pageTitle)) {
        score += 60;
      } else {
        // Extraction de mots significatifs (>3 caractères, pas des mots courants)
        const stopWords = ['pour', 'dans', 'avec', 'sans', 'sous', 'vers', 'chez', 'entre'];
        const getSignificantWords = (text) => 
          text.split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.includes(w))
            .slice(0, 5); // Limiter à 5 mots pour éviter le bruit
        
        const clipboardWords = getSignificantWords(clipboardText);
        const titleWords = getSignificantWords(pageTitle);
        
        // Correspondances partielles
        clipboardWords.forEach(clipWord => {
          titleWords.forEach(titleWord => {
            if (titleWord.includes(clipWord) || clipWord.includes(titleWord)) {
              score += 10;
            }
          });
        });
      }
    }
    
    // Pages parentes (souvent des espaces de travail importants)
    if (!page.parent_id || page.parent_type === 'workspace') score += 20;
    
    // Pénalité pour les pages archivées ou dans la corbeille
    if (page.archived) score -= 100;
    if (page.in_trash) score -= 200;
    
    return score;
  }, [favorites, clipboard]);

  // Logique de filtrage unifiée avec style cohérent
  const getFilteredPages = useMemo(() => {
    let filtered = [...pages];
    
    // Filtrage uniforme pour tous les onglets
    switch (activeTab) {
      case 'suggested':
        // Calculer les scores et trier
        filtered = filtered
          .map(page => ({ page, score: calculateSuggestionScore(page) }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 30) // Augmenté à 30 pour cohérence
          .map(item => item.page);
        break;
        
      case 'favorites':
        filtered = filtered
          .filter(page => favorites.includes(page.id))
          .sort((a, b) => {
            const dateA = new Date(a.last_edited_time || a.last_edited || 0);
            const dateB = new Date(b.last_edited_time || b.last_edited || 0);
            return dateB - dateA;
          });
        break;
        
      case 'recent':
        // Toutes les pages triées par date, style uniforme
        filtered = filtered
          .sort((a, b) => 
            new Date(b.last_edited_time || 0) - new Date(a.last_edited_time || 0)
          );
        break;
        
      case 'all':
        filtered = filtered.sort((a, b) => {
          const dateA = new Date(a.last_edited_time || a.last_edited || 0);
          const dateB = new Date(b.last_edited_time || b.last_edited || 0);
          return dateB - dateA;
        });
        break;
    }
    
    // Ensuite appliquer la recherche si nécessaire
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(page =>
        (page.title || 'Sans titre').toLowerCase().includes(query) ||
        (page.parent_title || '').toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [pages, activeTab, searchQuery, favorites, calculateSuggestionScore]);

  // Utiliser soit filteredPages (si fourni par le parent) soit notre filtrage local
  const filtered = filteredPages.length > 0 ? filteredPages : getFilteredPages;

  const handlePageClick = useCallback((page) => {
    onPageSelect(page);
  }, [onPageSelect]);

  const handleFavoriteToggle = useCallback((pageId) => {
    onToggleFavorite(pageId);
  }, [onToggleFavorite]);

  // Configuration pour la virtualisation
  // Forcer la virtualisation pour TOUS les cas (style uniforme)
  const shouldVirtualize = true; // Toujours true
  const ITEM_HEIGHT = 56;
  const GAP_SIZE = 4;
  const ITEM_SIZE = ITEM_HEIGHT + GAP_SIZE;
  
  // Calculer la hauteur disponible dynamiquement
  const getListHeight = useCallback(() => {
    const windowHeight = window.innerHeight;
    const headerHeight = 44;
    const searchHeight = 56;
    const tabsHeight = 52;
    const countHeight = 48;
    const bufferHeight = 20;
    
    return windowHeight - headerHeight - searchHeight - tabsHeight - countHeight - bufferHeight;
  }, []);

  // Rendu unifié pour les cards
  const renderPageCard = useCallback((page) => (
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
  ), [multiSelectMode, selectedPages, selectedPage, favorites, handlePageClick, handleFavoriteToggle]);

  // Rendu virtualisé unifié
  const Row = ({ index, style }) => {
    const page = filtered[index];
    if (!page) return null;
    return (
      <motion.div 
        style={style}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ delay: index * 0.02, duration: 0.2 }}
      >
        <div className="pr-3 pb-1">
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
      </motion.div>
    );
  };

  // Toujours utiliser la liste virtualisée
  const pageListContent = (
    <div className="flex-1 p-3 pt-2">
      <AnimatePresence mode="popLayout">
        <List
          ref={listRef}
          height={getListHeight()}
          itemCount={filtered.length}
          itemSize={ITEM_SIZE}
          width="100%"
          overscanCount={10}
          className="custom-scrollbar"
        >
          {Row}
        </List>
      </AnimatePresence>
    </div>
  );

  // Labels descriptifs pour chaque onglet
  const getTabDescription = () => {
    switch (activeTab) {
      case 'suggested': return 'Suggérées';
      case 'favorites': return 'Favoris';
      case 'recent': return 'Récentes';
      case 'all': return 'Toutes';
      default: return '';
    }
  };

  return (
    <>
      {/* Search */}
      <div className="p-4 pb-3 border-b border-notion-gray-100">
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
          {/* Animation de fermeture de la recherche avec AnimatePresence améliorée */}
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
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 \
                           hover:bg-notion-gray-200 rounded-full transition-colors duration-150"
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.05)' }}
                whileTap={{ scale: 0.85 }}
              >
                <X size={14} className="text-notion-gray-400" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-notion-gray-100">
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

      {/* Info section */}
      <div className="px-4 py-2 border-b border-notion-gray-100 bg-notion-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {/* Texte Total corrigé */}
              <p className="text-xs text-notion-gray-600">
                <span className="font-medium">Total :</span> {filtered.length}
              </p>
              {loading && (
                <div className="mt-1 w-full h-1 bg-notion-gray-200 rounded-full overflow-hidden">
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
        
        {multiSelectMode && selectedPages.length > 0 && (
          <div className="mt-2 flex justify-end">
            {/* Bouton Tout désélectionner corrigé */}
            <motion.button
              onClick={() => onDeselectAll?.()}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-50 to-blue-100 \
                         hover:from-blue-100 hover:to-blue-200 text-blue-700 font-semibold \
                         rounded-full border border-blue-300 shadow-sm \
                         transition-all duration-200 flex items-center gap-1.5"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={12} />
              Tout désélectionner
              <span className="ml-1 bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {selectedPages.length}
              </span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Pages list */}
      {loading && filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center h-64 text-notion-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-6 h-6 border-2 border-notion-gray-300 border-t-notion-gray-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Chargement des pages...</p>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-notion-gray-500 p-4">
          <div className="text-center">
            <p className="text-sm mb-2">
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
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold \
                           px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-full \
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
        pageListContent
      )}
    </>
  );
});

export default PageList;