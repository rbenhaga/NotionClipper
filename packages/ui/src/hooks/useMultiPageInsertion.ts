/**
 * useMultiPageInsertion - Hook for multi-page content insertion with progress tracking
 * 
 * Provides integration between the MultiPageInsertion service and UI components,
 * handling progress updates, error collection, and summary notifications.
 * 
 * @module useMultiPageInsertion
 * 
 * Requirements: 9.1, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import { useState, useCallback, useRef } from 'react';
import {
  insertContentMultiPages,
  createInsertionTargets,
  type InsertionProgress,
  type InsertionSummary,
  type InsertionTarget,
} from '@notion-clipper/core-shared';
import type {
  MultiPageTOCState,
  InsertionResult,
  InsertionMode,
} from '@notion-clipper/core-shared';

/**
 * Options for the useMultiPageInsertion hook
 */
export interface UseMultiPageInsertionOptions {
  /** Function to insert content into a page via Notion API */
  insertContent: (pageId: string, content: any, afterBlockId: string | null, insertionMode?: InsertionMode) => Promise<void>;
  /** Function to validate if a block exists (optional) */
  validateBlock?: (pageId: string, blockId: string) => Promise<boolean>;
  /** Function to track quota usage after successful insertion (optional) */
  trackQuota?: (pageId: string) => Promise<void>;
  /** Callback when insertion completes */
  onComplete?: (summary: InsertionSummary) => void;
  /** Callback to show notifications */
  showNotification?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

/**
 * Return type for the useMultiPageInsertion hook
 */
export interface UseMultiPageInsertionReturn {
  /** Whether insertion is currently in progress */
  isInserting: boolean;
  /** Current progress information */
  progress: InsertionProgress | null;
  /** Results from the last insertion operation */
  results: InsertionResult[];
  /** Summary from the last insertion operation */
  summary: InsertionSummary | null;
  /** Whether to show the error modal */
  showErrorModal: boolean;
  /** Set whether to show the error modal */
  setShowErrorModal: (show: boolean) => void;
  /** Execute multi-page insertion */
  executeInsertion: (
    tocState: MultiPageTOCState,
    content: any,
    pageIds?: string[]
  ) => Promise<InsertionSummary | null>;
  /** Reset the insertion state */
  reset: () => void;
}

/**
 * Hook for managing multi-page content insertion with progress tracking
 * 
 * Features:
 * - Progress tracking with UI updates (Req 9.4)
 * - Rate limiting compliance (Req 9.6)
 * - Error collection and continuation (Req 9.5)
 * - Summary notification on completion (Req 9.7)
 * - Error details modal support (Req 9.8)
 * 
 * @param options - Configuration options
 * @returns Insertion state and control functions
 * 
 * @example
 * ```tsx
 * const {
 *   isInserting,
 *   progress,
 *   results,
 *   showErrorModal,
 *   setShowErrorModal,
 *   executeInsertion,
 * } = useMultiPageInsertion({
 *   insertContent: async (pageId, content, afterBlockId) => {
 *     await notionClient.blocks.children.append({
 *       block_id: pageId,
 *       children: content,
 *       after: afterBlockId || undefined,
 *     });
 *   },
 *   showNotification: (msg, type) => toast[type](msg),
 * });
 * 
 * // Execute insertion
 * await executeInsertion(tocState, notionBlocks);
 * ```
 */
export function useMultiPageInsertion(
  options: UseMultiPageInsertionOptions
): UseMultiPageInsertionReturn {
  const [isInserting, setIsInserting] = useState(false);
  const [progress, setProgress] = useState<InsertionProgress | null>(null);
  const [results, setResults] = useState<InsertionResult[]>([]);
  const [summary, setSummary] = useState<InsertionSummary | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Use ref to avoid stale closure issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Execute multi-page insertion with progress tracking
   */
  const executeInsertion = useCallback(async (
    tocState: MultiPageTOCState,
    content: any,
    pageIds?: string[]
  ): Promise<InsertionSummary | null> => {
    if (isInserting) {
      console.warn('[useMultiPageInsertion] Insertion already in progress');
      return null;
    }

    setIsInserting(true);
    setProgress(null);
    setResults([]);
    setSummary(null);

    try {
      // Create insertion targets from TOC state (Req 9.1, 9.2, 9.3)
      const targets = createInsertionTargets(tocState.selections, pageIds);

      if (targets.length === 0) {
        console.warn('[useMultiPageInsertion] No targets to insert');
        optionsRef.current.showNotification?.('No pages selected for insertion', 'warning');
        return null;
      }

      // Execute insertion with progress tracking (Req 9.4, 9.5, 9.6)
      const insertionSummary = await insertContentMultiPages(
        targets,
        content,
        {
          onProgress: (progressUpdate) => {
            setProgress(progressUpdate);
          },
          insertContent: optionsRef.current.insertContent,
          validateBlock: optionsRef.current.validateBlock,
          trackQuota: optionsRef.current.trackQuota,
          insertionMode: tocState.insertionMode,
        }
      );

      setResults(insertionSummary.results);
      setSummary(insertionSummary);

      // Show summary notification (Req 9.7)
      const { successCount, errorCount, fallbackCount, total } = insertionSummary;
      
      if (errorCount === 0 && fallbackCount === 0) {
        // All successful
        optionsRef.current.showNotification?.(
          `Content sent to ${successCount} page${successCount !== 1 ? 's' : ''} successfully`,
          'success'
        );
      } else if (errorCount > 0) {
        // Some errors occurred
        optionsRef.current.showNotification?.(
          `Sent to ${successCount}/${total} pages. ${errorCount} failed. Click for details.`,
          'warning'
        );
        // Auto-show error modal if there are errors (Req 9.8)
        setShowErrorModal(true);
      } else if (fallbackCount > 0) {
        // Some used fallback
        optionsRef.current.showNotification?.(
          `Sent to ${successCount} pages. ${fallbackCount} used fallback position.`,
          'info'
        );
      }

      // Call completion callback
      optionsRef.current.onComplete?.(insertionSummary);

      return insertionSummary;
    } catch (error) {
      console.error('[useMultiPageInsertion] Insertion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Insertion failed';
      optionsRef.current.showNotification?.(errorMessage, 'error');
      return null;
    } finally {
      setIsInserting(false);
      // Clear progress after a short delay to allow UI to show final state
      setTimeout(() => setProgress(null), 1000);
    }
  }, [isInserting]);

  /**
   * Reset the insertion state
   */
  const reset = useCallback(() => {
    setIsInserting(false);
    setProgress(null);
    setResults([]);
    setSummary(null);
    setShowErrorModal(false);
  }, []);

  return {
    isInserting,
    progress,
    results,
    summary,
    showErrorModal,
    setShowErrorModal,
    executeInsertion,
    reset,
  };
}

export default useMultiPageInsertion;
