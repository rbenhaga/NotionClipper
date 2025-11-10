// packages/ui/src/components/common/PageSelector.tsx
// 🎯 Composant réutilisable pour la sélection de pages

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from './MotionWrapper';
import { ChevronDown, Search, FileText, Check } from 'lucide-react';
import { NotionPage } from '../../types';

// ============================================
// TYPES
// ============================================
export interface PageSelectorProps {
  selectedPage: NotionPage | null;
  selectedPages?: NotionPage[]; // 🔥 NOUVEAU: Support sélection multiple
  pages: NotionPage[];
  onPageSelect: (page: NotionPage) => void;
  onMultiPageSelect?: (pages: NotionPage[]) => void; // 🔥 NOUVEAU: Callback sélection multiple
  placeholder?: string;
  compact?: boolean;
  className?: string;
  mode?: 'dropdown' | 'direct'; // Nouveau prop pour le mode d'affichage
  allPages?: NotionPage[]; // Toutes les pages pour la recherche en mode direct
  multiSelect?: boolean; // 🔥 NOUVEAU: Activer la sélection multiple
  keepMenuOpen?: boolean; // 🔥 NOUVEAU: Garder le menu ouvert après sélection
}

// ============================================
// HELPERS
// ============================================
function getPageIcon(page: any) {
  if (!page) return { type: 'default', value: null };

  if (page.icon) {
    if (page.icon.type === 'emoji') {
      return { type: 'emoji', value: page.icon.emoji };
    } else if (page.icon.type === 'external' && page.icon.external?.url) {
      return { type: 'url', value: page.icon.external.url };
    } else if (page.icon.type === 'file' && page.icon.file?.url) {
      return { type: 'url', value: page.icon.file.url };
    }
  }

  return { type: 'default', value: null };
}

// ============================================
// PAGE LIST ITEM
// ============================================
function PageListItem({
  page,
  isSelected,
  isHighlighted,
  onClick,
  compact = false
}: {
  page: NotionPage;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const icon = getPageIcon(page);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 text-left transition-all duration-150 group relative"
      style={{
        padding: compact ? '4px 6px' : '6px 8px',
        borderRadius: '6px',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)'
          : isHighlighted
            ? 'rgba(0, 0, 0, 0.02)'
            : 'transparent',
        border: isSelected ? '1px solid rgba(168, 85, 247, 0.12)' : '1px solid transparent',
        transform: isHighlighted ? 'translateY(-0.5px)' : 'translateY(0)',
        boxShadow: isSelected
          ? '0 1px 3px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          : isHighlighted
            ? '0 1px 2px rgba(0, 0, 0, 0.04)'
            : 'none',
      }}
    >
      {/* Icône */}
      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: compact ? '12px' : '14px', height: compact ? '12px' : '14px' }}>
        {icon?.type === 'emoji' ? (
          <span style={{ fontSize: compact ? '9px' : '10px', lineHeight: 1 }}>
            {icon.value}
          </span>
        ) : icon?.type === 'url' ? (
          <img
            src={icon.value}
            alt=""
            className="rounded"
            style={{ width: compact ? '10px' : '12px', height: compact ? '10px' : '12px' }}
          />
        ) : (
          <FileText
            size={compact ? 9 : 10}
            className={isSelected ? 'text-purple-600' : 'text-gray-400'}
            strokeWidth={2}
          />
        )}
      </div>

      {/* Titre */}
      <span
        className={`truncate flex-1 transition-colors duration-150 ${isSelected
            ? 'text-purple-900 font-semibold'
            : 'text-gray-700 font-medium group-hover:text-gray-900'
          }`}
        style={{
          fontSize: compact ? '10px' : '11px',
          lineHeight: compact ? '12px' : '14px',
          letterSpacing: '-0.01em',
          fontWeight: isSelected ? 600 : 500,
        }}
      >
        {page.title}
      </span>

      {/* Check mark */}
      {isSelected && (
        <div className="flex-shrink-0">
          <Check
            size={compact ? 9 : 10}
            className="text-purple-600"
            strokeWidth={3}
          />
        </div>
      )}

      {/* Effet de survol */}
      <div
        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.01) 0%, rgba(0, 0, 0, 0.005) 100%)',
        }}
      />
    </button>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export function PageSelector({
  selectedPage,
  selectedPages = [], // 🔥 NOUVEAU: Pages sélectionnées multiples
  pages,
  onPageSelect,
  onMultiPageSelect, // 🔥 NOUVEAU: Callback sélection multiple
  placeholder = "Sélectionner une page",
  compact = false,
  className = "",
  mode = 'dropdown',
  allPages = [],
  multiSelect = false, // 🔥 NOUVEAU: Mode sélection multiple
  keepMenuOpen = false // 🔥 NOUVEAU: Garder le menu ouvert
}: PageSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ============================================
  // PAGES FILTRÉES - Recherche globale optimisée
  // ============================================
  const filteredPages = useMemo(() => {
    if (mode === 'direct') {
      if (!searchQuery.trim()) {
        // 🔥 CORRECTION ULTRA RIGOUREUSE: AFFICHER TOUTES les pages récentes disponibles
        const recentPages = Array.isArray(pages) ? pages : [];
        console.log('🔍 [PageSelector] RECENT PAGES DEBUG:', {
          totalAvailable: recentPages.length,
          displaying: recentPages.length,
          pages: recentPages.map(p => p.title)
        });
        return recentPages;
      }

      // 🔥 RECHERCHE ULTRA RIGOUREUSE: GARANTIR l'utilisation d'allPages
      const query = searchQuery.toLowerCase().trim();
      const searchInPages = Array.isArray(allPages) && allPages.length > 0 ? allPages : pages;
      
      console.log('🔍 [PageSelector] SEARCH DEBUG:', {
        query,
        searchingIn: searchInPages.length,
        usingAllPages: Array.isArray(allPages) && allPages.length > 0,
        allPagesCount: Array.isArray(allPages) ? allPages.length : 0,
        recentPagesCount: Array.isArray(pages) ? pages.length : 0
      });
      
      const filtered = searchInPages.filter(page => {
        if (!page || typeof page.title !== 'string') return false;
        return page.title.toLowerCase().includes(query);
      }).slice(0, 10);

      console.log('🔍 [PageSelector] SEARCH RESULTS:', {
        found: filtered.length,
        results: filtered.map(p => p.title)
      });
      
      return filtered;
    }

    // Mode dropdown
    if (!searchQuery.trim()) return pages;

    const query = searchQuery.toLowerCase();
    return pages.filter(page =>
      page.title.toLowerCase().includes(query)
    );
  }, [pages, searchQuery, mode, allPages]);

  const pageIcon = selectedPage ? getPageIcon(selectedPage) : null;

  // ============================================
  // HANDLERS
  // ============================================
  const handlePageSelect = useCallback((page: NotionPage) => {
    if (multiSelect && onMultiPageSelect) {
      // 🔥 NOUVEAU: Gestion sélection multiple
      const isSelected = selectedPages.some(p => p.id === page.id);
      let newSelection: NotionPage[];
      
      if (isSelected) {
        // Désélectionner la page
        newSelection = selectedPages.filter(p => p.id !== page.id);
      } else {
        // Sélectionner la page
        newSelection = [...selectedPages, page];
      }
      
      onMultiPageSelect(newSelection);
      
      // Ne pas fermer le menu en mode multi-sélection
      if (!keepMenuOpen && newSelection.length === 0) {
        setShowDropdown(false);
        setSearchQuery('');
      }
    } else {
      // Mode sélection simple
      onPageSelect(page);
      
      if (!keepMenuOpen) {
        setShowDropdown(false);
        setSearchQuery('');
      }
    }
  }, [onPageSelect, onMultiPageSelect, multiSelect, selectedPages, keepMenuOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredPages.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredPages.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredPages[selectedIndex]) {
          handlePageSelect(filteredPages[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  }, [showDropdown, filteredPages, selectedIndex, handlePageSelect]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, showDropdown]);

  // ============================================
  // RENDER
  // ============================================

  if (mode === 'direct') {
    // Mode direct : Design Apple/Notion parfait pour FloatingBubble
    return (
      <div className={className} onKeyDown={handleKeyDown}>
        {/* Search Bar - Design Apple/Notion parfait avec icône PARFAITEMENT intégrée */}
        <div style={{ 
          padding: '6px 8px 10px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              autoFocus
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '40px',
                paddingRight: '12px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#1f2937',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '-0.01em',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
              }}
            />
            {/* Icône Search PARFAITEMENT positionnée DANS la barre */}
            <Search
              size={14}
              className="text-gray-400"
              strokeWidth={2}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          </div>
        </div>

        {/* Section Title - Espacement parfait et démarcation claire */}
        {!searchQuery.trim() && filteredPages.length > 0 && (
          <div style={{
            padding: '16px 16px 8px',
            fontSize: '9px',
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            {multiSelect ? `Pages récentes (${selectedPages.length} sélectionnée${selectedPages.length > 1 ? 's' : ''})` : 'Pages récentes'}
          </div>
        )}

        {/* Pages List - ✅ PAS DE SCROLL (géré par parent) */}
        <div
          style={{
            padding: searchQuery.trim() ? '12px 12px 16px' : '0 12px 16px',
          }}
        >


          {filteredPages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: multiSelect ? '4px' : '2px' }}> {/* 🔧 RÉDUIT: Espacement plus compact */}
              {filteredPages.map((page, index) => {
                const icon = getPageIcon(page);
                const isSelected = multiSelect 
                  ? selectedPages.some(p => p.id === page.id)
                  : selectedPage?.id === page.id;
                const isHighlighted = index === selectedIndex;

                return (
                  <button
                    key={page.id}
                    data-index={index}
                    onClick={() => handlePageSelect(page)}
                    className="w-full flex items-center gap-3 text-left transition-all duration-200 ease-out group relative"
                    style={{
                      padding: multiSelect ? '10px 12px' : '8px 10px', // 🔧 RÉDUIT: Padding plus compact
                      borderRadius: '8px', // 🔧 RÉDUIT: Coins moins arrondis
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(147, 51, 234, 0.04) 100%)'
                        : isHighlighted
                          ? 'rgba(0, 0, 0, 0.03)'
                          : 'rgba(255, 255, 255, 0.5)',
                      border: isSelected
                        ? '1px solid rgba(168, 85, 247, 0.25)' // 🔧 RÉDUIT: Bordure plus fine
                        : '1px solid rgba(0, 0, 0, 0.06)',
                      transform: isHighlighted ? 'translateY(-0.5px)' : 'translateY(0)', // 🔧 RÉDUIT: Pas de scale, juste translateY subtil
                      boxShadow: isSelected
                        ? '0 2px 6px rgba(168, 85, 247, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)' // 🔧 RÉDUIT: Ombre plus subtile
                        : isHighlighted
                          ? '0 1px 4px rgba(0, 0, 0, 0.06)'
                          : '0 1px 2px rgba(0, 0, 0, 0.03)', // 🔧 RÉDUIT: Ombre très légère
                      cursor: 'pointer',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      minHeight: multiSelect ? '36px' : '32px', // 🔧 RÉDUIT: Hauteur plus compacte
                      backdropFilter: 'blur(4px) saturate(110%)', // 🔧 RÉDUIT: Effet de flou plus subtil
                      WebkitBackdropFilter: 'blur(4px) saturate(110%)',
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Page Icon - Plus compact */}
                    <div className="flex-shrink-0 flex items-center justify-center"
                         style={{
                           width: '16px',
                           height: '16px',
                           borderRadius: '4px',
                           background: isSelected
                             ? 'rgba(168, 85, 247, 0.08)'
                             : 'rgba(0, 0, 0, 0.03)',
                           transition: 'all 0.15s ease'
                         }}>
                      {icon?.type === 'emoji' ? (
                        <span style={{ fontSize: '10px', lineHeight: 1 }}>
                          {icon.value}
                        </span>
                      ) : icon?.type === 'url' ? (
                        <img
                          src={icon.value}
                          alt=""
                          className="rounded-sm"
                          style={{ width: '12px', height: '12px' }}
                        />
                      ) : (
                        <FileText
                          size={10}
                          className={isSelected ? 'text-purple-600' : 'text-gray-500'}
                          strokeWidth={2}
                        />
                      )}
                    </div>

                    {/* Page Title - Plus compact */}
                    <span
                      className={`truncate flex-1 transition-colors duration-150 ${isSelected
                          ? 'text-purple-900'
                          : 'text-gray-800 group-hover:text-gray-900'
                        }`}
                      style={{
                        fontSize: '12px', // 🔧 RÉDUIT: Plus petit
                        lineHeight: '16px',
                        letterSpacing: '-0.01em',
                        fontWeight: isSelected ? 600 : 500,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {page.title}
                    </span>

                    {/* Selection Indicator - Style Apple/Notion élégant */}
                    {multiSelect ? (
                      <div className="flex-shrink-0">
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: isSelected ? '1.5px solid #a855f7' : '1.5px solid #d1d5db',
                            background: isSelected
                              ? 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
                              : 'rgba(255, 255, 255, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isSelected
                              ? '0 2px 4px rgba(168, 85, 247, 0.25)'
                              : '0 1px 2px rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          {isSelected && (
                            <Check
                              size={9}
                              className="text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                      </div>
                    ) : isSelected ? (
                      <div className="flex-shrink-0">
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(168, 85, 247, 0.25)'
                        }}>
                          <Check
                            size={8}
                            className="text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Apple-style Hover Effect */}
                    <div
                      className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 100%)',
                        mixBlendMode: 'overlay',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center">
              <div
                style={{
                  marginTop: '24px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#9ca3af',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {searchQuery.trim() ? 'Aucune page trouvée' : 'Aucune page récente'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mode dropdown (comportement original)
  return (
    <div className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full flex items-center justify-between text-left transition-all group ${compact
            ? 'px-2 py-1.5 text-xs'
            : 'px-3 py-2 text-[13px]'
          } bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedPage ? (
            <>
              {pageIcon?.type === 'emoji' ? (
                <span className={compact ? 'text-sm' : 'text-base'} style={{ flexShrink: 0 }}>
                  {pageIcon.value}
                </span>
              ) : pageIcon?.type === 'url' ? (
                <img
                  src={pageIcon.value}
                  alt=""
                  className={`rounded ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}
                  style={{ flexShrink: 0 }}
                />
              ) : (
                <FileText
                  size={compact ? 12 : 16}
                  className="text-gray-400 dark:text-gray-500"
                  style={{ flexShrink: 0 }}
                />
              )}
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                {selectedPage.title}
              </span>
            </>
          ) : (
            <>
              <FileText
                size={compact ? 12 : 16}
                className="text-gray-400 dark:text-gray-500"
                style={{ flexShrink: 0 }}
              />
              <span className="font-medium text-gray-500 dark:text-gray-400 truncate">
                {placeholder}
              </span>
            </>
          )}
        </div>

        <ChevronDown
          size={compact ? 12 : 14}
          className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''
            }`}
          style={{ flexShrink: 0 }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <MotionDiv
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden"
            style={{ maxHeight: compact ? '40vh' : '60vh' }}
          >
            {/* Barre de recherche */}
            <div className={`border-b border-gray-200 dark:border-gray-700 ${compact ? 'p-1.5' : 'p-2'}`}>
              <div className="relative">
                <Search
                  size={compact ? 12 : 14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une page..."
                  autoFocus
                  className={`w-full pl-8 pr-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 ${compact ? 'py-1 text-xs' : 'py-1.5 text-[13px]'
                    }`}
                />
              </div>
            </div>

            {/* Liste des pages */}
            <div className={compact ? 'max-h-48 overflow-y-auto' : 'max-h-64 overflow-y-auto'}>
              {filteredPages.length > 0 ? (
                filteredPages.map((page, index) => (
                  <div key={page.id} data-index={index}>
                    <PageListItem
                      page={page}
                      isSelected={selectedPage?.id === page.id}
                      isHighlighted={index === selectedIndex}
                      onClick={() => handlePageSelect(page)}
                      compact={compact}
                    />
                  </div>
                ))
              ) : (
                <div className={`text-center text-gray-500 dark:text-gray-400 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'
                  }`}>
                  Aucune page trouvée
                </div>
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}