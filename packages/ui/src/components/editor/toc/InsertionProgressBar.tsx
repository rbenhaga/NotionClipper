/**
 * InsertionProgressBar - Progress bar UI during multi-page insertion
 * 
 * Displays a progress bar with current/total count and page name during
 * multi-page content insertion operations.
 * 
 * @module InsertionProgressBar
 * 
 * Requirements: 9.4
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../../common/MotionWrapper';
import { Loader, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { InsertionProgress } from '@notion-clipper/core-shared';

export interface InsertionProgressBarProps {
  /** Whether the progress bar is visible */
  isVisible: boolean;
  /** Current progress information */
  progress: InsertionProgress | null;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Get status icon based on current status
 */
function getStatusIcon(status: InsertionProgress['status']) {
  switch (status) {
    case 'inserting':
    case 'pending':
      return <Loader size={14} className="animate-spin text-blue-500" />;
    case 'success':
      return <CheckCircle2 size={14} className="text-green-500" />;
    case 'error':
      return <XCircle size={14} className="text-red-500" />;
    case 'fallback':
      return <AlertTriangle size={14} className="text-amber-500" />;
    default:
      return <Loader size={14} className="animate-spin text-blue-500" />;
  }
}

/**
 * Get status text based on current status
 */
function getStatusText(status: InsertionProgress['status']): string {
  switch (status) {
    case 'pending':
      return 'Waiting...';
    case 'inserting':
      return 'Inserting...';
    case 'success':
      return 'Done';
    case 'error':
      return 'Failed';
    case 'fallback':
      return 'Fallback';
    default:
      return 'Processing...';
  }
}

/**
 * InsertionProgressBar component
 * 
 * Displays progress during multi-page insertion with:
 * - Progress bar showing current/total
 * - Current page name being processed
 * - Status indicator (inserting, success, error, fallback)
 * 
 * @example
 * ```tsx
 * <InsertionProgressBar
 *   isVisible={isInserting}
 *   progress={insertionProgress}
 * />
 * ```
 */
export function InsertionProgressBar({
  isVisible,
  progress,
  className = '',
}: InsertionProgressBarProps) {
  if (!progress) return null;

  const percentage = Math.round((progress.current / progress.total) * 100);

  return (
    <AnimatePresence>
      {isVisible && (
        <MotionDiv
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`
            bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
            shadow-lg p-4 ${className}
          `}
          role="progressbar"
          aria-valuenow={progress.current}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label={`Inserting content: ${progress.current} of ${progress.total} pages`}
        >
          {/* Header with count */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(progress.status)}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Inserting content
              </span>
            </div>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {progress.current}/{progress.total}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <MotionDiv
              className={`h-full rounded-full ${
                progress.status === 'error' 
                  ? 'bg-red-500' 
                  : progress.status === 'fallback'
                    ? 'bg-amber-500'
                    : 'bg-purple-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Current page info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
              {progress.pageTitle}
            </span>
            <span className={`font-medium ${
              progress.status === 'error' 
                ? 'text-red-600 dark:text-red-400' 
                : progress.status === 'fallback'
                  ? 'text-amber-600 dark:text-amber-400'
                  : progress.status === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
            }`}>
              {getStatusText(progress.status)}
            </span>
          </div>

          {/* Error message if present */}
          {progress.error && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
              {progress.error}
            </div>
          )}
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export default InsertionProgressBar;
