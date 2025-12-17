/**
 * BlockValidation Service
 * 
 * Handles validation of block selections before content insertion.
 * Validates that selected blockIds still exist in their respective pages
 * and provides fallback behavior for invalid selections.
 * 
 * @module BlockValidation
 * 
 * Requirements: 13.1, 13.2, 13.3
 */

import type {
  PageSectionSelection,
  InsertionTarget,
} from '../types/toc.types';

/**
 * Result of validating a single selection
 */
export interface SelectionValidationResult {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Original block ID from selection */
  originalBlockId: string | null;
  /** Whether the block is valid (exists in the page) */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Summary of all selection validations
 */
export interface ValidationSummary {
  /** All validation results */
  results: SelectionValidationResult[];
  /** Number of valid selections */
  validCount: number;
  /** Number of invalid selections (block doesn't exist) */
  invalidCount: number;
  /** Number of selections without blockId (end of page) */
  endOfPageCount: number;
  /** Whether all selections are valid */
  allValid: boolean;
  /** Pages with invalid selections (for warning display) */
  invalidPages: Array<{ pageId: string; pageTitle: string; originalBlockId: string }>;
}

/**
 * Options for selection validation
 */
export interface ValidationOptions {
  /** Function to check if a block exists in a page */
  validateBlock: (pageId: string, blockId: string) => Promise<boolean>;
}

/**
 * Validates all selections to check if selected blockIds still exist
 * 
 * This function checks each selection that has a blockId to verify
 * the block still exists in the Notion page. Selections with null
 * blockId (end of page) are considered valid.
 * 
 * @param selections - Map of pageId to PageSectionSelection
 * @param options - Validation options including the validateBlock function
 * @returns ValidationSummary with results for all selections
 * 
 * Requirements: 13.1
 * 
 * @example
 * ```typescript
 * const summary = await validateSelections(
 *   tocState.selections,
 *   {
 *     validateBlock: async (pageId, blockId) => {
 *       try {
 *         await notionClient.blocks.retrieve({ block_id: blockId });
 *         return true;
 *       } catch {
 *         return false;
 *       }
 *     }
 *   }
 * );
 * 
 * if (!summary.allValid) {
 *   // Show confirmation dialog
 * }
 * ```
 */
export async function validateSelections(
  selections: Map<string, PageSectionSelection>,
  options: ValidationOptions
): Promise<ValidationSummary> {
  const results: SelectionValidationResult[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let endOfPageCount = 0;
  const invalidPages: Array<{ pageId: string; pageTitle: string; originalBlockId: string }> = [];

  // Validate each selection
  const validationPromises = Array.from(selections.entries()).map(
    async ([pageId, selection]): Promise<SelectionValidationResult> => {
      // If no blockId, it's end of page - always valid
      if (selection.blockId === null) {
        return {
          pageId,
          pageTitle: selection.pageTitle,
          originalBlockId: null,
          isValid: true,
        };
      }

      // Validate the block exists
      try {
        const exists = await options.validateBlock(pageId, selection.blockId);
        
        if (exists) {
          return {
            pageId,
            pageTitle: selection.pageTitle,
            originalBlockId: selection.blockId,
            isValid: true,
          };
        } else {
          return {
            pageId,
            pageTitle: selection.pageTitle,
            originalBlockId: selection.blockId,
            isValid: false,
            error: 'Block no longer exists',
          };
        }
      } catch (error) {
        return {
          pageId,
          pageTitle: selection.pageTitle,
          originalBlockId: selection.blockId,
          isValid: false,
          error: error instanceof Error ? error.message : 'Validation failed',
        };
      }
    }
  );

  // Wait for all validations to complete
  const validationResults = await Promise.all(validationPromises);

  // Process results
  for (const result of validationResults) {
    results.push(result);
    
    if (result.originalBlockId === null) {
      endOfPageCount++;
      validCount++; // End of page is always valid
    } else if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
      invalidPages.push({
        pageId: result.pageId,
        pageTitle: result.pageTitle,
        originalBlockId: result.originalBlockId,
      });
    }
  }

  return {
    results,
    validCount,
    invalidCount,
    endOfPageCount,
    allValid: invalidCount === 0,
    invalidPages,
  };
}


/**
 * Result of applying fallback to invalid selections
 */
export interface FallbackResult {
  /** Original insertion targets */
  originalTargets: InsertionTarget[];
  /** Targets with fallback applied for invalid blocks */
  correctedTargets: InsertionTarget[];
  /** Pages that were corrected to use end-of-page */
  fallbackPages: Array<{ pageId: string; pageTitle: string; originalBlockId: string }>;
  /** Number of targets that were corrected */
  fallbackCount: number;
}

/**
 * Applies fallback to end-of-page for invalid block selections
 * 
 * For any selection where the blockId no longer exists, this function
 * creates a corrected InsertionTarget with blockId = null (end of page).
 * 
 * @param targets - Original insertion targets
 * @param validationSummary - Results from validateSelections
 * @returns FallbackResult with corrected targets
 * 
 * Requirements: 13.3
 * 
 * @example
 * ```typescript
 * const validationSummary = await validateSelections(selections, options);
 * 
 * if (!validationSummary.allValid) {
 *   const fallbackResult = applyFallbackForInvalidBlocks(targets, validationSummary);
 *   // Use fallbackResult.correctedTargets for insertion
 * }
 * ```
 */
export function applyFallbackForInvalidBlocks(
  targets: InsertionTarget[],
  validationSummary: ValidationSummary
): FallbackResult {
  // Create a set of invalid page IDs for quick lookup
  const invalidPageIds = new Set(
    validationSummary.invalidPages.map(p => p.pageId)
  );

  const correctedTargets: InsertionTarget[] = [];
  const fallbackPages: Array<{ pageId: string; pageTitle: string; originalBlockId: string }> = [];

  for (const target of targets) {
    if (invalidPageIds.has(target.pageId) && target.blockId !== null) {
      // Apply fallback: set blockId to null (end of page)
      correctedTargets.push({
        ...target,
        blockId: null,
        position: 'end',
      });
      
      fallbackPages.push({
        pageId: target.pageId,
        pageTitle: target.pageTitle,
        originalBlockId: target.blockId,
      });
    } else {
      // Keep original target
      correctedTargets.push(target);
    }
  }

  return {
    originalTargets: targets,
    correctedTargets,
    fallbackPages,
    fallbackCount: fallbackPages.length,
  };
}

/**
 * Creates insertion targets from selections with automatic validation and fallback
 * 
 * This is a convenience function that combines validation and fallback
 * into a single operation. It validates all selections, applies fallback
 * for invalid blocks, and returns the corrected targets.
 * 
 * @param selections - Map of pageId to PageSectionSelection
 * @param options - Validation options
 * @returns Object containing corrected targets and validation info
 * 
 * Requirements: 13.1, 13.3
 */
export async function createValidatedInsertionTargets(
  selections: Map<string, PageSectionSelection>,
  options: ValidationOptions
): Promise<{
  targets: InsertionTarget[];
  validationSummary: ValidationSummary;
  fallbackResult: FallbackResult | null;
}> {
  // First, create initial targets from selections
  const initialTargets: InsertionTarget[] = Array.from(selections.values()).map(selection => ({
    pageId: selection.pageId,
    pageTitle: selection.pageTitle,
    blockId: selection.blockId,
    position: selection.blockId ? 'after' as const : 'end' as const,
  }));

  // Validate all selections
  const validationSummary = await validateSelections(selections, options);

  // If all valid, return original targets
  if (validationSummary.allValid) {
    return {
      targets: initialTargets,
      validationSummary,
      fallbackResult: null,
    };
  }

  // Apply fallback for invalid blocks
  const fallbackResult = applyFallbackForInvalidBlocks(initialTargets, validationSummary);

  return {
    targets: fallbackResult.correctedTargets,
    validationSummary,
    fallbackResult,
  };
}
