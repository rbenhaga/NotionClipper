/**
 * useTOCState - Custom hook for managing multi-page TOC state
 * 
 * Provides state management for the Table of Contents multi-select feature,
 * including section selections, active tab tracking, and smart matching results.
 * 
 * @module useTOCState
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  PageInfo,
  PageSectionSelection,
  SectionMatch,
  MultiPageTOCState,
  InsertionMode,
} from '@notion-clipper/core-shared';

/**
 * Return type for the useTOCState hook
 */
export interface UseTOCStateReturn {
  /** Current TOC state */
  tocState: MultiPageTOCState;
  /** Set the entire TOC state */
  setTocState: React.Dispatch<React.SetStateAction<MultiPageTOCState>>;
  /** Select a section for a specific page */
  selectSection: (pageId: string, selection: PageSectionSelection) => void;
  /** Clear selection for a specific page */
  clearSelection: (pageId: string) => void;
  /** Reset all selections across all pages */
  resetAllSelections: () => void;
  /** Apply smart fill selections from matched sections */
  applySmartFill: (matches: SectionMatch[]) => void;
  /** Select "End of Page" for all pages */
  selectAllEndOfPage: (pages: PageInfo[]) => void;
  /** Set the active tab page ID */
  setActiveTab: (pageId: string) => void;
  /** Update smart matches */
  setSmartMatches: (matches: SectionMatch[]) => void;
  /** Set insertion mode */
  setInsertionMode: (mode: InsertionMode) => void;
  /** Toggle expanded state */
  toggleExpanded: () => void;
  /** Get selection count */
  selectionCount: number;
  /** Check if a page has a selection */
  hasSelection: (pageId: string) => boolean;
  /** Get selection for a specific page */
  getSelection: (pageId: string) => PageSectionSelection | undefined;
}

/**
 * Creates the initial TOC state
 * 
 * @param selectedPages - Array of selected pages
 * @returns Initial MultiPageTOCState
 */
function createInitialState(selectedPages: PageInfo[]): MultiPageTOCState {
  return {
    selections: new Map<string, PageSectionSelection>(),
    activeTabPageId: selectedPages[0]?.id || '',
    smartMatches: [],
    mode: 'manual',
    isExpanded: true,
    insertionMode: 'after-heading', // Default: insert right after the heading
  };
}

/**
 * Custom hook for managing multi-page TOC state
 * 
 * Implements state management for:
 * - Section selections per page (Map<pageId, PageSectionSelection>)
 * - Active tab tracking
 * - Smart matching results
 * - Selection mode (manual, smart-fill, all-same)
 * - Insertion mode preferences
 * 
 * @param selectedPages - Array of pages selected for multi-page operations
 * @returns TOC state and management functions
 * 
 * @example
 * ```tsx
 * const { tocState, selectSection, resetAllSelections } = useTOCState(selectedPages);
 * 
 * // Select a section for a page
 * selectSection('page-123', {
 *   pageId: 'page-123',
 *   pageTitle: 'Meeting Notes',
 *   blockId: 'block-456',
 *   headingText: 'Action Items',
 *   headingLevel: 2,
 *   confidence: 100
 * });
 * ```
 */
export function useTOCState(selectedPages: PageInfo[]): UseTOCStateReturn {
  const [tocState, setTocState] = useState<MultiPageTOCState>(() => 
    createInitialState(selectedPages)
  );

  /**
   * Clean up selections when pages are deselected
   * Remove selections for pages that are no longer in selectedPages
   */
  React.useEffect(() => {
    const selectedPageIds = new Set(selectedPages.map(p => p.id));
    
    setTocState(prev => {
      // If no pages selected, clear everything
      if (selectedPages.length === 0) {
        return {
          ...prev,
          selections: new Map<string, PageSectionSelection>(),
          smartMatches: [],
          activeTabPageId: '',
        };
      }
      
      // Remove selections for pages that are no longer selected
      const newSelections = new Map<string, PageSectionSelection>();
      let hasChanges = false;
      
      for (const [pageId, selection] of prev.selections) {
        if (selectedPageIds.has(pageId)) {
          newSelections.set(pageId, selection);
        } else {
          hasChanges = true;
        }
      }
      
      // Also check if active tab is still valid
      const activeTabValid = selectedPageIds.has(prev.activeTabPageId);
      const newActiveTab = activeTabValid ? prev.activeTabPageId : (selectedPages[0]?.id || '');
      
      if (!hasChanges && activeTabValid) {
        return prev;
      }
      
      return {
        ...prev,
        selections: newSelections,
        activeTabPageId: newActiveTab,
      };
    });
  }, [selectedPages]);

  /**
   * Select a section for a specific page
   * Updates the selections Map with the new selection
   * 
   * Requirements: 2.1, 2.2
   */
  const selectSection = useCallback((pageId: string, selection: PageSectionSelection) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      newSelections.set(pageId, selection);
      return { 
        ...prev, 
        selections: newSelections,
        mode: 'manual' // Reset to manual mode when user makes individual selection
      };
    });
  }, []);

  /**
   * Clear selection for a specific page
   * Removes the page from the selections Map
   * 
   * Requirements: 2.1
   */
  const clearSelection = useCallback((pageId: string) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      newSelections.delete(pageId);
      return { 
        ...prev, 
        selections: newSelections,
        mode: 'manual'
      };
    });
  }, []);

  /**
   * Reset all selections across all pages
   * Clears the entire selections Map
   * 
   * Requirements: 7.3
   */
  const resetAllSelections = useCallback(() => {
    setTocState(prev => ({
      ...prev,
      selections: new Map<string, PageSectionSelection>(),
      mode: 'manual',
    }));
  }, []);

  /**
   * Apply smart fill selections from matched sections
   * Sets selections for all pages that have matching sections
   * 
   * Requirements: 7.2, 8.4
   */
  const applySmartFill = useCallback((matches: SectionMatch[]) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      
      matches.forEach(match => {
        match.matchedPages.forEach(page => {
          newSelections.set(page.pageId, {
            pageId: page.pageId,
            pageTitle: page.pageTitle,
            blockId: page.blockId,
            headingText: match.headingText,
            headingLevel: match.headingLevel,
            confidence: match.confidence,
          });
        });
      });
      
      return { 
        ...prev, 
        selections: newSelections, 
        mode: 'smart-fill' 
      };
    });
  }, []);

  /**
   * Select "End of Page" for all provided pages
   * Sets blockId and headingText to null for each page
   * 
   * Requirements: 7.1
   */
  const selectAllEndOfPage = useCallback((pages: PageInfo[]) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      
      pages.forEach(page => {
        newSelections.set(page.id, {
          pageId: page.id,
          pageTitle: page.title,
          blockId: null,
          headingText: null,
          headingLevel: null,
          confidence: 100, // End of page is always 100% confidence
        });
      });
      
      return { 
        ...prev, 
        selections: newSelections, 
        mode: 'all-same' 
      };
    });
  }, []);

  /**
   * Set the active tab page ID
   */
  const setActiveTab = useCallback((pageId: string) => {
    setTocState(prev => ({
      ...prev,
      activeTabPageId: pageId,
    }));
  }, []);

  /**
   * Update smart matches
   */
  const setSmartMatches = useCallback((matches: SectionMatch[]) => {
    setTocState(prev => ({
      ...prev,
      smartMatches: matches,
    }));
  }, []);

  /**
   * Set insertion mode
   */
  const setInsertionMode = useCallback((mode: InsertionMode) => {
    setTocState(prev => ({
      ...prev,
      insertionMode: mode,
    }));
  }, []);

  /**
   * Toggle expanded state
   */
  const toggleExpanded = useCallback(() => {
    setTocState(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded,
    }));
  }, []);

  /**
   * Get the current selection count
   * Requirements: 2.4
   */
  const selectionCount = useMemo(() => {
    return tocState.selections.size;
  }, [tocState.selections]);

  /**
   * Check if a page has a selection
   */
  const hasSelection = useCallback((pageId: string): boolean => {
    return tocState.selections.has(pageId);
  }, [tocState.selections]);

  /**
   * Get selection for a specific page
   */
  const getSelection = useCallback((pageId: string): PageSectionSelection | undefined => {
    return tocState.selections.get(pageId);
  }, [tocState.selections]);

  return {
    tocState,
    setTocState,
    selectSection,
    clearSelection,
    resetAllSelections,
    applySmartFill,
    selectAllEndOfPage,
    setActiveTab,
    setSmartMatches,
    setInsertionMode,
    toggleExpanded,
    selectionCount,
    hasSelection,
    getSelection,
  };
}
