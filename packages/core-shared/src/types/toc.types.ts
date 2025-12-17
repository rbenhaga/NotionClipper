/**
 * TOC (Table of Contents) Multi-Select Types
 * 
 * Types for the advanced Table of Contents system enabling multi-page section selection
 * with intelligent matching capabilities.
 */

/**
 * Basic page information for TOC display
 */
export interface PageInfo {
  /** Unique page identifier from Notion */
  id: string;
  /** Page title for display */
  title: string;
  /** Optional page icon (emoji or URL) */
  icon?: string;
}

/**
 * Heading extracted from a Notion page
 */
export interface PageHeading {
  /** Block ID from Notion - used as insertion target */
  id: string;
  /** Original heading text */
  text: string;
  /** Heading level: H1, H2, or H3 */
  level: 1 | 2 | 3;
  /** Index position in the page */
  position: number;
  /** Nested headings (optional for hierarchical display) */
  children?: PageHeading[];
}

/**
 * Complete page structure with all headings
 */
export interface PageStructure {
  /** Page identifier */
  pageId: string;
  /** Page title */
  pageTitle: string;
  /** All headings extracted from the page */
  headings: PageHeading[];
  /** Total number of blocks in the page */
  totalBlocks: number;
  /** Timestamp for cache invalidation (ms since epoch) */
  fetchedAt: number;
}

/**
 * A single section selection within a page
 */
export interface SectionTarget {
  /** Block ID of selected heading, null = end of page */
  blockId: string | null;
  /** Text of selected heading, null = end of page */
  headingText: string | null;
  /** Level of selected heading, null = end of page */
  headingLevel: 1 | 2 | 3 | null;
  /** Confidence score for smart matching (0-100), optional for manual selections */
  confidence?: number;
  /** Insertion mode for this specific target */
  insertionMode?: InsertionMode;
}

/**
 * Selection state for a single page's section target(s)
 * Supports multiple section selections per page
 */
export interface PageSectionSelection {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Block ID of selected heading, null = end of page (legacy single selection) */
  blockId: string | null;
  /** Text of selected heading, null = end of page (legacy single selection) */
  headingText: string | null;
  /** Level of selected heading, null = end of page (legacy single selection) */
  headingLevel: 1 | 2 | 3 | null;
  /** Confidence score for smart matching (0-100) */
  confidence: number;
  /** Multiple section targets for this page (optional, for multi-select mode) */
  targets?: SectionTarget[];
}


/**
 * Match type indicating how sections were matched
 */
export type MatchType = 'exact' | 'normalized' | 'fuzzy' | 'synonym';

/**
 * A page that matched a section during smart matching
 */
export interface MatchedPage {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Block ID of the matched heading */
  blockId: string;
  /** Original heading text before normalization */
  originalText: string;
}

/**
 * Smart matching result for a section found across multiple pages
 */
export interface SectionMatch {
  /** The heading text used for matching */
  headingText: string;
  /** Heading level (H1, H2, H3) */
  headingLevel: 1 | 2 | 3;
  /** Normalized text used for comparison */
  normalizedText: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** How the match was determined */
  matchType: MatchType;
  /** Pages where this section was found */
  matchedPages: MatchedPage[];
  /** Total number of pages being compared */
  totalPagesCount: number;
  /** Number of pages where this section was found */
  matchedPagesCount: number;
}

/**
 * Insertion mode for content placement relative to a section
 * - 'after-heading': Insert immediately after the selected heading block
 * - 'end-of-section': Insert at the end of the section (before the next heading of same or higher level)
 */
export type InsertionMode = 'after-heading' | 'end-of-section';

/**
 * Global TOC state for multi-page selection
 */
export interface MultiPageTOCState {
  /** Map of pageId to section selection */
  selections: Map<string, PageSectionSelection>;
  /** Currently active tab's page ID */
  activeTabPageId: string;
  /** Smart matching results */
  smartMatches: SectionMatch[];
  /** Current selection mode */
  mode: 'manual' | 'smart-fill' | 'all-same';
  /** Whether the TOC panel is expanded */
  isExpanded: boolean;
  /** How content should be inserted relative to sections */
  insertionMode: InsertionMode;
}

/**
 * Insertion target for Notion API calls
 */
export interface InsertionTarget {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Block ID to insert after, null = end of page */
  blockId: string | null;
  /** Text of target heading, null = end of page */
  headingText?: string | null;
  /** Level of target heading, null = end of page */
  headingLevel?: 1 | 2 | 3 | null;
  /** Position relative to the block */
  position: 'after' | 'end';
  /** Insertion mode for this specific target */
  insertionMode?: InsertionMode;
}

/**
 * Result of a single page insertion operation
 */
export interface InsertionResult {
  /** Page identifier */
  pageId: string;
  /** Page title for display */
  pageTitle: string;
  /** Outcome of the insertion */
  status: 'success' | 'error' | 'fallback';
  /** Block ID where content was inserted (if successful) */
  blockId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Whether fallback to end-of-page was used */
  usedFallback?: boolean;
}

/**
 * Saved TOC configuration for reuse
 */
export interface TOCPreset {
  /** Unique preset identifier */
  id: string;
  /** User-provided preset name */
  name: string;
  /** Creation timestamp (ms since epoch) */
  createdAt: number;
  /** Last update timestamp (ms since epoch) */
  updatedAt: number;
  /** Saved page selections */
  pageSelections: Array<{
    pageId: string;
    pageTitle: string;
    blockId: string | null;
    headingText: string | null;
  }>;
}

/**
 * Export/Import configuration format
 */
export interface TOCExportConfig {
  /** Configuration version for compatibility checking */
  version: string;
  /** Export timestamp (ms since epoch) */
  exportedAt: number;
  /** Exported selections */
  selections: PageSectionSelection[];
  /** Custom synonym mappings */
  customSynonyms?: Record<string, string[]>;
}
