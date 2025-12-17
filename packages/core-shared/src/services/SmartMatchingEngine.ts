/**
 * SmartMatchingEngine - Intelligent section matching across multiple Notion pages
 * 
 * Implements a three-tier matching algorithm:
 * 1. Exact match (100% confidence) - identical normalized text and heading level
 * 2. Normalized match (90% confidence) - match after text normalization
 * 3. Fuzzy/Synonym match (70-85% confidence) - Levenshtein distance or synonym dictionary
 * 
 * Performance optimizations (Req 11.2):
 * - Memoization of matching results with cache key based on page structure hashes
 * - Memoization of text normalization results
 * - Target: <200ms for matching up to 10 pages
 * 
 * @module SmartMatchingEngine
 */

import type {
  PageStructure,
  PageHeading,
  SectionMatch,
  MatchedPage,
  MatchType,
} from '../types/toc.types';

/**
 * Cache entry for memoized matching results
 */
interface MatchingCacheEntry {
  /** Cache key based on page structure hashes */
  cacheKey: string;
  /** Cached matching results */
  matches: SectionMatch[];
  /** Timestamp when cached */
  cachedAt: number;
}

/**
 * Cache TTL for matching results (5 minutes)
 */
const MATCHING_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Synonym dictionary for bilingual (French/English) section name variations
 * Maps canonical terms to their variations
 */
export const SYNONYM_DICTIONARY: Record<string, string[]> = {
  'actions': ['action items', 'todo', 'todos', 'tasks', 'à faire', 'tâches', 'a faire', 'taches'],
  'notes': ['remarques', 'observations', 'comments', 'commentaires'],
  'summary': ['résumé', 'resume', 'recap', 'conclusion', 'synthèse', 'synthese', 'takeaways'],
  'objectives': ['goals', 'objectifs', 'targets', 'aims', 'buts'],
  'questions': ['q&a', 'qna', 'questions/réponses', 'questions/reponses', 'faq'],
  'resources': ['liens', 'links', 'références', 'references', 'sources', 'ressources'],
  'attendees': ['participants', 'présents', 'presents', 'people', 'membres', 'members'],
  'agenda': ['ordre du jour', 'program', 'programme', 'plan'],
  'decisions': ['décisions', 'actions décidées', 'actions decidees', 'resolutions'],
  'next steps': ['prochaines étapes', 'prochaines etapes', 'suite', 'follow-up', 'suivi', 'follow up'],
};

/**
 * Confidence scores for different match types
 */
const CONFIDENCE_SCORES = {
  EXACT: 100,
  NORMALIZED: 90,
  SYNONYM: 85,
  FUZZY_HIGH: 80,
  FUZZY_LOW: 70,
} as const;

/**
 * Levenshtein distance thresholds
 */
const LEVENSHTEIN_THRESHOLDS = {
  /** Maximum distance for high confidence fuzzy match */
  HIGH_CONFIDENCE: 2,
  /** Maximum distance for low confidence fuzzy match */
  LOW_CONFIDENCE: 3,
} as const;

/**
 * SmartMatchingEngine class for detecting similar sections across multiple pages
 * 
 * Features memoization for performance optimization (Req 11.2):
 * - Caches matching results based on page structure content
 * - Caches normalized text to avoid repeated normalization
 * - Cache invalidation based on TTL and content changes
 */
export class SmartMatchingEngine {
  /** Cache for matching results (Req 11.2) */
  private matchingCache: MatchingCacheEntry | null = null;
  
  /** Cache for normalized text to avoid repeated normalization */
  private normalizationCache: Map<string, string> = new Map();
  
  /** Maximum size for normalization cache */
  private static readonly MAX_NORMALIZATION_CACHE_SIZE = 1000;
  /**
   * Generates a cache key for page structures based on their content
   * Used for memoization of matching results (Req 11.2)
   * 
   * @param pageStructures - Map of page structures
   * @returns Cache key string
   */
  private generateCacheKey(pageStructures: Map<string, PageStructure>): string {
    const parts: string[] = [];
    
    // Sort by page ID for consistent key generation
    const sortedEntries = Array.from(pageStructures.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );
    
    for (const [pageId, structure] of sortedEntries) {
      // Include page ID, fetchedAt timestamp, and heading count
      // This ensures cache invalidation when structure changes
      const headingHash = structure.headings
        .map(h => `${h.id}:${h.text}:${h.level}`)
        .join('|');
      parts.push(`${pageId}:${structure.fetchedAt}:${headingHash}`);
    }
    
    return parts.join('||');
  }

  /**
   * Checks if the matching cache is valid
   * 
   * @param cacheKey - Current cache key
   * @returns True if cache is valid and can be used
   */
  private isCacheValid(cacheKey: string): boolean {
    if (!this.matchingCache) return false;
    
    // Check if cache key matches
    if (this.matchingCache.cacheKey !== cacheKey) return false;
    
    // Check if cache has expired
    if (Date.now() - this.matchingCache.cachedAt > MATCHING_CACHE_TTL_MS) return false;
    
    return true;
  }

  /**
   * Clears the matching cache
   * Useful when forcing a refresh of matching results
   */
  clearCache(): void {
    this.matchingCache = null;
    this.normalizationCache.clear();
  }

  /**
   * Normalizes heading text for comparison with memoization (Req 11.2)
   * 
   * Applies the following transformations:
   * 1. Convert to lowercase
   * 2. Remove punctuation characters
   * 3. Collapse multiple spaces into single spaces
   * 4. Trim leading and trailing whitespace
   * 5. Decompose and remove accents using Unicode NFD normalization
   * 6. Remove emoji characters
   * 
   * Results are cached to avoid repeated normalization of the same text.
   * 
   * @param text - The heading text to normalize
   * @returns Normalized text string
   * 
   * @example
   * normalizeHeadingText("  Résumé & Notes!  ") // returns "resume notes"
   * normalizeHeadingText("📝 Action Items") // returns "action items"
   */
  normalizeHeadingText(text: string): string {
    if (!text) return '';

    // Check normalization cache first (Req 11.2)
    const cached = this.normalizationCache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    let normalized = text;

    // 1. Convert to lowercase
    normalized = normalized.toLowerCase();

    // 2. Remove emoji characters (Unicode emoji ranges)
    // This regex covers most common emoji ranges
    normalized = normalized.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu,
      ''
    );

    // 3. Decompose and remove accents using Unicode NFD normalization
    // NFD decomposes characters like "é" into "e" + combining accent
    // Then we remove the combining diacritical marks
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 4. Remove punctuation characters (keep alphanumeric and spaces)
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');

    // 5. Collapse multiple spaces into single spaces
    normalized = normalized.replace(/\s+/g, ' ');

    // 6. Trim leading and trailing whitespace
    normalized = normalized.trim();

    // Cache the result (Req 11.2)
    // Limit cache size to prevent memory issues
    if (this.normalizationCache.size >= SmartMatchingEngine.MAX_NORMALIZATION_CACHE_SIZE) {
      // Clear oldest entries (simple strategy: clear half the cache)
      const entries = Array.from(this.normalizationCache.entries());
      this.normalizationCache = new Map(entries.slice(entries.length / 2));
    }
    this.normalizationCache.set(text, normalized);

    return normalized;
  }

  /**
   * Calculates the Levenshtein distance between two strings with early termination
   * 
   * The Levenshtein distance is the minimum number of single-character edits
   * (insertions, deletions, or substitutions) required to change one string into another.
   * 
   * Performance optimization (Req 11.2):
   * - Uses space-optimized single-row algorithm (O(n) space instead of O(m*n))
   * - Supports early termination when distance exceeds maxDistance
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @param maxDistance - Optional maximum distance threshold for early termination
   * @returns The Levenshtein distance (number of edits), or maxDistance+1 if exceeded
   * 
   * @example
   * calculateLevenshteinDistance("tasks", "task") // returns 1
   * calculateLevenshteinDistance("notes", "note") // returns 1
   */
  calculateLevenshteinDistance(str1: string, str2: string, maxDistance?: number): number {
    const m = str1.length;
    const n = str2.length;

    // Early termination: if length difference exceeds maxDistance, return early
    if (maxDistance !== undefined && Math.abs(m - n) > maxDistance) {
      return maxDistance + 1;
    }

    // Ensure str1 is the shorter string for space optimization
    if (m > n) {
      return this.calculateLevenshteinDistance(str2, str1, maxDistance);
    }

    // Space-optimized: use single row instead of full matrix
    let prevRow: number[] = Array(n + 1).fill(0);
    let currRow: number[] = Array(n + 1).fill(0);

    // Initialize first row
    for (let j = 0; j <= n; j++) {
      prevRow[j] = j;
    }

    // Fill in the matrix row by row
    for (let i = 1; i <= m; i++) {
      currRow[0] = i;
      let minInRow = currRow[0];

      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          currRow[j] = prevRow[j - 1];
        } else {
          currRow[j] = 1 + Math.min(
            prevRow[j],     // deletion
            currRow[j - 1], // insertion
            prevRow[j - 1]  // substitution
          );
        }
        minInRow = Math.min(minInRow, currRow[j]);
      }

      // Early termination: if minimum in row exceeds maxDistance, we can't do better
      if (maxDistance !== undefined && minInRow > maxDistance) {
        return maxDistance + 1;
      }

      // Swap rows
      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[n];
  }

  /**
   * Calculates similarity percentage between two strings based on Levenshtein distance
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity percentage (0-100)
   */
  calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 100;
    if (!str1 || !str2) return 0;

    const distance = this.calculateLevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return Math.round((1 - distance / maxLength) * 100);
  }

  /**
   * Finds the synonym group that contains the given word
   * 
   * @param word - The word to search for
   * @returns Array of synonyms if found, empty array otherwise
   */
  findSynonymGroup(word: string): string[] {
    const normalizedWord = this.normalizeHeadingText(word);
    
    // Check if word is a canonical term
    if (SYNONYM_DICTIONARY[normalizedWord]) {
      return [normalizedWord, ...SYNONYM_DICTIONARY[normalizedWord]];
    }

    // Check if word is in any synonym group
    for (const [canonical, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
      const normalizedSynonyms = synonyms.map(s => this.normalizeHeadingText(s));
      if (normalizedSynonyms.includes(normalizedWord)) {
        return [canonical, ...synonyms];
      }
    }

    return [];
  }

  /**
   * Checks if two words are synonyms
   * 
   * @param word1 - First word
   * @param word2 - Second word
   * @returns True if the words are synonyms
   */
  areSynonyms(word1: string, word2: string): boolean {
    const normalized1 = this.normalizeHeadingText(word1);
    const normalized2 = this.normalizeHeadingText(word2);

    if (normalized1 === normalized2) return true;

    const group1 = this.findSynonymGroup(normalized1);
    if (group1.length === 0) return false;

    const normalizedGroup = group1.map(s => this.normalizeHeadingText(s));
    return normalizedGroup.includes(normalized2);
  }

  /**
   * Finds matching sections across multiple pages using a three-tier algorithm
   * 
   * Algorithm:
   * 1. Exact match: identical normalized text AND same heading level (100% confidence)
   * 2. Normalized match: match after normalization, different original text (90% confidence)
   * 3. Fuzzy/Synonym match: Levenshtein distance 2-3 or synonym dictionary (70-85% confidence)
   * 
   * Performance optimization (Req 11.2):
   * - Results are memoized based on page structure content
   * - Cache is invalidated when page structures change or after TTL expires
   * - Target: <200ms for matching up to 10 pages
   * 
   * @param pageStructures - Map of page IDs to their structures
   * @returns Array of section matches sorted by confidence (descending)
   */
  findMatchingSections(pageStructures: Map<string, PageStructure>): SectionMatch[] {
    // Generate cache key based on page structure content (Req 11.2)
    const cacheKey = this.generateCacheKey(pageStructures);
    
    // Return cached results if valid (Req 11.2)
    if (this.isCacheValid(cacheKey)) {
      return this.matchingCache!.matches;
    }

    // Perform matching computation
    const matches = this.computeMatchingSections(pageStructures);
    
    // Cache the results (Req 11.2)
    this.matchingCache = {
      cacheKey,
      matches,
      cachedAt: Date.now(),
    };
    
    return matches;
  }

  /**
   * Internal method that performs the actual matching computation
   * Called by findMatchingSections when cache is invalid
   * 
   * @param pageStructures - Map of page IDs to their structures
   * @returns Array of section matches sorted by confidence (descending)
   */
  private computeMatchingSections(pageStructures: Map<string, PageStructure>): SectionMatch[] {
    const matches: SectionMatch[] = [];
    const processedGroups = new Set<string>();

    // Collect all headings with their page info
    const allHeadings: Array<{
      heading: PageHeading;
      pageId: string;
      pageTitle: string;
      normalizedText: string;
    }> = [];

    for (const [pageId, structure] of pageStructures) {
      for (const heading of structure.headings) {
        allHeadings.push({
          heading,
          pageId,
          pageTitle: structure.pageTitle,
          normalizedText: this.normalizeHeadingText(heading.text),
        });
      }
    }

    // Group headings by normalized text and level for exact/normalized matches
    const headingGroups = new Map<string, typeof allHeadings>();
    
    for (const item of allHeadings) {
      const key = `${item.normalizedText}|${item.heading.level}`;
      if (!headingGroups.has(key)) {
        headingGroups.set(key, []);
      }
      headingGroups.get(key)!.push(item);
    }

    // Process exact and normalized matches
    for (const [key, group] of headingGroups) {
      if (group.length < 2) continue; // Need at least 2 pages for a match
      
      // Check if all pages are unique (no duplicate pages in group)
      const uniquePages = new Set(group.map(g => g.pageId));
      if (uniquePages.size < 2) continue;

      processedGroups.add(key);

      // Determine match type: exact if all original texts are identical, normalized otherwise
      const originalTexts = new Set(group.map(g => g.heading.text));
      const matchType: MatchType = originalTexts.size === 1 ? 'exact' : 'normalized';
      const confidence = matchType === 'exact' ? CONFIDENCE_SCORES.EXACT : CONFIDENCE_SCORES.NORMALIZED;

      const matchedPages: MatchedPage[] = group.map(g => ({
        pageId: g.pageId,
        pageTitle: g.pageTitle,
        blockId: g.heading.id,
        originalText: g.heading.text,
      }));

      // Use the first heading's text as the representative
      const representativeHeading = group[0];

      matches.push({
        headingText: representativeHeading.heading.text,
        headingLevel: representativeHeading.heading.level,
        normalizedText: representativeHeading.normalizedText,
        confidence,
        matchType,
        matchedPages,
        totalPagesCount: pageStructures.size,
        matchedPagesCount: uniquePages.size,
      });
    }

    // Process fuzzy and synonym matches with optimizations (Req 11.2)
    // Performance optimization: Group by heading level first to reduce comparisons
    const headingsByLevel = new Map<number, typeof allHeadings>();
    for (const item of allHeadings) {
      const level = item.heading.level;
      if (!headingsByLevel.has(level)) {
        headingsByLevel.set(level, []);
      }
      headingsByLevel.get(level)!.push(item);
    }

    const processedPairs = new Set<string>();

    // Only compare headings with the same level (Req 5.7)
    for (const [level, levelHeadings] of headingsByLevel) {
      // Skip if only one heading at this level
      if (levelHeadings.length < 2) continue;

      // Performance optimization: Pre-compute synonym groups for all headings at this level
      const synonymGroupCache = new Map<string, string[]>();
      for (const item of levelHeadings) {
        if (!synonymGroupCache.has(item.normalizedText)) {
          synonymGroupCache.set(item.normalizedText, this.findSynonymGroup(item.normalizedText));
        }
      }

      for (let i = 0; i < levelHeadings.length; i++) {
        const h1 = levelHeadings[i];

        // Performance optimization: Skip if already processed as exact/normalized match
        const key1 = `${h1.normalizedText}|${h1.heading.level}`;
        if (processedGroups.has(key1)) continue;

        for (let j = i + 1; j < levelHeadings.length; j++) {
          const h2 = levelHeadings[j];

          // Skip if same page
          if (h1.pageId === h2.pageId) continue;

          // Skip if already processed as exact/normalized match
          const key2 = `${h2.normalizedText}|${h2.heading.level}`;
          if (processedGroups.has(key2) && h1.normalizedText === h2.normalizedText) continue;

          // Create a unique pair key
          const pairKey = [h1.pageId, h1.heading.id, h2.pageId, h2.heading.id].sort().join('|');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // Performance optimization: Early length check for fuzzy matching
          // If strings differ by more than LEVENSHTEIN_THRESHOLDS.LOW_CONFIDENCE in length,
          // they cannot possibly match within the threshold
          const lengthDiff = Math.abs(h1.normalizedText.length - h2.normalizedText.length);
          if (lengthDiff > LEVENSHTEIN_THRESHOLDS.LOW_CONFIDENCE) {
            // Still check for synonym match (synonyms can have different lengths)
            const group1 = synonymGroupCache.get(h1.normalizedText) || [];
            if (group1.length > 0) {
              const normalizedGroup = group1.map(s => this.normalizeHeadingText(s));
              if (normalizedGroup.includes(h2.normalizedText)) {
                this.addOrMergeFuzzyMatch(
                  matches,
                  h1,
                  h2,
                  CONFIDENCE_SCORES.SYNONYM,
                  'synonym',
                  pageStructures.size
                );
              }
            }
            continue;
          }

          // Check for synonym match using cached groups
          const group1 = synonymGroupCache.get(h1.normalizedText) || [];
          if (group1.length > 0) {
            const normalizedGroup = group1.map(s => this.normalizeHeadingText(s));
            if (normalizedGroup.includes(h2.normalizedText)) {
              this.addOrMergeFuzzyMatch(
                matches,
                h1,
                h2,
                CONFIDENCE_SCORES.SYNONYM,
                'synonym',
                pageStructures.size
              );
              continue;
            }
          }

          // Check for fuzzy match using Levenshtein distance with early termination
          // Pass maxDistance to enable early termination optimization (Req 11.2)
          const distance = this.calculateLevenshteinDistance(
            h1.normalizedText, 
            h2.normalizedText, 
            LEVENSHTEIN_THRESHOLDS.LOW_CONFIDENCE
          );
          
          if (distance <= LEVENSHTEIN_THRESHOLDS.HIGH_CONFIDENCE) {
            this.addOrMergeFuzzyMatch(
              matches,
              h1,
              h2,
              CONFIDENCE_SCORES.FUZZY_HIGH,
              'fuzzy',
              pageStructures.size
            );
          } else if (distance <= LEVENSHTEIN_THRESHOLDS.LOW_CONFIDENCE) {
            this.addOrMergeFuzzyMatch(
              matches,
              h1,
              h2,
              CONFIDENCE_SCORES.FUZZY_LOW,
              'fuzzy',
              pageStructures.size
            );
          }
        }
      }
    }

    // Sort by confidence (descending), then by matched pages count (descending)
    return matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.matchedPagesCount - a.matchedPagesCount;
    });
  }

  /**
   * Helper method to add or merge a fuzzy/synonym match
   */
  private addOrMergeFuzzyMatch(
    matches: SectionMatch[],
    h1: { heading: PageHeading; pageId: string; pageTitle: string; normalizedText: string },
    h2: { heading: PageHeading; pageId: string; pageTitle: string; normalizedText: string },
    confidence: number,
    matchType: MatchType,
    totalPagesCount: number
  ): void {
    // Check if we can merge with an existing match
    const existingMatch = matches.find(
      m => m.matchType === matchType &&
           m.headingLevel === h1.heading.level &&
           (m.normalizedText === h1.normalizedText || m.normalizedText === h2.normalizedText)
    );

    if (existingMatch) {
      // Merge into existing match
      const existingPageIds = new Set(existingMatch.matchedPages.map(p => p.pageId));
      
      if (!existingPageIds.has(h1.pageId)) {
        existingMatch.matchedPages.push({
          pageId: h1.pageId,
          pageTitle: h1.pageTitle,
          blockId: h1.heading.id,
          originalText: h1.heading.text,
        });
      }
      
      if (!existingPageIds.has(h2.pageId)) {
        existingMatch.matchedPages.push({
          pageId: h2.pageId,
          pageTitle: h2.pageTitle,
          blockId: h2.heading.id,
          originalText: h2.heading.text,
        });
      }
      
      existingMatch.matchedPagesCount = new Set(existingMatch.matchedPages.map(p => p.pageId)).size;
    } else {
      // Create new match
      matches.push({
        headingText: h1.heading.text,
        headingLevel: h1.heading.level,
        normalizedText: h1.normalizedText,
        confidence,
        matchType,
        matchedPages: [
          {
            pageId: h1.pageId,
            pageTitle: h1.pageTitle,
            blockId: h1.heading.id,
            originalText: h1.heading.text,
          },
          {
            pageId: h2.pageId,
            pageTitle: h2.pageTitle,
            blockId: h2.heading.id,
            originalText: h2.heading.text,
          },
        ],
        totalPagesCount,
        matchedPagesCount: 2,
      });
    }
  }
}

// Export singleton instance for convenience
export const smartMatchingEngine = new SmartMatchingEngine();
