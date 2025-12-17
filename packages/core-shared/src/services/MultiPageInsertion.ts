/**
 * MultiPageInsertion Service
 * 
 * Handles sequential content insertion across multiple Notion pages with:
 * - Rate limiting (350ms between API calls to respect Notion's 3 req/sec limit)
 * - Error collection and continuation (continues on error, collects all results)
 * - Progress callbacks for UI updates
 * - Insertion target resolution (blockId or end of page)
 * - Quota tracking after successful insertions
 * 
 * @module MultiPageInsertion
 */

import type {
  InsertionTarget,
  InsertionResult,
  PageSectionSelection,
  InsertionMode,
} from '../types/toc.types';

/**
 * Rate limiting delay between Notion API calls (in milliseconds)
 * Notion API limit: 3 requests per second = ~333ms minimum
 * Using 350ms for safety margin
 */
export const RATE_LIMIT_DELAY_MS = 350;

/**
 * Progress callback type for UI updates
 */
export type InsertionProgressCallback = (progress: InsertionProgress) => void;

/**
 * Progress information during multi-page insertion
 */
export interface InsertionProgress {
  /** Current page being processed (1-indexed) */
  current: number;
  /** Total number of pages to process */
  total: number;
  /** Page ID currently being processed */
  pageId: string;
  /** Page title currently being processed */
  pageTitle: string;
  /** Status of current operation */
  status: 'pending' | 'inserting' | 'success' | 'error' | 'fallback';
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Options for multi-page insertion
 */
export interface MultiPageInsertionOptions {
  /** Callback for progress updates */
  onProgress?: InsertionProgressCallback;
  /** Function to validate if a block exists */
  validateBlock?: (pageId: string, blockId: string) => Promise<boolean>;
  /** Function to insert content into a page */
  insertContent: (pageId: string, content: any, afterBlockId: string | null, insertionMode?: InsertionMode) => Promise<void>;
  /** Function to track quota usage after successful insertion */
  trackQuota?: (pageId: string) => Promise<void>;
  /** Insertion mode: 'after-heading' or 'end-of-section' */
  insertionMode?: InsertionMode;
}

/**
 * Summary of multi-page insertion results
 */
export interface InsertionSummary {
  /** Total number of pages processed */
  total: number;
  /** Number of successful insertions */
  successCount: number;
  /** Number of failed insertions */
  errorCount: number;
  /** Number of insertions that used fallback (end of page) */
  fallbackCount: number;
  /** Individual results for each page */
  results: InsertionResult[];
  /** Total time taken in milliseconds */
  totalTimeMs: number;
}


/**
 * Resolves insertion targets from a page section selection
 * Supports both single selection (legacy) and multi-selection (targets array)
 * Each target can have its own insertion mode for per-section customization
 * 
 * @param selection - The page section selection
 * @returns Array of InsertionTarget objects with insertion modes
 */
export function resolveInsertionTargets(selection: PageSectionSelection): InsertionTarget[] {
  // If targets array exists and has items, use multi-selection mode
  if (selection.targets && selection.targets.length > 0) {
    return selection.targets.map(target => ({
      pageId: selection.pageId,
      pageTitle: selection.pageTitle,
      blockId: target.blockId,
      headingText: target.headingText,
      headingLevel: target.headingLevel,
      position: target.blockId ? 'after' : 'end' as const,
      insertionMode: target.insertionMode || 'after-heading', // Per-section insertion mode
    }));
  }
  
  // Legacy single selection mode
  return [{
    pageId: selection.pageId,
    pageTitle: selection.pageTitle,
    blockId: selection.blockId,
    headingText: selection.headingText,
    headingLevel: selection.headingLevel,
    position: selection.blockId ? 'after' : 'end' as const,
    insertionMode: 'after-heading', // Default for legacy mode
  }];
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use resolveInsertionTargets instead
 */
export function resolveInsertionTarget(selection: PageSectionSelection): InsertionTarget {
  const targets = resolveInsertionTargets(selection);
  return targets[0];
}

/**
 * Creates insertion targets from a selections map
 * Supports multi-selection - each page can have multiple targets
 * 
 * @param selections - Map of pageId to PageSectionSelection
 * @param pageIds - Optional array of page IDs to process (defaults to all selections)
 * @returns Array of InsertionTarget objects
 */
export function createInsertionTargets(
  selections: Map<string, PageSectionSelection>,
  pageIds?: string[]
): InsertionTarget[] {
  const targetPageIds = pageIds || Array.from(selections.keys());
  const targets: InsertionTarget[] = [];
  
  for (const pageId of targetPageIds) {
    const selection = selections.get(pageId);
    
    if (selection) {
      // Use new function that supports multi-selection
      targets.push(...resolveInsertionTargets(selection));
    } else {
      // If no selection exists for this page, default to end of page
      targets.push({
        pageId,
        pageTitle: pageId,
        blockId: null,
        position: 'end' as const,
      });
    }
  }
  
  return targets;
}

/**
 * Delays execution for rate limiting
 * 
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Inserts content into multiple Notion pages sequentially with rate limiting
 * 
 * Features:
 * - Sequential insertion with 350ms delay between API calls (rate limiting)
 * - Continues on error, collecting all results
 * - Progress callbacks for UI updates
 * - Validates block existence before insertion (optional)
 * - Falls back to end-of-page if selected block doesn't exist
 * - Tracks quota after successful insertions (optional)
 * 
 * @param targets - Array of insertion targets
 * @param content - Content to insert (Notion blocks)
 * @param options - Insertion options including callbacks
 * @returns InsertionSummary with all results
 * 
 * @example
 * ```typescript
 * const summary = await insertContentMultiPages(
 *   targets,
 *   notionBlocks,
 *   {
 *     onProgress: (progress) => updateUI(progress),
 *     insertContent: async (pageId, content, afterBlockId) => {
 *       await notionClient.blocks.children.append({
 *         block_id: pageId,
 *         children: content,
 *         after: afterBlockId || undefined,
 *       });
 *     },
 *     trackQuota: async (pageId) => {
 *       await usageService.track('clips', 1);
 *     },
 *   }
 * );
 * ```
 */
export async function insertContentMultiPages(
  targets: InsertionTarget[],
  content: any,
  options: MultiPageInsertionOptions
): Promise<InsertionSummary> {
  const startTime = Date.now();
  const results: InsertionResult[] = [];
  
  let successCount = 0;
  let errorCount = 0;
  let fallbackCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    
    // Report progress: starting this page
    options.onProgress?.({
      current: i + 1,
      total: targets.length,
      pageId: target.pageId,
      pageTitle: target.pageTitle,
      status: 'inserting',
    });

    let result: InsertionResult;
    let usedFallback = false;
    let effectiveBlockId = target.blockId;

    try {
      // Validate block exists if blockId is specified and validator is provided
      if (target.blockId && options.validateBlock) {
        const blockExists = await options.validateBlock(target.pageId, target.blockId);
        
        if (!blockExists) {
          // Block doesn't exist, fall back to end of page
          effectiveBlockId = null;
          usedFallback = true;
        }
      }

      // Insert content with per-target insertion mode (falls back to global mode if not specified)
      const insertionMode = target.insertionMode || options.insertionMode || 'after-heading';
      await options.insertContent(target.pageId, content, effectiveBlockId, insertionMode);

      // Track quota if provided
      if (options.trackQuota) {
        try {
          await options.trackQuota(target.pageId);
        } catch (quotaError) {
          // Log quota tracking error but don't fail the insertion
          console.warn(`[MultiPageInsertion] Quota tracking failed for page ${target.pageId}:`, quotaError);
        }
      }

      result = {
        pageId: target.pageId,
        pageTitle: target.pageTitle,
        status: usedFallback ? 'fallback' : 'success',
        blockId: effectiveBlockId || undefined,
        usedFallback,
      };

      if (usedFallback) {
        fallbackCount++;
      }
      successCount++;

      // Report progress: success
      options.onProgress?.({
        current: i + 1,
        total: targets.length,
        pageId: target.pageId,
        pageTitle: target.pageTitle,
        status: usedFallback ? 'fallback' : 'success',
      });

    } catch (error) {
      // Collect error and continue with remaining pages
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      result = {
        pageId: target.pageId,
        pageTitle: target.pageTitle,
        status: 'error',
        error: errorMessage,
      };

      errorCount++;

      // Report progress: error
      options.onProgress?.({
        current: i + 1,
        total: targets.length,
        pageId: target.pageId,
        pageTitle: target.pageTitle,
        status: 'error',
        error: errorMessage,
      });
    }

    results.push(result);

    // Rate limiting: wait before next API call (except for last page)
    if (i < targets.length - 1) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  return {
    total: targets.length,
    successCount,
    errorCount,
    fallbackCount,
    results,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Creates a multi-page insertion handler with pre-configured options
 * 
 * @param baseOptions - Base options to use for all insertions
 * @returns Function that performs multi-page insertion with the configured options
 */
export function createMultiPageInserter(
  baseOptions: Omit<MultiPageInsertionOptions, 'onProgress'>
) {
  return async (
    targets: InsertionTarget[],
    content: any,
    onProgress?: InsertionProgressCallback
  ): Promise<InsertionSummary> => {
    return insertContentMultiPages(targets, content, {
      ...baseOptions,
      onProgress,
    });
  };
}
