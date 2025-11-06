// packages/ui/src/components/editor/DestinationsCarousel.tsx
// 🎯 Carrousel interactif pour destinations avec TOC intégré (style Notion/Apple)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { 
  ChevronLeft, ChevronRight, FileText, Database, Hash, 
  ArrowDown, Check, Send, X 
} from 'lucide-react';
import { TableOfContents } from './TableOfContents';

interface Page {
  id: string;
  title: string;
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  object?: string;
  parent?: {
    type: string;
    database_id?: string;
    data_source_id?: string;
  };
}

interface SelectedSection {
  pageId: string;
  blockId: string;
  headingText: string;
}

interface DestinationsCarouselProps {
  selectedPage: Page | null;
  selectedPages: string[];
  multiSelectMode: boolean;
  pages: Page[];
  onDeselectPage?: (pageId: string) => void;
  onSectionSelect?: (pageId: string, blockId: string, headingText: string) => void;
  selectedSections?: SelectedSection[];
  className?: string;
}

// Helper pour l'icône de page
function getPageIcon(page: Page) {
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

// Composant pour une page individuelle avec TOC
function PageDestination({ 
  page, 
  isActive, 
  onRemove, 
  onSectionSelect,
  selectedSection,
  multiSelectMode 
}: {
  page: Page;
  isActive: boolean;
  onRemove?: () => void;
  onSectionSelect?: (pageId: string, blockId: string, headingText: string) => void;
  selectedSection?: SelectedSection;
  multiSelectMode: boolean;
}) {
  const icon = getPageIcon(page);
  const [showTOC, setShowTOC] = useState(false);

  const handleInsertAfter = useCallback((blockId: string, headingText: string) => {
    onSectionSelect?.(page.id, blockId, headingText);
  }, [onSectionSelect, page.id]);

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative flex-shrink-0 w-72 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-300
        ${isActive 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Header de la page */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon.type === 'emoji' && icon.value && <span className="text-lg">{icon.value}</span>}
            {icon.type === 'url' && icon.value && <img src={icon.value} alt="" className="w-5 h-5 rounded" />}
            {icon.type === 'default' && <FileText size={18} className="text-gray-400 dark:text-gray-500" />}
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {page.title || 'Sans titre'}
              </h3>
              {selectedSection && (
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                  <Hash size={10} />
                  <span className="truncate">{selectedSection.headingText}</span>
                </p>
              )}
            </div>
          </div>

          {multiSelectMode && onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Bouton pour afficher/masquer TOC */}
        <button
          onClick={() => setShowTOC(!showTOC)}
          className={`
            mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
            ${showTOC 
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            }
          `}
        >
          <Hash size={12} />
          <span>{showTOC ? 'Masquer sections' : 'Choisir section'}</span>
          <ArrowDown size={12} className={`transition-transform ${showTOC ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* TOC intégré */}
      <AnimatePresence>
        {showTOC && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 max-h-64 overflow-y-auto">
              <TableOfContents
                pageId={page.id}
                multiSelectMode={false} // Force single mode pour l'affichage dans le carrousel
                onInsertAfter={handleInsertAfter}
                className="relative" // Override la position fixed
                compact={true} // Mode compact pour le carrousel
              />
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
}

export function DestinationsCarousel({
  selectedPage,
  selectedPages,
  multiSelectMode,
  pages,
  onDeselectPage,
  onSectionSelect,
  selectedSections = [],
  className = ''
}: DestinationsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Déterminer les pages à afficher - mémorisé pour éviter les re-renders
  const displayPages = React.useMemo(() => {
    if (multiSelectMode) {
      return selectedPages.map(id => pages.find(p => p.id === id)).filter(Boolean) as Page[];
    }
    return selectedPage ? [selectedPage] : [];
  }, [multiSelectMode, selectedPages, selectedPage, pages]);

  // Navigation
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < displayPages.length - 1;

  const scrollTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, displayPages.length - 1)));
  };

  // Auto-scroll vers la page active
  useEffect(() => {
    if (scrollRef.current && displayPages.length > 0) {
      const container = scrollRef.current;
      const cardWidth = 288; // 72 * 4 = 288px (w-72)
      const gap = 16; // gap-4 = 16px
      const scrollPosition = currentIndex * (cardWidth + gap);
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  // Handlers mémorisés
  const handleSectionSelect = useCallback((pageId: string, blockId: string, headingText: string) => {
    console.log('[DestinationsCarousel] 📍 Section selected:', { pageId, blockId, headingText });
    onSectionSelect?.(pageId, blockId, headingText);
  }, [onSectionSelect]);

  const handleRemovePage = useCallback((pageId: string) => {
    onDeselectPage?.(pageId);
    // Ajuster l'index si nécessaire
    if (currentIndex >= displayPages.length - 1) {
      setCurrentIndex(Math.max(0, displayPages.length - 2));
    }
  }, [onDeselectPage, currentIndex, displayPages.length]);

  if (displayPages.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 flex items-center justify-center">
              <Send size={14} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {multiSelectMode ? 'Destinations' : 'Destination'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sélectionnez des pages pour commencer
              </p>
            </div>
          </div>

          <div className="h-32 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <Database size={24} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune page sélectionnée</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 flex items-center justify-center">
              <Send size={14} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {multiSelectMode ? 'Destinations' : 'Destination'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {displayPages.length === 1 
                  ? '1 page sélectionnée' 
                  : `${displayPages.length} pages sélectionnées`
                }
              </p>
            </div>
          </div>

          {/* Navigation pour multi-pages */}
          {displayPages.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollTo(currentIndex - 1)}
                disabled={!canScrollLeft}
                className={`p-2 rounded-lg transition-all ${
                  canScrollLeft 
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700' 
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {displayPages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex 
                        ? 'bg-blue-500' 
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => scrollTo(currentIndex + 1)}
                disabled={!canScrollRight}
                className={`p-2 rounded-lg transition-all ${
                  canScrollRight 
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700' 
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Carrousel */}
        <div className="relative overflow-hidden">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto notion-scrollbar-horizontal"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {displayPages.map((page, index) => {
              const selectedSection = selectedSections.find(s => s.pageId === page.id);
              
              return (
                <div key={page.id} style={{ scrollSnapAlign: 'start' }}>
                  <PageDestination
                    page={page}
                    isActive={index === currentIndex}
                    onRemove={multiSelectMode ? () => handleRemovePage(page.id) : undefined}
                    onSectionSelect={(blockId, headingText) => 
                      handleSectionSelect(page.id, blockId, headingText)
                    }
                    selectedSection={selectedSection}
                    multiSelectMode={multiSelectMode}
                  />
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}