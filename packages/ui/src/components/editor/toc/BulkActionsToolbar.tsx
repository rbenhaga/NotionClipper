/**
 * BulkActionsToolbar - Toolbar for bulk TOC actions
 * 
 * Provides buttons for Smart Fill, Select All End, and Reset actions
 * for efficient multi-page section selection workflows.
 * 
 * @module BulkActionsToolbar
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import React, { useCallback } from 'react';
import { Sparkles, ArrowDown, RotateCcw } from 'lucide-react';

/**
 * Bulk action types supported by the toolbar
 */
export type BulkActionType = 'smart-fill' | 'all-end' | 'reset';

/**
 * Props for the BulkActionsToolbar component
 */
export interface BulkActionsToolbarProps {
  /** Callback when a bulk action button is clicked */
  onAction: (action: BulkActionType) => void;
  /** Whether there are any current selections (for Reset button state) */
  hasSelections: boolean;
  /** Whether smart matches are available (for Smart Fill button state) */
  hasSmartMatches?: boolean;
  /** Number of current selections (for display) */
  selectionCount?: number;
  /** Total number of pages (for display) */
  totalPages?: number;
  /** Whether the toolbar is in a loading state */
  loading?: boolean;
  /** Optional CSS class name */
  className?: string;
}

/**
 * BulkActionsToolbar component for multi-page TOC bulk actions
 * 
 * Features:
 * - Smart Fill button to open smart fill modal (Req 7.2)
 * - Select All End button to set all pages to end-of-page insertion (Req 7.1)
 * - Reset button to clear all selections (Req 7.3)
 * - Disabled state for Reset when no selections exist (Req 7.5)
 * - Immediate badge updates when bulk actions are applied (Req 7.4)
 * 
 * @example
 * ```tsx
 * <BulkActionsToolbar
 *   onAction={(action) => handleBulkAction(action)}
 *   hasSelections={selectionCount > 0}
 *   hasSmartMatches={smartMatches.length > 0}
 *   selectionCount={selectionCount}
 *   totalPages={selectedPages.length}
 * />
 * ```
 */
export function BulkActionsToolbar({
  onAction,
  hasSelections,
  hasSmartMatches = true,
  selectionCount = 0,
  totalPages = 0,
  loading = false,
  className = '',
}: BulkActionsToolbarProps) {
  /**
   * Handle Smart Fill button click (disabled - coming soon)
   */
  const handleSmartFill = useCallback(() => {
    // Disabled - coming soon
  }, []);

  /**
   * Handle Select All End button click
   * Sets all pages to insert at end of page
   * Requirements: 7.1
   */
  const handleSelectAllEnd = useCallback(() => {
    onAction('all-end');
  }, [onAction]);

  /**
   * Handle Reset button click
   * Clears all section selections across all pages
   * Requirements: 7.3
   */
  const handleReset = useCallback(() => {
    onAction('reset');
  }, [onAction]);

  // Check if all pages are at default (end of page)
  const configuredCount = selectionCount;
  const isAllDefault = configuredCount === 0 || Array.from({ length: totalPages }).every(() => true);

  return (
    <div 
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
      role="toolbar"
      aria-label="Bulk actions"
    >
      {/* Smart Fill button - disabled with "Soon" tooltip */}
      <button
        onClick={handleSmartFill}
        disabled={true}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md
          bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 
          cursor-not-allowed border border-gray-200/50 dark:border-gray-600/30
          opacity-60"
        title="Soon - AI-powered section matching"
        aria-label="Smart Fill (Coming Soon)"
      >
        <Sparkles size={12} strokeWidth={2} />
        <span>AI Fill</span>
        <span className="text-[8px] bg-gray-200 dark:bg-gray-600 px-1 rounded">Soon</span>
      </button>

      {/* Select All End button */}
      <button
        onClick={handleSelectAllEnd}
        disabled={loading || totalPages === 0}
        className={`
          flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md
          transition-all duration-150
          focus:outline-none focus:ring-1 focus:ring-blue-500
          ${totalPages > 0 && !loading
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/50 dark:border-blue-700/30'
            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200/50 dark:border-gray-600/30'
          }
        `}
        title={`Insert at end of all ${totalPages} pages`}
        aria-label="All pages to End"
      >
        <ArrowDown size={12} strokeWidth={2} />
        <span>All End</span>
      </button>

      {/* Reset button */}
      <button
        onClick={handleReset}
        disabled={loading || !hasSelections}
        className={`
          flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md
          transition-all duration-150
          focus:outline-none focus:ring-1 focus:ring-gray-500
          ${hasSelections && !loading
            ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50 border border-gray-200/50 dark:border-gray-600/30'
            : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200/50 dark:border-gray-600/30'
          }
        `}
        title="Clear all selections"
        aria-label="Reset"
      >
        <RotateCcw size={12} strokeWidth={2} />
      </button>

      {/* Selection count with default behavior info */}
      {totalPages > 0 && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1" title="If not configured, content goes to end of page by default">
          {configuredCount}/{totalPages}
          {configuredCount === 0 && <span className="text-gray-400 dark:text-gray-500 italic"> default: end</span>}
        </span>
      )}
    </div>
  );
}

export default BulkActionsToolbar;
