/**
 * ValidationWarningBanner - Warning banner for invalid block selections
 * 
 * Displays a dismissible warning banner when selected blocks no longer exist,
 * showing affected pages and providing quick actions.
 * 
 * @module ValidationWarningBanner
 * 
 * Requirements: 13.2
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';

/**
 * Information about a page with invalid selection
 */
export interface InvalidPageWarning {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Original heading text that was selected */
  originalHeadingText?: string;
}

/**
 * Props for the ValidationWarningBanner component
 */
export interface ValidationWarningBannerProps {
  /** Array of pages with invalid selections */
  invalidPages: InvalidPageWarning[];
  /** Callback when banner is dismissed */
  onDismiss: () => void;
  /** Callback when user wants to reconfigure selections */
  onReconfigure?: () => void;
}

/**
 * ValidationWarningBanner component for displaying validation warnings
 * 
 * Features:
 * - Displays warning about invalid selections (Req 13.2)
 * - Lists affected pages with expandable details
 * - Dismissible with X button
 * - Optional reconfigure action
 * 
 * @example
 * ```tsx
 * <ValidationWarningBanner
 *   invalidPages={[
 *     { pageId: '123', pageTitle: 'Meeting Notes', originalHeadingText: 'Action Items' }
 *   ]}
 *   onDismiss={() => setShowWarning(false)}
 *   onReconfigure={() => openTOCManager()}
 * />
 * ```
 */
export function ValidationWarningBanner({
  invalidPages,
  onDismiss,
  onReconfigure,
}: ValidationWarningBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (invalidPages.length === 0) {
    return null;
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-3"
    >
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-3 py-2.5">
          {/* Warning icon */}
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle
              size={16}
              strokeWidth={2}
              className="text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {invalidPages.length === 1
                ? '1 selected section no longer exists'
                : `${invalidPages.length} selected sections no longer exist`}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              Content will be inserted at the end of affected pages
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Expand/collapse button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
              aria-label={isExpanded ? 'Hide details' : 'Show details'}
            >
              {isExpanded ? (
                <ChevronUp size={14} strokeWidth={2} className="text-amber-600 dark:text-amber-400" />
              ) : (
                <ChevronDown size={14} strokeWidth={2} className="text-amber-600 dark:text-amber-400" />
              )}
            </button>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
              aria-label="Dismiss warning"
            >
              <X size={14} strokeWidth={2} className="text-amber-600 dark:text-amber-400" />
            </button>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <MotionDiv
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2.5 pt-1 border-t border-amber-200/50 dark:border-amber-800/30">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-1.5">
                  Affected pages:
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-300 dark:scrollbar-thumb-amber-700">
                  {invalidPages.map((page) => (
                    <div
                      key={page.pageId}
                      className="flex items-center gap-2 text-[10px]"
                    >
                      <FileText
                        size={10}
                        strokeWidth={2}
                        className="flex-shrink-0 text-amber-500 dark:text-amber-500"
                      />
                      <span className="text-amber-700 dark:text-amber-300 truncate" title={page.pageTitle}>
                        {page.pageTitle}
                      </span>
                      {page.originalHeadingText && (
                        <span className="text-amber-500 dark:text-amber-500 truncate">
                          ({page.originalHeadingText})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reconfigure action */}
                {onReconfigure && (
                  <button
                    onClick={onReconfigure}
                    className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-300 
                               hover:text-amber-800 dark:hover:text-amber-200 underline transition-colors"
                  >
                    Reconfigure selections
                  </button>
                )}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </MotionDiv>
  );
}

export default ValidationWarningBanner;
