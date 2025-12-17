/**
 * SmartFillModal - Modal for reviewing and applying smart fill selections
 * 
 * Displays all detected section matches with checkboxes, allowing users to
 * review and select which common sections to apply across pages.
 * 
 * @module SmartFillModal
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.8, 8.9, 8.10
 */

import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  AlertTriangle,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Minus,
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';
import type { SectionMatch, InsertionMode, MatchType } from '@notion-clipper/core-shared';

/**
 * Props for the SmartFillModal component
 */
export interface SmartFillModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Array of section matches from smart matching engine */
  matches: SectionMatch[];
  /** Callback when user clicks Apply with selected matches */
  onApply: (selectedMatches: SectionMatch[], insertionMode: InsertionMode) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Total number of pages being configured */
  totalPages: number;
}

/**
 * Get confidence badge styling based on match type and confidence
 */
function getConfidenceBadge(matchType: MatchType, confidence: number): {
  color: string;
  bgColor: string;
  text: string;
} {
  switch (matchType) {
    case 'exact':
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        text: 'Exact',
      };
    case 'normalized':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'Normalized',
      };
    case 'fuzzy':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        text: 'Fuzzy',
      };
    case 'synonym':
      return {
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        text: 'Synonym',
      };
    default:
      return {
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/40',
        text: 'Match',
      };
  }
}

/**
 * Get heading level indicator
 */
function getLevelIndicator(level: 1 | 2 | 3): string {
  return `H${level}`;
}


/**
 * Props for individual match item
 */
interface MatchItemProps {
  match: SectionMatch;
  isChecked: boolean;
  isExpanded: boolean;
  onToggleCheck: () => void;
  onToggleExpand: () => void;
}

/**
 * Individual match item component with checkbox and page list
 */
const MatchItem: React.FC<MatchItemProps> = ({
  match,
  isChecked,
  isExpanded,
  onToggleCheck,
  onToggleExpand,
}) => {
  const badge = getConfidenceBadge(match.matchType, match.confidence);
  const showWarning = match.confidence < 80;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCheck();
    }
  }, [onToggleCheck]);

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${isChecked
          ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }
      `}
    >
      {/* Main row with checkbox and match info */}
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox (Req 8.1, 8.2) */}
        <button
          role="checkbox"
          aria-checked={isChecked}
          onClick={onToggleCheck}
          onKeyDown={handleKeyDown}
          className={`
            flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
            dark:focus:ring-offset-gray-800
            ${isChecked
              ? 'bg-purple-600 border-purple-600 dark:bg-purple-500 dark:border-purple-500'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
            }
          `}
        >
          {isChecked && (
            <Check size={12} strokeWidth={3} className="text-white" />
          )}
        </button>

        {/* Match content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Heading level badge */}
            <span
              className={`
                flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded
                ${match.headingLevel === 1
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  : match.headingLevel === 2
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                    : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                }
              `}
            >
              {getLevelIndicator(match.headingLevel)}
            </span>

            {/* Heading text */}
            <span
              className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
              title={match.headingText}
            >
              {match.headingText}
            </span>

            {/* Warning icon for low confidence (Req 8.6) */}
            {showWarning && (
              <span
                className="flex-shrink-0"
                title="Approximate match - verify before applying"
              >
                <AlertTriangle
                  size={14}
                  strokeWidth={2}
                  className="text-amber-500 dark:text-amber-400"
                />
              </span>
            )}
          </div>

          {/* Info row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Match type badge */}
            <span
              className={`
                text-[10px] font-semibold px-1.5 py-0.5 rounded
                ${badge.bgColor} ${badge.color}
              `}
            >
              {badge.text}
            </span>

            {/* Confidence percentage */}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {match.confidence}% confidence
            </span>

            {/* Match count */}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {match.matchedPagesCount}/{match.totalPagesCount} pages
            </span>

            {/* Expand/collapse button for page list (Req 8.3) */}
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 
                         hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronDown size={12} strokeWidth={2} />
                  Hide pages
                </>
              ) : (
                <>
                  <ChevronRight size={12} strokeWidth={2} />
                  Show pages
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded page list (Req 8.3) */}
      <AnimatePresence>
        {isExpanded && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700/50 ml-8">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                Found in these pages:
              </p>
              <div className="space-y-1">
                {match.matchedPages.map((page) => (
                  <div
                    key={page.pageId}
                    className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <FileText size={12} strokeWidth={2} className="flex-shrink-0" />
                    <span className="truncate" title={page.pageTitle}>
                      {page.pageTitle}
                    </span>
                    {page.originalText !== match.headingText && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        ({page.originalText})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};


/**
 * Insertion mode selector component (Req 8.5)
 */
interface InsertionModeSelectorProps {
  value: InsertionMode;
  onChange: (mode: InsertionMode) => void;
}

const InsertionModeSelector: React.FC<InsertionModeSelectorProps> = ({ value, onChange }) => {
  const modes: { value: InsertionMode; label: string; description: string }[] = [
    {
      value: 'after-heading',
      label: 'After heading',
      description: 'Insert right after the heading',
    },
    {
      value: 'end-of-section',
      label: 'End of section',
      description: 'Insert at end of section (before next heading)',
    },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Insertion Mode
      </label>
      <div className="flex gap-2">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={`
              flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
              dark:focus:ring-offset-gray-800
              ${value === mode.value
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
              }
            `}
            title={mode.description}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Preview panel showing affected pages (Req 8.8)
 */
interface PreviewPanelProps {
  selectedMatches: SectionMatch[];
  totalPages: number;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ selectedMatches, totalPages }) => {
  // Calculate unique affected pages
  const affectedPages = useMemo(() => {
    const pageSet = new Map<string, string>();
    selectedMatches.forEach((match) => {
      match.matchedPages.forEach((page) => {
        pageSet.set(page.pageId, page.pageTitle);
      });
    });
    return Array.from(pageSet.entries()).map(([id, title]) => ({ id, title }));
  }, [selectedMatches]);

  const affectedCount = affectedPages.length;
  const percentage = totalPages > 0 ? Math.round((affectedCount / totalPages) * 100) : 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Preview
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {affectedCount}/{totalPages} pages ({percentage}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-purple-500 dark:bg-purple-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Affected pages list */}
      {affectedCount > 0 ? (
        <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {affectedPages.slice(0, 5).map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <Check size={10} strokeWidth={2.5} className="text-green-500 flex-shrink-0" />
              <span className="truncate">{page.title}</span>
            </div>
          ))}
          {affectedPages.length > 5 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 pl-4">
              +{affectedPages.length - 5} more pages
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
          No pages will be affected
        </p>
      )}
    </div>
  );
};


/**
 * SmartFillModal component for reviewing and applying smart fill selections
 * 
 * Features:
 * - Modal with header, content, footer (Req 8.1)
 * - Match list with checkboxes pre-checked for confidence >80% (Req 8.1, 8.2)
 * - Page list for each match (Req 8.3)
 * - Warning icon for low confidence matches (Req 8.6)
 * - Insertion mode selector (end/start/replace) (Req 8.5)
 * - Dynamic preview panel showing affected pages (Req 8.8)
 * - Select All / Deselect All buttons (Req 8.9, 8.10)
 * - Apply and Cancel actions (Req 8.4)
 * 
 * @example
 * ```tsx
 * <SmartFillModal
 *   isOpen={showSmartFill}
 *   matches={smartMatches}
 *   onApply={(matches, mode) => applySmartFill(matches, mode)}
 *   onClose={() => setShowSmartFill(false)}
 *   totalPages={selectedPages.length}
 * />
 * ```
 */
export function SmartFillModal({
  isOpen,
  matches,
  onApply,
  onClose,
  totalPages,
}: SmartFillModalProps) {
  // State for checked matches - pre-check matches with confidence >80% (Req 8.2)
  const [checkedMatches, setCheckedMatches] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    matches.forEach((match) => {
      if (match.confidence > 80) {
        initial.add(match.normalizedText);
      }
    });
    return initial;
  });

  // State for expanded matches (showing page list)
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

  // State for insertion mode (Req 8.5)
  const [insertionMode, setInsertionMode] = useState<InsertionMode>('end-of-section');

  // Reset state when matches change
  React.useEffect(() => {
    const initial = new Set<string>();
    matches.forEach((match) => {
      if (match.confidence > 80) {
        initial.add(match.normalizedText);
      }
    });
    setCheckedMatches(initial);
    setExpandedMatches(new Set());
  }, [matches]);

  // Get selected matches for preview
  const selectedMatches = useMemo(() => {
    return matches.filter((match) => checkedMatches.has(match.normalizedText));
  }, [matches, checkedMatches]);

  // Toggle individual match
  const toggleMatch = useCallback((normalizedText: string) => {
    setCheckedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedText)) {
        next.delete(normalizedText);
      } else {
        next.add(normalizedText);
      }
      return next;
    });
  }, []);

  // Toggle match expansion
  const toggleExpand = useCallback((normalizedText: string) => {
    setExpandedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedText)) {
        next.delete(normalizedText);
      } else {
        next.add(normalizedText);
      }
      return next;
    });
  }, []);

  // Select All - check matches with confidence >70% (Req 8.9)
  const handleSelectAll = useCallback(() => {
    const toSelect = new Set<string>();
    matches.forEach((match) => {
      if (match.confidence >= 70) {
        toSelect.add(match.normalizedText);
      }
    });
    setCheckedMatches(toSelect);
  }, [matches]);

  // Deselect All (Req 8.10)
  const handleDeselectAll = useCallback(() => {
    setCheckedMatches(new Set());
  }, []);

  // Handle Apply (Req 8.4)
  const handleApply = useCallback(() => {
    onApply(selectedMatches, insertionMode);
    onClose();
  }, [selectedMatches, insertionMode, onApply, onClose]);

  // Handle Cancel (Req 8.4)
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate selection state for Select All button
  const selectAllState = useMemo(() => {
    const eligibleCount = matches.filter((m) => m.confidence >= 70).length;
    const selectedCount = matches.filter(
      (m) => m.confidence >= 70 && checkedMatches.has(m.normalizedText)
    ).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === eligibleCount) return 'all';
    return 'partial';
  }, [matches, checkedMatches]);

  if (!isOpen) return null;

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
        >
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={18}
                  strokeWidth={2}
                  className="text-purple-500 dark:text-purple-400"
                />
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                  Smart Fill
                </h2>
              </div>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles
                    size={32}
                    strokeWidth={1.5}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No common sections found
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Pages don't share similar headings
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All / Deselect All buttons (Req 8.9, 8.10) */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {checkedMatches.size} of {matches.length} sections selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
                                   text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30
                                   rounded-lg transition-colors"
                      >
                        {selectAllState === 'all' ? (
                          <CheckSquare size={14} strokeWidth={2} />
                        ) : selectAllState === 'partial' ? (
                          <Minus size={14} strokeWidth={2} />
                        ) : (
                          <Square size={14} strokeWidth={2} />
                        )}
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
                                   text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
                                   rounded-lg transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Match list */}
                  <div className="space-y-2">
                    {matches.map((match) => (
                      <MatchItem
                        key={`${match.normalizedText}-${match.headingLevel}`}
                        match={match}
                        isChecked={checkedMatches.has(match.normalizedText)}
                        isExpanded={expandedMatches.has(match.normalizedText)}
                        onToggleCheck={() => toggleMatch(match.normalizedText)}
                        onToggleExpand={() => toggleExpand(match.normalizedText)}
                      />
                    ))}
                  </div>

                  {/* Insertion mode selector (Req 8.5) */}
                  <InsertionModeSelector
                    value={insertionMode}
                    onChange={setInsertionMode}
                  />

                  {/* Preview panel (Req 8.8) */}
                  <PreviewPanel
                    selectedMatches={selectedMatches}
                    totalPages={totalPages}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={selectedMatches.length === 0}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
                  dark:focus:ring-offset-gray-800
                  ${selectedMatches.length > 0
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Sparkles size={14} strokeWidth={2} />
                Apply to {selectedMatches.reduce((acc, m) => acc + m.matchedPagesCount, 0)} pages
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

export default SmartFillModal;
