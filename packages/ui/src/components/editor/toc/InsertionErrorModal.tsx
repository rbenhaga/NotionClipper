/**
 * InsertionErrorModal - Modal showing error details after multi-page insertion
 * 
 * Displays detailed error information for pages that failed during
 * multi-page content insertion operations.
 * 
 * @module InsertionErrorModal
 * 
 * Requirements: 9.8
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../../common/MotionWrapper';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Copy
} from 'lucide-react';
import type { InsertionResult } from '@notion-clipper/core-shared';

export interface InsertionErrorModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Array of insertion results */
  results: InsertionResult[];
  /** Total time taken for insertion */
  totalTimeMs?: number;
}

/**
 * Get status icon for a result
 */
function getResultIcon(result: InsertionResult) {
  switch (result.status) {
    case 'success':
      return <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />;
    case 'error':
      return <AlertCircle size={16} className="text-red-500 flex-shrink-0" />;
    case 'fallback':
      return <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />;
    default:
      return <FileText size={16} className="text-gray-400 flex-shrink-0" />;
  }
}

/**
 * Get status label for a result
 */
function getStatusLabel(result: InsertionResult): string {
  switch (result.status) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Failed';
    case 'fallback':
      return 'Fallback used';
    default:
      return 'Unknown';
  }
}

/**
 * InsertionErrorModal component
 * 
 * Displays a modal with detailed results of multi-page insertion:
 * - Summary of success/error/fallback counts
 * - List of all pages with their status
 * - Error messages for failed pages
 * - Option to copy error details
 * 
 * @example
 * ```tsx
 * <InsertionErrorModal
 *   isOpen={showErrorModal}
 *   onClose={() => setShowErrorModal(false)}
 *   results={insertionResults}
 *   totalTimeMs={2500}
 * />
 * ```
 */
export function InsertionErrorModal({
  isOpen,
  onClose,
  results,
  totalTimeMs,
}: InsertionErrorModalProps) {
  // Calculate summary stats
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const fallbackCount = results.filter(r => r.status === 'fallback').length;
  const totalCount = results.length;

  // Get only error results for display
  const errorResults = results.filter(r => r.status === 'error' || r.status === 'fallback');

  /**
   * Copy error details to clipboard
   */
  const handleCopyErrors = async () => {
    const errorText = errorResults
      .map(r => `${r.pageTitle}: ${r.error || 'Fallback to end of page'}`)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(errorText);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    errorCount > 0 
                      ? 'bg-red-100 dark:bg-red-900/30' 
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {errorCount > 0 ? (
                      <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                    ) : (
                      <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Insertion Results
                    </h2>
                    {totalTimeMs && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Completed in {(totalTimeMs / 1000).toFixed(1)}s
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={18} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Summary */}
              <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {successCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Success</div>
                  </div>
                  {fallbackCount > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {fallbackCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Fallback</div>
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {errorCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                      {totalCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                  </div>
                </div>
              </div>

              {/* Results list */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {errorResults.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Issues ({errorResults.length})
                      </h3>
                      <button
                        onClick={handleCopyErrors}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      >
                        <Copy size={12} />
                        Copy
                      </button>
                    </div>
                    
                    {errorResults.map((result, index) => (
                      <div
                        key={`${result.pageId}-${index}`}
                        className={`p-3 rounded-lg border ${
                          result.status === 'error'
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {getResultIcon(result)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.pageTitle}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                result.status === 'error'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              }`}>
                                {getStatusLabel(result)}
                              </span>
                            </div>
                            {result.error && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {result.error}
                              </p>
                            )}
                            {result.usedFallback && !result.error && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Content inserted at end of page (original section not found)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All pages processed successfully!
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}

export default InsertionErrorModal;
