/**
 * InvalidSelectionsDialog - Confirmation dialog for invalid block selections
 * 
 * Displays a warning when selected blocks no longer exist in Notion pages,
 * allowing users to confirm proceeding with fallback behavior (end of page).
 * 
 * @module InvalidSelectionsDialog
 * 
 * Requirements: 13.4, 13.5
 */

import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  FileText,
  ArrowRight,
  Check,
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';

/**
 * Information about a page with invalid selection
 */
export interface InvalidPageInfo {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Original block ID that no longer exists */
  originalBlockId: string;
  /** Original heading text (if available) */
  originalHeadingText?: string;
}

/**
 * Props for the InvalidSelectionsDialog component
 */
export interface InvalidSelectionsDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Array of pages with invalid selections */
  invalidPages: InvalidPageInfo[];
  /** Total number of pages being processed */
  totalPages: number;
  /** Callback when user confirms proceeding with fallback */
  onConfirm: () => void;
  /** Callback when user cancels the operation */
  onCancel: () => void;
}

/**
 * InvalidSelectionsDialog component for confirming fallback behavior
 * 
 * Features:
 * - Shows warning about invalid selections (Req 13.4)
 * - Lists affected pages with fallback indication (Req 13.5)
 * - Confirm/Cancel actions
 * - Accessible modal with keyboard support
 * 
 * @example
 * ```tsx
 * <InvalidSelectionsDialog
 *   isOpen={showInvalidDialog}
 *   invalidPages={validationSummary.invalidPages}
 *   totalPages={selectedPages.length}
 *   onConfirm={() => proceedWithFallback()}
 *   onCancel={() => setShowInvalidDialog(false)}
 * />
 * ```
 */
export function InvalidSelectionsDialog({
  isOpen,
  invalidPages,
  totalPages,
  onConfirm,
  onCancel,
}: InvalidSelectionsDialogProps) {
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const validCount = totalPages - invalidPages.length;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invalid-selections-title"
        >
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <AlertTriangle
                    size={18}
                    strokeWidth={2}
                    className="text-amber-600 dark:text-amber-400"
                  />
                </div>
                <h2 
                  id="invalid-selections-title"
                  className="text-base font-semibold text-gray-800 dark:text-gray-200"
                >
                  Invalid Selections Found
                </h2>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              {/* Warning message */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {invalidPages.length === 1 
                  ? 'The selected section in 1 page no longer exists.'
                  : `The selected sections in ${invalidPages.length} pages no longer exist.`
                }
                {' '}Content will be inserted at the end of these pages instead.
              </p>

              {/* Affected pages list (Req 13.5) */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50 p-3 mb-4">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                  Pages using fallback insertion:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-amber-300 dark:scrollbar-thumb-amber-700">
                  {invalidPages.map((page) => (
                    <div
                      key={page.pageId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <FileText 
                        size={12} 
                        strokeWidth={2} 
                        className="flex-shrink-0 text-amber-600 dark:text-amber-400" 
                      />
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1" title={page.pageTitle}>
                        {page.pageTitle}
                      </span>
                      <ArrowRight 
                        size={10} 
                        strokeWidth={2} 
                        className="flex-shrink-0 text-gray-400" 
                      />
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] whitespace-nowrap">
                        End of page
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <span>
                  <span className="text-green-600 dark:text-green-400 font-medium">{validCount}</span> pages with valid selections
                </span>
                <span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{invalidPages.length}</span> pages using fallback
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                           bg-amber-500 hover:bg-amber-600 text-white
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1
                           dark:focus:ring-offset-gray-800"
              >
                <Check size={14} strokeWidth={2} />
                Continue with Fallback
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );

  // Render in portal
  return createPortal(modalContent, document.body);
}

export default InvalidSelectionsDialog;
