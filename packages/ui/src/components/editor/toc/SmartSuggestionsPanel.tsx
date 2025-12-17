/**
 * SmartSuggestionsPanel - Displays matched sections with confidence indicators
 * 
 * Shows smart matching results for sections found across multiple pages,
 * with confidence badges and apply buttons for each match.
 * 
 * @module SmartSuggestionsPanel
 * 
 * Requirements: 4.5, 4.6, 4.7, 6.3
 */

import React, { useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Sparkles, 
  AlertTriangle,
  ChevronRight,
  Zap
} from 'lucide-react';
import { MotionDiv } from '../../common/MotionWrapper';
import type { SectionMatch, MatchType } from '@notion-clipper/core-shared';

/**
 * Props for the SmartSuggestionsPanel component
 */
export interface SmartSuggestionsPanelProps {
  /** Array of section matches from smart matching engine */
  matches: SectionMatch[];
  /** Callback when user clicks Apply on a match (toggles on/off) */
  onApply: (match: SectionMatch) => void;
  /** Set of currently applied match texts (multiple can be active) */
  appliedMatches?: Set<string>;
  /** Whether the panel is in loading state */
  loading?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Maximum number of suggestions to show (default: 5) */
  maxSuggestions?: number;
  /** Total number of currently selected pages */
  selectedPagesCount?: number;
}

/**
 * Get badge color and text based on match type and confidence
 * 
 * - Exact match (100%): Green badge
 * - Normalized match (90%): Blue badge  
 * - Fuzzy/Synonym match (70-85%): Yellow badge
 * - Low confidence (<80%): Warning indicator
 */
function getConfidenceBadge(matchType: MatchType, confidence: number): {
  color: string;
  bgColor: string;
  text: string;
  showWarning: boolean;
} {
  const showWarning = confidence < 80;
  
  switch (matchType) {
    case 'exact':
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        text: 'Exact',
        showWarning: false,
      };
    case 'normalized':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'Normalized',
        showWarning: false,
      };
    case 'fuzzy':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/40',
        text: 'Fuzzy',
        showWarning,
      };
    case 'synonym':
      return {
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        text: 'Synonym',
        showWarning,
      };
    default:
      return {
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/40',
        text: 'Match',
        showWarning,
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
 * Props for individual suggestion card
 */
interface SuggestionCardProps {
  match: SectionMatch;
  onApply: () => void;
  isApplied: boolean;
  /** Total selected pages for accurate count display */
  selectedPagesCount: number;
}

/**
 * Compact suggestion card for grid layout - single line design
 * Supports toggle behavior - click to apply, click again to remove
 */
const SuggestionCard: React.FC<SuggestionCardProps> = ({ 
  match, 
  onApply,
  isApplied,
  selectedPagesCount
}) => {
  const badge = getConfidenceBadge(match.matchType, match.confidence);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onApply(); // Always allow toggle
    }
  }, [onApply]);

  // Use actual selected pages count for display
  const displayMatchedCount = Math.min(match.matchedPagesCount, selectedPagesCount);

  return (
    <button
      onClick={onApply}
      onKeyDown={handleKeyDown}
      className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs w-full
        transition-all duration-150 text-left cursor-pointer
        focus:outline-none
        ${isApplied
          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
        }
      `}
      aria-label={isApplied ? `Remove ${match.headingText} from ${displayMatchedCount} pages` : `Apply ${match.headingText} to ${displayMatchedCount} pages`}
      aria-pressed={isApplied}
    >
      {/* Level badge */}
      <span 
        className={`
          flex-shrink-0 text-[8px] font-bold px-1 rounded
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
        className="font-medium text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0"
        title={match.headingText}
      >
        {match.headingText}
      </span>
      
      {/* Stats inline */}
      <span className={`flex-shrink-0 text-[9px] ${badge.color}`}>{badge.text}</span>
      <span className="flex-shrink-0 text-[9px] text-gray-400">{match.confidence}%</span>
      <span className="flex-shrink-0 text-[9px] text-gray-400">{displayMatchedCount}/{selectedPagesCount}</span>
      
      {/* Applied indicator */}
      {isApplied && <Check size={12} className="flex-shrink-0 text-green-500" />}
      {badge.showWarning && !isApplied && <AlertTriangle size={9} className="flex-shrink-0 text-amber-500" />}
    </button>
  );
};

/**
 * Empty state when no matches found
 */
const EmptyState: React.FC = () => {
  return (
    <div 
      className="flex flex-col items-center justify-center py-6 px-4 text-center"
      role="status"
    >
      <Sparkles 
        size={24} 
        strokeWidth={1.5}
        className="text-gray-300 dark:text-gray-600 mb-2"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No common sections found
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
        Sections will appear here when pages share similar headings
      </p>
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 animate-pulse" role="status" aria-label="Loading suggestions">
      {[1, 2].map((i) => (
        <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-full h-7 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
      <span className="sr-only">Loading smart suggestions...</span>
    </div>
  );
};


/**
 * SmartSuggestionsPanel component for displaying matched sections
 * 
 * Features:
 * - Display matched sections with count and confidence (Req 4.5)
 * - Confidence indicator badges (exact/fuzzy/warning) (Req 4.7, 6.3)
 *   - Green for exact matches
 *   - Yellow for fuzzy matches
 *   - Warning icon for confidence <80%
 * - "Apply" button for each matched section (Req 4.6)
 * 
 * @example
 * ```tsx
 * <SmartSuggestionsPanel
 *   matches={smartMatches}
 *   onApply={(match) => applyMatchToPages(match)}
 *   appliedMatches={appliedSet}
 * />
 * ```
 */
export function SmartSuggestionsPanel({
  matches,
  onApply,
  appliedMatches = new Set(),
  loading = false,
  className = '',
  maxSuggestions = 5,
  selectedPagesCount = 0,
}: SmartSuggestionsPanelProps) {
  // Sort matches by confidence (highest first) and limit to maxSuggestions
  const sortedMatches = useMemo(() => {
    return [...matches]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }, [matches, maxSuggestions]);

  // Handle apply/toggle click
  const handleApply = useCallback((match: SectionMatch) => {
    onApply(match);
  }, [onApply]);

  // Check if a match is currently applied (multiple can be active)
  const isMatchApplied = useCallback((match: SectionMatch): boolean => {
    return appliedMatches.has(match.normalizedText);
  }, [appliedMatches]);

  // Show loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} strokeWidth={2} className="text-purple-500 dark:text-purple-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Smart Suggestions
          </span>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Show empty state if no matches
  if (sortedMatches.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} strokeWidth={2} className="text-purple-500 dark:text-purple-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Smart Suggestions
          </span>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div 
      className={`${className}`}
      role="region"
      aria-label="Smart section suggestions"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} strokeWidth={2} className="text-purple-500 dark:text-purple-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Smart Suggestions
          </span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {sortedMatches.length} match{sortedMatches.length !== 1 ? 'es' : ''} found
        </span>
      </div>

      {/* Suggestions grid - 2 cols for 2-3, 3 cols for 4-5, 4 cols for 6+ */}
      <div className={`grid gap-1 ${
        sortedMatches.length === 1 
          ? 'grid-cols-1' 
          : sortedMatches.length <= 3 
            ? 'grid-cols-2' 
            : sortedMatches.length <= 5
              ? 'grid-cols-3'
              : 'grid-cols-4'
      }`}>
        <AnimatePresence mode="popLayout">
          {sortedMatches.map((match, index) => (
            <MotionDiv
              key={`${match.normalizedText}-${match.headingLevel}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, delay: index * 0.02 }}
            >
              <SuggestionCard
                match={match}
                onApply={() => handleApply(match)}
                isApplied={isMatchApplied(match)}
                selectedPagesCount={selectedPagesCount}
              />
            </MotionDiv>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more indicator if there are more matches */}
      {matches.length > maxSuggestions && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
          +{matches.length - maxSuggestions} more
        </p>
      )}
    </div>
  );
}

export default SmartSuggestionsPanel;
