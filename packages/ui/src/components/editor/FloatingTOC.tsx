/**
 * FloatingTOC - Table des Matières flottante style Notion
 * Support single-page et multi-page avec tabs
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { Hash, ChevronRight, ChevronDown, X } from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';
import { TableOfContents } from './TableOfContents';

interface PageInfo {
  id: string;
  title: string;
  icon?: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
}

interface SectionSelection {
  pageId: string;
  blockId: string | null;
  headingText: string | null;
}

interface FloatingTOCProps {
  // Single mode
  pageId?: string;
  pageTitle?: string;
  pageIcon?: any;

  // Multi mode
  multiSelectMode: boolean;
  selectedPages: PageInfo[];

  // Selection tracking
  onSectionSelect?: (pageId: string, blockId: string, headingText: string) => void;
  selectedSections?: Array<{
    pageId: string;
    blockId: string;
    headingText: string;
  }>;

  // UI
  className?: string;
  collapsible?: boolean;
}

export function FloatingTOC({
  pageId,
  pageTitle,
  pageIcon,
  multiSelectMode,
  selectedPages,
  onSectionSelect,
  selectedSections = [],
  className = '',
  collapsible = true,
}: FloatingTOCProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const displayPages = multiSelectMode ? selectedPages :
    (pageId ? [{ id: pageId, title: pageTitle || 'Untitled', icon: pageIcon }] : []);

  const currentPage = displayPages[activeTabIndex];

  const handleSectionSelect = useCallback((blockId: string, headingText: string) => {
    if (currentPage && onSectionSelect) {
      onSectionSelect(currentPage.id, blockId, headingText);
    }
  }, [currentPage, onSectionSelect]);

  const getSelectedSectionForPage = (pageId: string) => {
    return selectedSections.find(s => s.pageId === pageId);
  };

  const getPageIcon = (page: PageInfo) => {
    if (!page.icon) return null;

    if (page.icon.type === 'emoji' && page.icon.emoji) {
      return <span className="text-sm">{page.icon.emoji}</span>;
    }

    if (page.icon.type === 'external' && page.icon.external?.url) {
      return <img src={page.icon.external.url} alt="" className="w-4 h-4 rounded" />;
    }

    if (page.icon.type === 'file' && page.icon.file?.url) {
      return <img src={page.icon.file.url} alt="" className="w-4 h-4 rounded" />;
    }

    return null;
  };

  if (displayPages.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-24 right-6 w-64 z-40 ${className}`}>
      <div className="bg-white dark:bg-[#191919] rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {multiSelectMode ? `${t('common.tableOfContents')} (${displayPages.length})` : t('common.tableOfContents')}
              </span>
            </div>
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <MotionDiv
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Tabs for multi-select mode */}
              {multiSelectMode && displayPages.length > 1 && (
                <div className="px-2 pt-2 flex gap-1 overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-gray-800">
                  {displayPages.map((page, index) => {
                    const isActive = index === activeTabIndex;
                    const hasSelection = getSelectedSectionForPage(page.id);

                    return (
                      <button
                        key={page.id}
                        onClick={() => setActiveTabIndex(index)}
                        className={`
                          flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all
                          ${isActive
                            ? 'bg-white dark:bg-[#191919] text-gray-900 dark:text-gray-100 border-t border-l border-r border-gray-200 dark:border-gray-700'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        {getPageIcon(page)}
                        <span className="truncate max-w-[120px]">{page.title}</span>
                        {hasSelection && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TOC Content */}
              {currentPage && (
                <div className="p-4 max-h-[500px] overflow-y-auto scrollbar-thin">
                  <TableOfContents
                    pageId={currentPage.id}
                    multiSelectMode={false}
                    onInsertAfter={handleSectionSelect}
                    className="relative"
                    compact={true}
                  />

                  {/* Selected section indicator */}
                  {(() => {
                    const selection = getSelectedSectionForPage(currentPage.id);
                    if (selection) {
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                              <Hash size={10} />
                              <span className="truncate">{selection.headingText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Multi-select summary */}
              {multiSelectMode && displayPages.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedSections.length}/{displayPages.length} sections selected
                  </p>
                </div>
              )}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
