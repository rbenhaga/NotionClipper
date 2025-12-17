/**
 * SectionList - Displays the heading structure of a page with selectable items
 * 
 * Shows the hierarchical heading structure of the active page in the multi-page
 * TOC system. Supports selection highlighting, loading states, error handling,
 * and virtualization for large lists.
 * 
 * @module SectionList
 * 
 * Requirements: 2.1, 2.3, 2.5, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8, 12.3, 12.5, 12.6, 12.8
 * 
 * WCAG AAA Contrast Compliance (Req 12.8):
 * - Text colors use gray-700 on white backgrounds (contrast ratio > 7:1)
 * - Selected items use purple-700 on purple-50 background (contrast ratio > 7:1)
 * - Heading level badges use high-contrast color combinations:
 *   - H1: blue-600 on blue-100 (contrast ratio > 4.5:1)
 *   - H2: green-600 on green-100 (contrast ratio > 4.5:1)
 *   - H3: orange-600 on orange-100 (contrast ratio > 4.5:1)
 * - Dark mode uses appropriate light text on dark backgrounds
 * - Focus indicators use purple-500 ring (contrast ratio > 4.5:1 for UI components)
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Circle,
  ArrowDown,
  AlertCircle, 
  RefreshCw,
  Hash,
  CornerDownRight,
  ArrowDownToLine
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';
import type { PageHeading, PageStructure, InsertionMode, SectionTarget } from '@notion-clipper/core-shared';

/**
 * Props for the SectionList component
 */
export interface SectionListProps {
  /** Page structure containing headings, null if not loaded */
  pageStructure: PageStructure | null;
  /** Currently selected block ID, null if "End of Page" or no selection (legacy single select) */
  selectedBlockId: string | null;
  /** Set of selected block IDs for multi-select mode */
  selectedBlockIds?: Set<string>;
  /** Callback when a section is selected/toggled */
  onSelect: (blockId: string | null, headingText: string | null, level: number | null) => void;
  /** Whether multi-select mode is enabled */
  multiSelect?: boolean;
  /** Whether the page structure is currently loading */
  loading: boolean;
  /** Error message if fetching failed */
  error?: string;
  /** Callback to retry fetching page structure */
  onRetry?: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Height of the list container (default: 300) */
  height?: number;
  /** ID for the listbox element (Req 12.3) */
  id?: string;
  /** Page title for screen reader context (Req 12.5) */
  pageTitle?: string;
  /** Selected targets with their insertion modes */
  selectedTargets?: SectionTarget[];
  /** Callback when insertion mode changes for a specific section */
  onInsertionModeChange?: (blockId: string, mode: InsertionMode) => void;
  /** Default insertion mode for new selections */
  defaultInsertionMode?: InsertionMode;
}

/**
 * Threshold for enabling virtualization (Req 3.8)
 */
const VIRTUALIZATION_THRESHOLD = 50;

/**
 * Height of each section item in pixels
 */
const ITEM_HEIGHT = 40;

/**
 * Get indentation class based on heading level (Req 3.3)
 * H1 = no indent, H2 = 1 level indent, H3 = 2 levels indent
 * Using margin-left for clear visual hierarchy
 */
function getIndentClass(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return 'ml-0';
    case 2:
      return 'ml-4';
    case 3:
      return 'ml-8';
    default:
      return 'ml-0';
  }
}

/**
 * Get heading level indicator text
 */
function getLevelIndicator(level: 1 | 2 | 3): string {
  return `H${level}`;
}

/**
 * Props for individual section item
 */
interface SectionItemProps {
  heading: PageHeading;
  isSelected: boolean;
  onSelect: () => void;
  style?: React.CSSProperties;
  /** Index in the list for keyboard navigation (Req 12.6) */
  index?: number;
  /** Total count for screen reader context */
  totalCount?: number;
  /** Current insertion mode for this section */
  insertionMode?: InsertionMode;
  /** Callback to toggle insertion mode */
  onToggleInsertionMode?: () => void;
}

/**
 * Individual section item component (Req 12.3)
 */
const SectionItem: React.FC<SectionItemProps> = ({ 
  heading, 
  isSelected, 
  onSelect,
  style,
  index = 0,
  totalCount = 1,
  insertionMode = 'after-heading',
  onToggleInsertionMode,
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }, [onSelect]);

  const handleToggleMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleInsertionMode?.();
  }, [onToggleInsertionMode]);

  // Generate accessible label (Req 12.3, 12.5)
  const ariaLabel = `${heading.text}, heading level ${heading.level}, ${isSelected ? 'selected' : 'not selected'}, ${index + 1} of ${totalCount}`;

  return (
    <div style={style} className={getIndentClass(heading.level)}>
      <button
        id={`section-item-${heading.id}`}
        role="option"
        aria-selected={isSelected}
        aria-label={ariaLabel}
        aria-posinset={index + 1}
        aria-setsize={totalCount}
        data-section-index={index}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm
          transition-all duration-150 text-left
          focus:outline-none
          ${isSelected
            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }
        `}
      >
        {/* Selection indicator */}
        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
          {isSelected ? (
            <Check 
              size={14} 
              strokeWidth={2.5}
              className="text-purple-600 dark:text-purple-400"
            />
          ) : (
            <Circle 
              size={10} 
              strokeWidth={2}
              className="text-gray-300 dark:text-gray-600"
            />
          )}
        </span>

        {/* Heading level badge */}
        <span 
          className={`
            flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded
            ${heading.level === 1 
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : heading.level === 2
                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
            }
          `}
          aria-hidden="true"
        >
          {getLevelIndicator(heading.level)}
        </span>

        {/* Heading text */}
        <span className="truncate flex-1" title={heading.text} aria-hidden="true">
          {heading.text}
        </span>

        {/* Insertion mode toggle - only show when selected */}
        {isSelected && onToggleInsertionMode && (
          <button
            type="button"
            onClick={handleToggleMode}
            className={`
              flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-md
              transition-all duration-150 border shadow-sm
              cursor-pointer select-none
              hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1
              ${insertionMode === 'after-heading'
                ? 'bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-900/70 text-purple-700 dark:text-purple-200 border-purple-300 dark:border-purple-500 hover:from-purple-100 hover:to-purple-150 dark:hover:from-purple-900/60 dark:hover:to-purple-900/80 focus:ring-purple-400'
                : 'bg-gradient-to-b from-orange-50 to-orange-100 dark:from-orange-900/50 dark:to-orange-900/70 text-orange-700 dark:text-orange-200 border-orange-300 dark:border-orange-500 hover:from-orange-100 hover:to-orange-150 dark:hover:from-orange-900/60 dark:hover:to-orange-900/80 focus:ring-orange-400'
              }
            `}
            title={insertionMode === 'after-heading' 
              ? 'Insert after heading → Click to switch to end of section' 
              : 'Insert at end of section → Click to switch to after heading'}
            aria-label={`Insertion mode: ${insertionMode === 'after-heading' ? 'After heading' : 'End of section'}. Click to toggle.`}
          >
            {insertionMode === 'after-heading' ? (
              <>
                <CornerDownRight size={12} strokeWidth={2.5} />
                <span>After</span>
              </>
            ) : (
              <>
                <ArrowDownToLine size={12} strokeWidth={2.5} />
                <span>End</span>
              </>
            )}
          </button>
        )}
      </button>
    </div>
  );
};

/**
 * End of Page option component (Req 2.3, 12.3)
 */
interface EndOfPageOptionProps {
  isSelected: boolean;
  onSelect: () => void;
  /** Total count of sections for position context */
  totalSections?: number;
}

const EndOfPageOption: React.FC<EndOfPageOptionProps> = ({ isSelected, onSelect, totalSections = 0 }) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }, [onSelect]);

  // Generate accessible label (Req 12.3)
  const ariaLabel = `End of Page, append content at bottom, ${isSelected ? 'selected' : 'not selected'}, ${totalSections + 2} of ${totalSections + 2}`;

  return (
    <button
      id="section-item-end-of-page"
      role="option"
      aria-selected={isSelected}
      aria-label={ariaLabel}
      aria-posinset={totalSections + 2}
      aria-setsize={totalSections + 2}
      data-section-index={totalSections + 1}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`
        w-full flex items-center gap-2 px-2 py-2 pl-3 rounded-lg text-sm
        transition-all duration-150 text-left mt-2
        focus:outline-none
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
        }
      `}
    >
      {/* Selection indicator */}
      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
        {isSelected ? (
          <Check 
            size={14} 
            strokeWidth={2.5}
            className="text-blue-600 dark:text-blue-400"
          />
        ) : (
          <ArrowDown size={12} strokeWidth={2} className="text-gray-400 dark:text-gray-500" />
        )}
      </span>

      {/* Label */}
      <span className="font-medium" aria-hidden="true">End of Page</span>
    </button>
  );
};

/**
 * Skeleton loading state component (Req 3.5)
 */
const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-2 p-2 animate-pulse" role="status" aria-label="Loading sections">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`flex items-center gap-2 py-2 ${i % 2 === 0 ? 'pl-6' : 'pl-3'}`}
        >
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div 
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded" 
            style={{ width: `${60 + (i * 10) % 30}%` }}
          />
        </div>
      ))}
      <span className="sr-only">Loading page sections...</span>
    </div>
  );
};

/**
 * Empty state component (Req 3.4)
 */
const EmptyState: React.FC = () => {
  return (
    <div 
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
      role="status"
    >
      <Hash 
        size={32} 
        strokeWidth={1.5}
        className="text-gray-300 dark:text-gray-600 mb-3"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        No sections found
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Content will be inserted at end of page
      </p>
    </div>
  );
};

/**
 * Error state component (Req 3.7)
 */
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div 
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
      role="alert"
    >
      <AlertCircle 
        size={32} 
        strokeWidth={1.5}
        className="text-red-400 dark:text-red-500 mb-3"
      />
      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
        Failed to load sections
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        {error}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30
                     rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50
                     transition-colors focus:outline-none"
        >
          <RefreshCw size={12} strokeWidth={2} />
          Retry
        </button>
      )}
    </div>
  );
};

/**
 * SectionList component for displaying page headings
 * 
 * Features:
 * - Hierarchical indentation based on heading level (Req 3.2, 3.3)
 * - "End of Page" option at bottom (Req 2.3)
 * - Selection highlighting and click handling (Req 2.1, 2.5)
 * - Skeleton loading state (Req 3.5)
 * - "No sections found" empty state (Req 3.4)
 * - Error state with retry button (Req 3.7)
 * - Virtualization for lists with >50 headings (Req 3.8)
 * 
 * @example
 * ```tsx
 * <SectionList
 *   pageStructure={currentPageStructure}
 *   selectedBlockId={selection?.blockId}
 *   onSelect={(blockId, text, level) => handleSelect(blockId, text, level)}
 *   loading={isLoading}
 *   error={fetchError}
 *   onRetry={refetch}
 * />
 * ```
 */
export function SectionList({
  pageStructure,
  selectedBlockId,
  selectedBlockIds = new Set(),
  onSelect,
  multiSelect = false,
  loading,
  error,
  onRetry,
  className = '',
  height = 300,
  id = 'toc-section-list-panel',
  pageTitle = 'current page',
  selectedTargets = [],
  onInsertionModeChange,
  defaultInsertionMode = 'after-heading',
}: SectionListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track focused index for keyboard navigation (Req 12.6)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Flatten headings for display (maintaining hierarchy through indentation)
  const flattenedHeadings = useMemo(() => {
    if (!pageStructure?.headings) return [];
    return pageStructure.headings;
  }, [pageStructure?.headings]);

  // Total items including "End of Page" option
  const totalItems = flattenedHeadings.length + 1;

  // Check if a block is selected (supports both single and multi-select)
  const isBlockSelected = useCallback((blockId: string | null): boolean => {
    if (multiSelect) {
      if (blockId === null) return selectedBlockIds.has('end-of-page');
      return selectedBlockIds.has(blockId);
    }
    return selectedBlockId === blockId;
  }, [multiSelect, selectedBlockId, selectedBlockIds]);

  // Get insertion mode for a specific block
  const getInsertionMode = useCallback((blockId: string): InsertionMode => {
    const target = selectedTargets.find(t => t.blockId === blockId);
    return target?.insertionMode || defaultInsertionMode;
  }, [selectedTargets, defaultInsertionMode]);

  // Toggle insertion mode for a specific block
  const handleToggleInsertionMode = useCallback((blockId: string) => {
    if (!onInsertionModeChange) return;
    const currentMode = getInsertionMode(blockId);
    const newMode: InsertionMode = currentMode === 'after-heading' ? 'end-of-section' : 'after-heading';
    onInsertionModeChange(blockId, newMode);
  }, [getInsertionMode, onInsertionModeChange]);

  /**
   * Handle keyboard navigation for sections (Req 12.6)
   * Supports Arrow Up/Down for navigation and Space/Enter for selection
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (loading || error) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < totalItems - 1 ? prev + 1 : 0;
          // Focus the element
          const nextElement = containerRef.current?.querySelector(
            `[data-section-index="${next}"]`
          ) as HTMLElement;
          nextElement?.focus();
          return next;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : totalItems - 1;
          // Focus the element
          const nextElement = containerRef.current?.querySelector(
            `[data-section-index="${next}"]`
          ) as HTMLElement;
          nextElement?.focus();
          return next;
        });
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        const firstElement = containerRef.current?.querySelector(
          '[data-section-index="0"]'
        ) as HTMLElement;
        firstElement?.focus();
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(totalItems - 1);
        const lastElement = containerRef.current?.querySelector(
          `[data-section-index="${totalItems - 1}"]`
        ) as HTMLElement;
        lastElement?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flattenedHeadings.length) {
          const heading = flattenedHeadings[focusedIndex];
          onSelect(heading.id, heading.text, heading.level);
        } else if (focusedIndex === flattenedHeadings.length) {
          // End of Page option
          onSelect(null, null, null);
        }
        break;
    }
  }, [loading, error, totalItems, flattenedHeadings, focusedIndex, onSelect]);

  // Reset focused index when page structure changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [pageStructure?.pageId]);

  // Determine if "End of Page" is selected
  const isEndOfPageSelected = isBlockSelected(null) && pageStructure !== null;

  // Check if virtualization should be used (Req 3.8)
  const useVirtualization = flattenedHeadings.length > VIRTUALIZATION_THRESHOLD;

  // Handle section selection
  const handleSectionSelect = useCallback((heading: PageHeading) => {
    onSelect(heading.id, heading.text, heading.level);
  }, [onSelect]);

  // Handle "End of Page" selection
  const handleEndOfPageSelect = useCallback(() => {
    onSelect(null, null, null);
  }, [onSelect]);

  // Render virtualized row (Req 12.3)
  const renderVirtualizedRow = useCallback(({ index, style }: ListChildComponentProps) => {
    const heading = flattenedHeadings[index];
    return (
      <SectionItem
        key={heading.id}
        heading={heading}
        isSelected={isBlockSelected(heading.id)}
        onSelect={() => handleSectionSelect(heading)}
        style={style}
        index={index}
        totalCount={flattenedHeadings.length}
      />
    );
  }, [flattenedHeadings, isBlockSelected, handleSectionSelect]);

  // Show loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <SkeletonLoader />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`${className}`}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Show empty state if no headings (Req 12.6)
  if (!pageStructure || flattenedHeadings.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={`${className}`}
        id={id}
        role="tabpanel"
        aria-label={`Sections for ${pageTitle}`}
        onKeyDown={handleKeyDown}
      >
        <EmptyState />
        <div className="px-3 pb-3" role="listbox" aria-label="Insertion options" tabIndex={0}>
          <EndOfPageOption 
            isSelected={isEndOfPageSelected} 
            onSelect={handleEndOfPageSelect}
            totalSections={0}
          />
        </div>
      </div>
    );
  }

  // Render with virtualization for large lists (Req 3.8, 12.3, 12.6)
  if (useVirtualization) {
    return (
      <div 
        ref={containerRef}
        className={`${className}`}
        id={id}
        role="tabpanel"
        aria-label={`Sections for ${pageTitle}`}
        onKeyDown={handleKeyDown}
      >
        <div
          role="listbox"
          aria-label={`${flattenedHeadings.length} sections available`}
          aria-activedescendant={selectedBlockId ? `section-item-${selectedBlockId}` : isEndOfPageSelected ? 'section-item-end-of-page' : undefined}
          tabIndex={0}
        >
          <List
            ref={listRef}
            height={height}
            itemCount={flattenedHeadings.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          >
            {renderVirtualizedRow}
          </List>
          <div className="px-3 pb-3">
            <EndOfPageOption 
              isSelected={isEndOfPageSelected} 
              onSelect={handleEndOfPageSelect}
              totalSections={flattenedHeadings.length}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render regular list for smaller lists (Req 12.3, 12.6)
  return (
    <div 
      ref={containerRef}
      className={`${className}`}
      id={id}
      role="tabpanel"
      aria-label={`Sections for ${pageTitle}`}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="space-y-1 p-1 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        role="listbox"
        aria-label={`${flattenedHeadings.length} sections available`}
        aria-activedescendant={selectedBlockId ? `section-item-${selectedBlockId}` : isEndOfPageSelected ? 'section-item-end-of-page' : undefined}
        tabIndex={0}
      >
        <AnimatePresence mode="popLayout">
          {flattenedHeadings.map((heading, index) => (
            <MotionDiv
              key={heading.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <SectionItem
                heading={heading}
                isSelected={isBlockSelected(heading.id)}
                onSelect={() => handleSectionSelect(heading)}
                index={index}
                totalCount={flattenedHeadings.length}
                insertionMode={getInsertionMode(heading.id)}
                onToggleInsertionMode={isBlockSelected(heading.id) ? () => handleToggleInsertionMode(heading.id) : undefined}
              />
            </MotionDiv>
          ))}
        </AnimatePresence>
        
        {/* End of Page option */}
        <EndOfPageOption 
          isSelected={isEndOfPageSelected} 
          onSelect={handleEndOfPageSelect}
          totalSections={flattenedHeadings.length}
        />
      </div>
    </div>
  );
}

export default SectionList;
