import React, { useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
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
        // Filtrer les favoris
        filtered = filtered
          .filter(page => favorites.includes(page.id))
          .sort((a, b) => 
            new Date(b.last_edited_time || 0) - new Date(a.last_edited_time || 0)
          );
        break;
        
      case 'recent':
        // Toutes les pages triées par date, style uniforme
        filtered = filtered
          .sort((a, b) => 
            new Date(b.last_edited_time || 0) - new Date(a.last_edited_time || 0)
          );
        break;
        
      case 'all':
        // Toutes les pages triées alphabétiquement
        filtered = filtered.sort((a, b) => 
          (a.title || 'Sans titre').localeCompare(b.title || 'Sans titre', 'fr')
        );
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
  const ITEM_HEIGHT = 54; // Réduit de 56 à 54
  const GAP_SIZE = 2; // Réduit de 4 à 2
  const ITEM_SIZE = ITEM_HEIGHT + GAP_SIZE;
  
  // Virtualiser à partir de 30 éléments pour tous les onglets
  const shouldVirtualize = filtered.length > 30;

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

  // Contenu de la liste
  let pageListContent;
  const itemClass = "mb-1"; // Même espace partout
  
  if (shouldVirtualize) {
    const Row = ({ index, style }) => {
      const page = filtered[index];
      return (
        <div style={style}>
          <div className={itemClass}>
            {renderPageCard(page)}
          </div>
        </div>
      );
    };
    
    pageListContent = (
      <div className="flex-1 p-3 pt-2">
        <List
          ref={listRef}
          height={getListHeight()}
          itemCount={filtered.length}
          itemSize={ITEM_SIZE}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    );
  } else {
    pageListContent = (
      <div className="flex-1 overflow-y-auto p-3 pt-2 pr-2 space-y-1">
        {filtered.map(page => renderPageCard(page))}
      </div>
    );
  }

  // Labels descriptifs pour chaque onglet
  const getTabDescription = () => {
    switch (activeTab) {
      case 'suggested':
        return 'Basées sur votre activité et le contenu actuel';
      case 'favorites':
        return 'Pages marquées comme favorites';
      case 'recent':
        return 'Dernières pages modifiées';
      case 'all':
        return 'Toutes vos pages Notion';
      default:
        return '';
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
              <p className="text-xs text-notion-gray-600">{getTabDescription()}</p>
              <span className="text-xs font-medium text-notion-gray-900 ml-2">
                {filtered.length} page{filtered.length > 1 ? 's' : ''}
              </span>
            </div>
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
        
        {multiSelectMode && selectedPages.length > 0 && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => onDeselectAll?.()}
              className="px-2 py-1 text-xs bg-white hover:bg-notion-gray-100 rounded border border-notion-gray-200 text-notion-gray-700 transition-colors"
            >
              Désélectionner tout ({selectedPages.length})
            </button>
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
              <button
                onClick={() => onSearchChange('')}
                className="text-xs text-blue-600 hover:underline"
              >
                Effacer la recherche
              </button>
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