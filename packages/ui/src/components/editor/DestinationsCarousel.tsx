// packages/ui/src/components/editor/DestinationsCarousel.tsx
// 🎯 Carrousel interactif pour destinations avec TOC intégré (style Notion/Apple)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
  ChevronLeft, ChevronRight, FileText, Database, Hash,
  ArrowDown, Check, Send, X
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';
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
  onSectionSelect?: (blockId: string, headingText: string) => void;
  selectedSection?: SelectedSection;
  multiSelectMode: boolean;
}) {
  const { t } = useTranslation();
  const icon = getPageIcon(page);
  const [showTOC, setShowTOC] = useState(false);

  const handleInsertAfter = useCallback((blockId: string, headingText: string) => {
    console.log('[PageDestination] 📍 Section selected:', { pageId: page.id, blockId, headingText });
    onSectionSelect?.(blockId, headingText);
  }, [onSectionSelect, page.id]);

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative flex-shrink-0 w-72 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-purple-500/5"
    >
      {/* Header de la page */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10 dark:to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon.type === 'emoji' && icon.value && <span className="text-lg">{icon.value}</span>}
            {icon.type === 'url' && icon.value && <img src={icon.value} alt="" className="w-5 h-5 rounded" />}
            {icon.type === 'default' && <FileText size={18} className="text-gray-400 dark:text-gray-500" />}
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {page.title || t('common.untitled')}
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
          <span>{showTOC ? t('common.hideSections') : t('common.chooseSection')}</span>
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
  const { t } = useTranslation();
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
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all shadow-sm ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 via-purple-50 to-pink-50 dark:from-purple-900/40 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center border border-purple-200/50 dark:border-purple-700/30 shadow-sm">
              <Send size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {multiSelectMode ? t('common.destinations') : t('common.destination')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('common.selectPagesToStart')}
              </p>
            </div>
          </div>

          <div className="h-24 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-purple-300/50 dark:border-purple-700/40">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('common.noPageSelected')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sélectionnez une page dans la sidebar</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 transition-all shadow-sm hover:shadow-md hover:shadow-purple-500/5 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 via-purple-50 to-pink-50 dark:from-purple-900/40 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center border border-purple-200/50 dark:border-purple-700/30 shadow-sm">
              <Send size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {multiSelectMode ? t('common.destinations') : t('common.destination')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {displayPages.length === 1 
                  ? t('common.pageSelected') 
                  : t('common.pagesSelectedCount', { count: displayPages.length })
                }
              </p>
            </div>
          </div>


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