/**
 * MultiPageTOCManager - Main container for multi-page TOC functionality
 * 
 * Orchestrates the multi-page Table of Contents system, composing TabBar,
 * SectionList, SmartSuggestionsPanel, and BulkActionsToolbar components.
 * Handles page structure fetching, caching, and smart matching.
 * 
 * @module MultiPageTOCManager
 * 
 * Requirements: 1.1, 3.1, 3.6, 4.1, 10.1, 10.2, 10.4, 10.5, 12.5, 12.8
 * 
 * WCAG AAA Contrast Compliance (Req 12.8):
 * - All child components (TabBar, SectionList, etc.) maintain WCAG AAA contrast ratios
 * - Text colors maintain 7:1 contrast ratio against backgrounds
 * - UI components maintain 4.5:1 contrast ratio
 * - Focus indicators are clearly visible with 2px purple ring
 * - Dark mode colors are adjusted to maintain equivalent contrast ratios
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Layers
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';
import { TabBar } from './TabBar';
import { SectionList } from './SectionList';
import { SmartSuggestionsPanel } from './SmartSuggestionsPanel';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { PresetMenu } from './PresetMenu';
import { useScreenReaderAnnouncement } from '../../../hooks/useScreenReaderAnnouncement';
import { usePerformanceMonitor, PERFORMANCE_TARGETS as PERF_TARGETS } from '../../../hooks/usePerformanceMonitor';
import type {
  PageInfo,
  PageStructure,
  PageSectionSelection,
  SectionTarget,
  SectionMatch,
  MultiPageTOCState,
  TOCPreset,
  InsertionMode,
} from '@notion-clipper/core-shared';
import { SmartMatchingEngine } from '@notion-clipper/core-shared';

/**
 * Cache entry for page structure with TTL
 */
interface CacheEntry {
  structure: PageStructure;
  fetchedAt: number;
}

/**
 * Cache TTL in milliseconds (5 minutes as per Req 3.6)
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Performance targets (Req 11.1, 11.2, 11.3)
 * - Render: <100ms for up to 10 pages
 * - Matching: <200ms for up to 10 pages
 * - Tab switch: <50ms view update
 */
const PERFORMANCE_TARGETS = {
  RENDER_MS: 100,
  MATCHING_MS: 200,
  TAB_SWITCH_MS: 50,
} as const;

/**
 * Props for the MultiPageTOCManager component
 */
export interface MultiPageTOCManagerProps {
  /** Array of selected pages to display in tabs */
  selectedPages: PageInfo[];
  /** Current TOC state from parent */
  tocState: MultiPageTOCState;
  /** Callback when TOC state changes */
  onTocStateChange: (state: MultiPageTOCState) => void;
  /** Callback to fetch page structure from Notion API */
  onFetchPageStructure: (pageId: string) => Promise<PageStructure>;
  /** Display mode: sidebar or floating panel */
  mode?: 'sidebar' | 'floating';
  /** Optional CSS class name */
  className?: string;
  /** Saved presets for the preset menu (Req 14.2) */
  presets?: TOCPreset[];
  /** Callback when applying a preset (Req 14.3) */
  onApplyPreset?: (presetId: string) => void;
  /** Callback when saving a new preset (Req 14.1) */
  onSavePreset?: (name: string) => void;
  /** Callback when deleting a preset (Req 14.5) */
  onDeletePreset?: (presetId: string) => void;
  /** Callback when exporting configuration (Req 15.1) */
  onExportConfig?: () => void;
  /** Callback when importing configuration (Req 15.3) */
  onImportConfig?: () => void;
  /** Whether presets are loading */
  presetsLoading?: boolean;
}


/**
 * MultiPageTOCManager - Main container component for multi-page TOC
 * 
 * Features:
 * - Tab-based navigation for multiple pages (Req 1.1)
 * - Section list for active page with selection
 * - Smart suggestions panel for matched sections
 * - Bulk actions toolbar (Smart Fill, Select All End, Reset)
 * - Page structure fetching with 5-minute cache (Req 3.1, 3.6)
 * - Smart matching on structure load (Req 4.1)
 * - Header with title and selection count (Req 10.1)
 * - Framer Motion animations for selection changes (Req 10.2)
 * - Fixed position panel (Req 10.4)
 * - Insertion preview summary (Req 10.5)
 * 
 * @example
 * ```tsx
 * <MultiPageTOCManager
 *   selectedPages={selectedPages}
 *   tocState={tocState}
 *   onTocStateChange={setTocState}
 *   onFetchPageStructure={fetchPageStructure}
 *   mode="sidebar"
 * />
 * ```
 */
export function MultiPageTOCManager({
  selectedPages,
  tocState,
  onTocStateChange,
  onFetchPageStructure,
  mode = 'sidebar',
  className = '',
  presets = [],
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onExportConfig,
  onImportConfig,
  presetsLoading = false,
}: MultiPageTOCManagerProps) {
  // Page structure cache (Req 3.6)
  const structureCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  
  // Page structures state
  const [pageStructures, setPageStructures] = useState<Map<string, PageStructure>>(new Map());
  
  // Loading and error states
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());
  const [pageErrors, setPageErrors] = useState<Map<string, string>>(new Map());
  
  // Applied matches tracking (multiple can be active)
  const [appliedMatches, setAppliedMatches] = useState<Set<string>>(new Set());

  // Smart matching engine instance (memoized for performance - Req 11.2)
  const smartMatchingEngine = useMemo(() => new SmartMatchingEngine(), []);

  // Screen reader announcements (Req 12.5)
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();

  // Performance monitoring (Req 11.1, 11.2, 11.3)
  const { startMeasure, endMeasure, measureRender } = usePerformanceMonitor({
    name: 'MultiPageTOCManager',
    logWarnings: process.env.NODE_ENV === 'development',
  });

  // Measure render performance (Req 11.1)
  useEffect(() => {
    measureRender();
  });

  // Get active page ID (default to first page if not set)
  const activePageId = tocState.activeTabPageId || selectedPages[0]?.id || '';

  // Get current page structure
  const currentPageStructure = pageStructures.get(activePageId) || null;

  // Get current selection for active page
  const currentSelection = tocState.selections.get(activePageId);

  /**
   * Track selected page IDs to detect workspace/account changes
   * When pages change completely (different workspace), we need to clear the cache
   */
  const previousPageIdsRef = useRef<Set<string>>(new Set());

  /**
   * Auto-initialize all pages to "end of page" on first load
   * This ensures all pages have a default selection (end of page)
   * Also clears cache when workspace changes (all page IDs are different)
   */
  useEffect(() => {
    const currentPageIds = new Set(selectedPages.map(p => p.id));
    const previousPageIds = previousPageIdsRef.current;
    
    // Check if this is a workspace change (no overlap in page IDs)
    const hasOverlap = selectedPages.some(p => previousPageIds.has(p.id));
    const isWorkspaceChange = previousPageIds.size > 0 && !hasOverlap && selectedPages.length > 0;
    
    if (isWorkspaceChange) {
      console.log('[MultiPageTOCManager] Workspace change detected, clearing cache');
      // Clear all caches when workspace changes
      structureCacheRef.current.clear();
      setPageStructures(new Map());
      setPageErrors(new Map());
      setAppliedMatches(new Set());
    }
    
    // Update previous page IDs
    previousPageIdsRef.current = currentPageIds;
    
    // Initialize selections for new pages
    if (selectedPages.length > 0) {
      const initialSelections = new Map<string, PageSectionSelection>();
      let hasNewPages = false;
      
      selectedPages.forEach(page => {
        // Keep existing selections, only add new ones
        const existingSelection = tocState.selections.get(page.id);
        if (existingSelection && !isWorkspaceChange) {
          initialSelections.set(page.id, existingSelection);
        } else {
          hasNewPages = true;
          initialSelections.set(page.id, {
            pageId: page.id,
            pageTitle: page.title,
            blockId: null, // null = end of page
            headingText: null,
            headingLevel: null,
            confidence: 100,
          });
        }
      });
      
      // Only update if there are changes
      if (hasNewPages || isWorkspaceChange || tocState.selections.size !== initialSelections.size) {
        onTocStateChange({
          ...tocState,
          selections: initialSelections,
          mode: isWorkspaceChange ? 'all-same' : tocState.mode,
          activeTabPageId: isWorkspaceChange ? selectedPages[0]?.id : tocState.activeTabPageId,
        });
      }
    }
  }, [selectedPages]); // Run when pages array changes


  /**
   * Check if a cached entry is still valid
   */
  const isCacheValid = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
  }, []);

  /**
   * Fetch page structure with smart caching strategy:
   * - Online: Always fetch fresh data to reflect page changes
   * - Offline: Use cache if available, otherwise default to end-of-page
   * (Req 3.1, 3.6)
   */
  const fetchPageStructure = useCallback(async (pageId: string, forceRefresh = false) => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const cached = structureCacheRef.current.get(pageId);
    
    // If offline and we have cache, use it immediately
    if (!isOnline && cached) {
      console.log(`[TOC] 📴 Offline - using cached structure for ${pageId}`);
      setPageStructures(prev => new Map(prev).set(pageId, cached.structure));
      return cached.structure;
    }
    
    // If offline and no cache, return null (will default to end-of-page)
    if (!isOnline && !cached) {
      console.log(`[TOC] 📴 Offline - no cache for ${pageId}, will use end-of-page`);
      setPageErrors(prev => new Map(prev).set(pageId, 'Offline - no cached data'));
      return null;
    }
    
    // Online: Always fetch fresh data (unless cache is very recent < 30s)
    const veryRecentCache = cached && (Date.now() - cached.fetchedAt < 30000);
    if (!forceRefresh && veryRecentCache) {
      setPageStructures(prev => new Map(prev).set(pageId, cached.structure));
      return cached.structure;
    }

    // Set loading state
    setLoadingPages(prev => new Set(prev).add(pageId));
    setPageErrors(prev => {
      const next = new Map(prev);
      next.delete(pageId);
      return next;
    });

    try {
      console.log(`[TOC] 🔄 Fetching fresh structure for ${pageId}`);
      const structure = await onFetchPageStructure(pageId);
      
      // Update cache
      const cacheEntry: CacheEntry = {
        structure,
        fetchedAt: Date.now(),
      };
      structureCacheRef.current.set(pageId, cacheEntry);
      
      // Update state
      setPageStructures(prev => new Map(prev).set(pageId, structure));
      
      return structure;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch page structure';
      console.warn(`[TOC] ⚠️ Failed to fetch structure for ${pageId}:`, errorMessage);
      setPageErrors(prev => new Map(prev).set(pageId, errorMessage));
      
      // Use stale cache if available (Req 3.7 - graceful degradation)
      if (cached) {
        console.log(`[TOC] 📦 Using stale cache for ${pageId}`);
        setPageStructures(prev => new Map(prev).set(pageId, cached.structure));
        return cached.structure;
      }
      
      return null;
    } finally {
      setLoadingPages(prev => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    }
  }, [onFetchPageStructure, isCacheValid]);

  /**
   * Run smart matching when page structures change (Req 4.1)
   * 
   * Performance optimization (Req 11.2):
   * - SmartMatchingEngine uses internal memoization
   * - Results are cached based on page structure content
   * - Target: <200ms for matching up to 10 pages
   */
  const runSmartMatching = useCallback(() => {
    if (pageStructures.size < 2) {
      onTocStateChange({
        ...tocState,
        smartMatches: [],
      });
      return;
    }

    // Measure smart matching performance (Req 11.2)
    startMeasure('smartMatching');
    const matches = smartMatchingEngine.findMatchingSections(pageStructures);
    endMeasure('smartMatching', PERF_TARGETS.MATCHING_MS);
    
    onTocStateChange({
      ...tocState,
      smartMatches: matches,
    });
  }, [pageStructures, smartMatchingEngine, tocState, onTocStateChange, startMeasure, endMeasure]);

  /**
   * Track which pages have been fetched in this session to avoid duplicate fetches
   * but still allow refresh when page is re-selected
   */
  const fetchedPagesRef = useRef<Set<string>>(new Set());

  /**
   * Fetch structures for ALL selected pages to enable smart matching immediately
   * This ensures smart suggestions appear as soon as pages are selected,
   * not just when switching tabs.
   * 
   * Strategy:
   * - When online: Always fetch fresh data for newly selected pages
   * - When offline: Use cache if available
   */
  useEffect(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    selectedPages.forEach(page => {
      const alreadyFetching = loadingPages.has(page.id);
      const hasError = pageErrors.has(page.id);
      const alreadyFetchedThisSession = fetchedPagesRef.current.has(page.id);
      
      // Skip if already fetching or has error
      if (alreadyFetching || hasError) return;
      
      // If online and not fetched this session, always fetch fresh
      if (isOnline && !alreadyFetchedThisSession) {
        fetchedPagesRef.current.add(page.id);
        fetchPageStructure(page.id, false); // Will fetch fresh due to online logic
      }
      // If offline and no structure, try to fetch (will use cache)
      else if (!isOnline && !pageStructures.has(page.id)) {
        fetchPageStructure(page.id, false);
      }
    });
    
    // Clean up fetchedPagesRef when pages are deselected
    const selectedIds = new Set(selectedPages.map(p => p.id));
    fetchedPagesRef.current.forEach(id => {
      if (!selectedIds.has(id)) {
        fetchedPagesRef.current.delete(id);
      }
    });
  }, [selectedPages, loadingPages, pageErrors, pageStructures, fetchPageStructure]);

  /**
   * Lazy loading: Fetch structure for active page when tab is switched (Req 11.3)
   * This is a fallback in case the above effect didn't catch it
   */
  useEffect(() => {
    if (
      !activePageId || 
      pageStructures.has(activePageId) || 
      loadingPages.has(activePageId) ||
      pageErrors.has(activePageId)
    ) {
      return;
    }

    fetchPageStructure(activePageId);
  }, [activePageId, pageStructures, loadingPages, pageErrors, fetchPageStructure]);

  /**
   * Clean up structures for pages that are no longer selected
   * This ensures smart matching only considers currently selected pages
   * Also clears everything when no pages are selected
   */
  useEffect(() => {
    const selectedPageIds = new Set(selectedPages.map(p => p.id));
    
    // If no pages selected, clear local state only
    // The parent component should handle clearing tocState when pages are deselected
    if (selectedPages.length === 0) {
      setPageStructures(new Map());
      setAppliedMatches(new Set());
      return;
    }
    
    // Remove structures for pages that are no longer selected
    setPageStructures(prev => {
      const next = new Map(prev);
      let changed = false;
      for (const pageId of next.keys()) {
        if (!selectedPageIds.has(pageId)) {
          next.delete(pageId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedPages]);

  /**
   * Run smart matching when structures are loaded or pages change (Req 11.2)
   * 
   * Performance optimization: SmartMatchingEngine uses memoization internally,
   * so repeated calls with the same structures return cached results.
   * Target: <200ms for matching up to 10 pages
   * 
   * Also re-runs when selectedPages changes to update suggestions when pages are added/removed
   */
  useEffect(() => {
    // Measure performance for smart matching (Req 11.2)
    const startTime = performance.now();
    
    runSmartMatching();
    
    const elapsed = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development' && elapsed > PERFORMANCE_TARGETS.MATCHING_MS) {
      console.warn(`[Performance] Smart matching took ${elapsed.toFixed(2)}ms (target: <${PERFORMANCE_TARGETS.MATCHING_MS}ms)`);
    }
  }, [pageStructures, selectedPages]); // Re-run when structures Map or pages array changes

  /**
   * Handle tab change with performance measurement (Req 11.3)
   * 
   * Performance optimization:
   * - Tab switch should complete in <50ms
   * - Page structure is loaded lazily on tab switch
   */
  const handleTabChange = useCallback((pageId: string) => {
    // Measure tab switch performance (Req 11.3)
    startMeasure('tabSwitch');
    
    onTocStateChange({
      ...tocState,
      activeTabPageId: pageId,
    });
    
    // End measurement after state update
    // Note: Actual view update time is measured in the useEffect
    endMeasure('tabSwitch', PERF_TARGETS.TAB_SWITCH_MS);
  }, [tocState, onTocStateChange, startMeasure, endMeasure]);

  /**
   * Handle section selection with multi-select support
   * Toggles sections on/off, allowing multiple sections per page
   */
  const handleSectionSelect = useCallback((
    blockId: string | null,
    headingText: string | null,
    level: number | null
  ) => {
    const page = selectedPages.find(p => p.id === activePageId);
    if (!page) return;

    const newSelections = new Map(tocState.selections);
    const existingSelection = newSelections.get(activePageId);
    
    // Normalize blockId for comparison
    const normalizedBlockId = blockId === null ? 'end-of-page' : blockId;
    
    // Check if this section is already selected (in targets array)
    const existingTargets = existingSelection?.targets || [];
    const isAlreadySelected = existingTargets.some(t => 
      (t.blockId === null ? 'end-of-page' : t.blockId) === normalizedBlockId
    );
    
    if (isAlreadySelected) {
      // Remove this section from targets
      const newTargets = existingTargets.filter(t => 
        (t.blockId === null ? 'end-of-page' : t.blockId) !== normalizedBlockId
      );
      
      if (newTargets.length === 0) {
        // No more targets, remove the selection entirely
        newSelections.delete(activePageId);
        announce(`Removed ${headingText || 'end of page'} from ${page.title}`);
      } else {
        // Update with remaining targets
        const firstTarget = newTargets[0];
        newSelections.set(activePageId, {
          pageId: activePageId,
          pageTitle: page.title,
          blockId: firstTarget.blockId,
          headingText: firstTarget.headingText,
          headingLevel: firstTarget.headingLevel,
          confidence: firstTarget.confidence ?? 100,
          targets: newTargets,
        });
        announce(`Removed ${headingText || 'end of page'} from ${page.title}`);
      }
    } else {
      // Add this section to targets with default insertion mode
      const newTarget = {
        blockId,
        headingText,
        headingLevel: level as 1 | 2 | 3 | null,
        confidence: 100,
        insertionMode: tocState.insertionMode || 'after-heading', // Use global mode as default
      };
      
      const newTargets = [...existingTargets, newTarget];
      
      newSelections.set(activePageId, {
        pageId: activePageId,
        pageTitle: page.title,
        blockId: newTargets[0].blockId, // Primary selection is first target
        headingText: newTargets[0].headingText,
        headingLevel: newTargets[0].headingLevel,
        confidence: 100,
        targets: newTargets,
      });
      
      announce(`Added ${headingText || 'end of page'} to ${page.title}`);
    }

    onTocStateChange({
      ...tocState,
      selections: newSelections,
      mode: 'manual',
    });
  }, [activePageId, selectedPages, tocState, onTocStateChange, announce]);

  /**
   * Handle insertion mode change for a specific section
   * Allows per-section customization of insertion mode
   */
  const handleSectionInsertionModeChange = useCallback((blockId: string, mode: InsertionMode) => {
    const newSelections = new Map(tocState.selections);
    const existingSelection = newSelections.get(activePageId);
    
    if (!existingSelection?.targets) return;
    
    // Update the insertion mode for the specific target
    const updatedTargets = existingSelection.targets.map(target => {
      if (target.blockId === blockId) {
        return { ...target, insertionMode: mode };
      }
      return target;
    });
    
    newSelections.set(activePageId, {
      ...existingSelection,
      targets: updatedTargets,
    });
    
    onTocStateChange({
      ...tocState,
      selections: newSelections,
    });
    
    const targetHeading = updatedTargets.find(t => t.blockId === blockId)?.headingText || 'section';
    announce(`${targetHeading}: insertion mode changed to ${mode === 'after-heading' ? 'after heading' : 'end of section'}`);
  }, [activePageId, tocState, onTocStateChange, announce]);
  
  // Get selected block IDs for current page (for multi-select display)
  const currentSelectedBlockIds = useMemo(() => {
    const selection = tocState.selections.get(activePageId);
    if (!selection) return new Set<string>();
    
    const targets = selection.targets || [{
      blockId: selection.blockId,
      headingText: selection.headingText,
      headingLevel: selection.headingLevel,
      confidence: selection.confidence,
    }];
    
    return new Set(targets.map(t => t.blockId === null ? 'end-of-page' : t.blockId));
  }, [tocState.selections, activePageId]);


  /**
   * Handle bulk actions (Req 12.5 - screen reader announcements)
   */
  const handleBulkAction = useCallback((action: 'smart-fill' | 'all-end' | 'reset') => {
    switch (action) {
      case 'smart-fill':
        // Smart fill is disabled - coming soon
        break;
        
      case 'all-end':
        // Select "End of Page" for all pages (Req 7.1)
        const newSelectionsAllEnd = new Map<string, PageSectionSelection>();
        selectedPages.forEach(page => {
          newSelectionsAllEnd.set(page.id, {
            pageId: page.id,
            pageTitle: page.title,
            blockId: null,
            headingText: null,
            headingLevel: null,
            confidence: 100,
          });
        });
        onTocStateChange({
          ...tocState,
          selections: newSelectionsAllEnd,
          mode: 'all-same',
        });
        setAppliedMatches(new Set());
        announce(`Set all ${selectedPages.length} pages to insert at end of page`);
        break;
        
      case 'reset':
        // Clear all selections (Req 7.3)
        const previousCount = tocState.selections.size;
        onTocStateChange({
          ...tocState,
          selections: new Map(),
          mode: 'manual',
        });
        setAppliedMatches(new Set());
        announce(`Cleared ${previousCount} section selections`);
        break;
    }
  }, [selectedPages, tocState, onTocStateChange, announce]);

  /**
   * Handle applying/toggling a match from SmartSuggestionsPanel
   * Multiple matches can be applied simultaneously
   * Merges with existing selections instead of replacing them
   */
  const handleToggleMatch = useCallback((match: SectionMatch) => {
    const isCurrentlyApplied = appliedMatches.has(match.normalizedText);
    const newAppliedMatches = new Set(appliedMatches);
    const newSelections = new Map(tocState.selections);
    
    if (isCurrentlyApplied) {
      // Remove this match from each page's targets
      newAppliedMatches.delete(match.normalizedText);
      match.matchedPages.forEach(page => {
        const existingSelection = newSelections.get(page.pageId);
        if (existingSelection) {
          const existingTargets = existingSelection.targets || [{
            blockId: existingSelection.blockId,
            headingText: existingSelection.headingText,
            headingLevel: existingSelection.headingLevel,
            confidence: existingSelection.confidence,
          }];
          
          // Remove this specific target
          const newTargets = existingTargets.filter(t => t.blockId !== page.blockId);
          
          if (newTargets.length === 0) {
            // No more targets, remove selection entirely
            newSelections.delete(page.pageId);
          } else {
            // Update with remaining targets
            const firstTarget = newTargets[0];
            newSelections.set(page.pageId, {
              pageId: page.pageId,
              pageTitle: existingSelection.pageTitle,
              blockId: firstTarget.blockId,
              headingText: firstTarget.headingText,
              headingLevel: firstTarget.headingLevel,
              confidence: firstTarget.confidence ?? 100,
              targets: newTargets,
            });
          }
        }
      });
      announce(`Removed ${match.headingText} section from ${match.matchedPagesCount} pages`);
    } else {
      // Apply this match - merge with existing targets
      newAppliedMatches.add(match.normalizedText);
      match.matchedPages.forEach(page => {
        const existingSelection = newSelections.get(page.pageId);
        const newTarget: SectionTarget = {
          blockId: page.blockId,
          headingText: match.headingText,
          headingLevel: match.headingLevel,
          confidence: match.confidence,
        };
        
        if (existingSelection) {
          // Merge with existing targets
          const existingTargets = existingSelection.targets || [{
            blockId: existingSelection.blockId,
            headingText: existingSelection.headingText,
            headingLevel: existingSelection.headingLevel,
            confidence: existingSelection.confidence,
          }];
          
          // Check if this target already exists
          const alreadyExists = existingTargets.some(t => t.blockId === page.blockId);
          if (!alreadyExists) {
            const newTargets = [...existingTargets, newTarget];
            newSelections.set(page.pageId, {
              ...existingSelection,
              targets: newTargets,
            });
          }
        } else {
          // Create new selection with this target
          newSelections.set(page.pageId, {
            pageId: page.pageId,
            pageTitle: page.pageTitle,
            blockId: page.blockId,
            headingText: match.headingText,
            headingLevel: match.headingLevel,
            confidence: match.confidence,
            targets: [newTarget],
          });
        }
      });
      announce(`Applied ${match.headingText} section to ${match.matchedPagesCount} pages`);
    }

    setAppliedMatches(newAppliedMatches);
    onTocStateChange({
      ...tocState,
      selections: newSelections,
      mode: 'smart-fill',
    });
  }, [tocState, appliedMatches, selectedPages, onTocStateChange, announce]);

  /**
   * Handle retry fetching page structure
   */
  const handleRetry = useCallback(() => {
    if (activePageId) {
      // Clear cache for this page to force refetch
      structureCacheRef.current.delete(activePageId);
      fetchPageStructure(activePageId);
    }
  }, [activePageId, fetchPageStructure]);

  /**
   * Toggle panel expansion
   */
  const handleToggleExpand = useCallback(() => {
    onTocStateChange({
      ...tocState,
      isExpanded: !tocState.isExpanded,
    });
  }, [tocState, onTocStateChange]);

  // Determine loading state for current page
  const isLoading = loadingPages.has(activePageId);
  const currentError = pageErrors.get(activePageId);

  // Selection count
  const selectionCount = tocState.selections.size;
  const hasSelections = selectionCount > 0;
  const hasSmartMatches = tocState.smartMatches.length > 0;

  // Don't render anything if no pages are selected
  if (selectedPages.length === 0) {
    return null;
  }

  return (
    <div 
      className={`
        flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
        shadow-sm overflow-hidden
        ${mode === 'floating' ? 'fixed right-4 top-20 w-80 max-h-[calc(100vh-6rem)] z-40' : ''}
        ${className}
      `}
      role="region"
      aria-label="Multi-page TOC Manager"
    >
      {/* Screen reader announcement region (Req 12.5) */}
      <AnnouncementRegion />
      {/* Header with title and selection count (Req 10.1) */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 
                   bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
        onClick={handleToggleExpand}
        role="button"
        aria-expanded={tocState.isExpanded}
        aria-controls="toc-content"
      >
        <div className="flex items-center gap-2">
          <Layers size={16} strokeWidth={2} className="text-purple-500 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {selectedPages.length === 1 ? 'Section Target' : 'Section Targets'}
          </h3>
        </div>
        
        <button
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={tocState.isExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          {tocState.isExpanded ? (
            <ChevronUp size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Collapsible content */}
      <AnimatePresence>
        {tocState.isExpanded && (
          <MotionDiv
            id="toc-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col">
              {/* Tab Bar (Req 1.1) */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">
                <TabBar
                  pages={selectedPages}
                  activePageId={activePageId}
                  onTabChange={handleTabChange}
                  selections={tocState.selections}
                />
              </div>

              {/* Section List for active page - multi-select enabled */}
              <div className="px-2 py-1 border-b border-gray-100 dark:border-gray-700/50">
                <SectionList
                  pageStructure={currentPageStructure}
                  selectedBlockId={currentSelection?.blockId ?? null}
                  selectedBlockIds={currentSelectedBlockIds}
                  onSelect={handleSectionSelect}
                  multiSelect={true}
                  loading={isLoading}
                  error={currentError}
                  onRetry={handleRetry}
                  height={120}
                  selectedTargets={currentSelection?.targets || []}
                  onInsertionModeChange={handleSectionInsertionModeChange}
                  defaultInsertionMode={tocState.insertionMode || 'after-heading'}
                />
              </div>

              {/* Smart Suggestions Panel - compact, only show when pages are selected */}
              {hasSmartMatches && selectedPages.length > 0 && (
                <div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                  <SmartSuggestionsPanel
                    matches={tocState.smartMatches}
                    onApply={handleToggleMatch}
                    appliedMatches={appliedMatches}
                    maxSuggestions={4}
                    selectedPagesCount={selectedPages.length}
                  />
                </div>
              )}

              {/* Bulk Actions Toolbar */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <BulkActionsToolbar
                    onAction={handleBulkAction}
                    hasSelections={hasSelections}
                    hasSmartMatches={hasSmartMatches}
                    selectionCount={selectionCount}
                    totalPages={selectedPages.length}
                  />
                  {/* Preset Menu (Req 14.1, 14.2, 14.5, 15.1, 15.3) */}
                  {(onApplyPreset || onSavePreset) && (
                    <PresetMenu
                      presets={presets}
                      currentSelections={tocState.selections}
                      onApplyPreset={onApplyPreset || (() => {})}
                      onSavePreset={onSavePreset || (() => {})}
                      onDeletePreset={onDeletePreset || (() => {})}
                      onExport={onExportConfig || (() => {})}
                      onImport={onImportConfig || (() => {})}
                      loading={presetsLoading}
                    />
                  )}
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

    </div>
  );
}

export default MultiPageTOCManager;
