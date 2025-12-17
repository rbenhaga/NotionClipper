# Design Document: TOC Multi-Select with Smart Matching

## Overview

This design document describes the architecture and implementation of an advanced Table of Contents (TOC) system for multi-page section selection in Clipper Pro. The system enables users to select specific sections across multiple Notion pages simultaneously, with intelligent matching capabilities to detect similar sections and apply bulk actions.

The feature addresses the need for power users who frequently clip content to multiple pages with similar structures (e.g., meeting notes, project documentation) and want to insert content into the same logical section across all pages efficiently.

### Key Capabilities

- **Tab-based Navigation**: One tab per selected page for independent section configuration
- **Smart Section Matching**: AI-powered detection of similar sections across pages using exact, normalized, and fuzzy matching
- **Bulk Actions**: Smart Fill, Select All End, and Reset for efficient multi-page workflows
- **Visual Feedback**: Real-time badges, progress indicators, and selection summaries
- **Accessibility**: Full keyboard navigation and screen reader support

## Architecture

The TOC Multi-Select system follows the existing Clipper Pro hexagonal architecture, with clear separation between UI components, business logic, and external adapters.

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (packages/ui)                    │
├─────────────────────────────────────────────────────────────────┤
│  MultiPageTOCManager                                             │
│  ├── TabBar (page tabs with badges)                             │
│  ├── SectionList (headings for active tab)                      │
│  ├── SmartSuggestionsPanel (matched sections)                   │
│  ├── SmartFillModal (bulk selection UI)                         │
│  ├── BulkActionsToolbar (Smart Fill, Reset, Select All)         │
│  └── InsertionPreview (summary of selections)                   │
├─────────────────────────────────────────────────────────────────┤
│                    Business Logic (packages/core-shared)         │
├─────────────────────────────────────────────────────────────────┤
│  SmartMatchingEngine                                             │
│  ├── normalizeHeadingText()                                     │
│  ├── findExactMatches()                                         │
│  ├── findFuzzyMatches()                                         │
│  ├── calculateLevenshteinDistance()                             │
│  └── SYNONYM_DICTIONARY                                         │
│                                                                  │
│  TOCStateManager                                                 │
│  ├── selections: Map<pageId, SectionSelection>                  │
│  ├── smartMatches: SectionMatch[]                               │
│  └── presets: TOCPreset[]                                       │
├─────────────────────────────────────────────────────────────────┤
│                    Adapters (packages/adapters)                  │
├─────────────────────────────────────────────────────────────────┤
│  NotionAdapter                                                   │
│  ├── fetchPageStructure(pageId) → PageStructure                 │
│  ├── validateBlockExists(blockId) → boolean                     │
│  └── insertContent(pageId, content, afterBlockId)               │
│                                                                  │
│  StorageAdapter (electron-store)                                 │
│  ├── savePreset(preset)                                         │
│  ├── loadPresets() → TOCPreset[]                                │
│  └── exportConfig() / importConfig()                            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
EnhancedContentEditor
└── MultiPageTOCManager
    ├── Header (title, selection count)
    ├── TabBar
    │   └── PageTab[] (with selection badges)
    ├── SectionList
    │   ├── SectionItem[] (selectable headings)
    │   └── EndOfPageOption
    ├── SmartSuggestionsPanel
    │   └── MatchedSectionCard[]
    ├── BulkActionsToolbar
    │   ├── SmartFillButton
    │   ├── SelectAllEndButton
    │   └── ResetButton
    ├── InsertionPreview
    │   └── PageInsertionSummary[]
    └── SmartFillModal (portal)
        ├── MatchList
        ├── InsertionModeSelector
        ├── PreviewPanel
        └── ActionButtons
```

### Data Flow

```
User Action (select section in tab 2)
    ↓
MultiPageTOCManager.handleSectionSelect(pageId, blockId, headingText)
    ↓
TOCStateManager.setSelection(pageId, selection)
    ↓
State Update: tocSelections Map updated
    ↓
SmartMatchingEngine.refreshMatches() (if needed)
    ↓
UI Updates:
  - TabBar: Tab badge shows "✓"
  - SmartSuggestionsPanel: Refresh suggestions
  - InsertionPreview: Update summary
    ↓
User clicks Send
    ↓
EnhancedContentEditor.handleSendWithMultiSections()
    ↓
For each page in tocSelections:
  - Validate blockId exists (REQ-13)
  - Call NotionAdapter.insertContent(pageId, content, afterBlockId)
  - Wait 350ms (rate limiting)
  - Track progress
    ↓
Show summary notification
```

## Components and Interfaces

### MultiPageTOCManager

Main container component that orchestrates the multi-page TOC functionality.

```typescript
interface MultiPageTOCManagerProps {
  selectedPages: PageInfo[];
  pageStructures: Map<string, PageStructure>;
  loading: boolean;
  tocState: MultiPageTOCState;
  onSectionSelect: (pageId: string, blockId: string | null, headingText: string | null) => void;
  onBulkAction: (action: 'smart-fill' | 'all-end' | 'reset') => void;
  onTocStateChange: (state: MultiPageTOCState) => void;
  mode: 'sidebar' | 'floating';
  className?: string;
}
```

### TabBar

Horizontal tab navigation for switching between pages.

```typescript
interface TabBarProps {
  pages: PageInfo[];
  activePageId: string;
  onTabChange: (pageId: string) => void;
  selections: Map<string, PageSectionSelection>;
  maxVisibleTabs?: number; // Default: 5
}
```

### SectionList

Displays the heading structure of the active page with selectable items.

```typescript
interface SectionListProps {
  pageStructure: PageStructure | null;
  selectedBlockId: string | null;
  onSelect: (blockId: string | null, headingText: string | null, level: number | null) => void;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
}
```

### SmartMatchingEngine

Core business logic for detecting similar sections across pages.

```typescript
interface SmartMatchingEngine {
  findMatchingSections(pageStructures: Map<string, PageStructure>): SectionMatch[];
  normalizeHeadingText(text: string): string;
  calculateSimilarity(str1: string, str2: string): number;
  findSynonymGroup(word: string): string[];
}
```

### SmartFillModal

Modal dialog for reviewing and applying smart fill selections.

```typescript
interface SmartFillModalProps {
  matches: SectionMatch[];
  onApply: (selectedMatches: SectionMatch[], insertionMode: InsertionMode) => void;
  onClose: () => void;
}

type InsertionMode = 'end-of-section' | 'start-of-section' | 'replace';
```

## Data Models

### Core Types

```typescript
// Page information
interface PageInfo {
  id: string;
  title: string;
  icon?: string;
}

// Heading extracted from a page
interface PageHeading {
  id: string;           // Block ID from Notion
  text: string;         // Original heading text
  level: 1 | 2 | 3;     // H1, H2, H3
  position: number;     // Index in page
  children?: PageHeading[]; // Nested headings (optional)
}

// Complete page structure
interface PageStructure {
  pageId: string;
  pageTitle: string;
  headings: PageHeading[];
  totalBlocks: number;
  fetchedAt: number;    // Timestamp for cache invalidation
}

// Selection state for a single page
interface PageSectionSelection {
  pageId: string;
  pageTitle: string;
  blockId: string | null;      // null = end of page
  headingText: string | null;  // null = end of page
  headingLevel: 1 | 2 | 3 | null;
  confidence: number;          // 0-100 for smart matching
}

// Smart matching result
interface SectionMatch {
  headingText: string;
  headingLevel: 1 | 2 | 3;
  normalizedText: string;
  confidence: number;          // 0-100
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'synonym';
  matchedPages: MatchedPage[];
  totalPagesCount: number;
  matchedPagesCount: number;
}

interface MatchedPage {
  pageId: string;
  pageTitle: string;
  blockId: string;
  originalText: string;        // Before normalization
}

// Global TOC state
interface MultiPageTOCState {
  selections: Map<string, PageSectionSelection>;
  activeTabPageId: string;
  smartMatches: SectionMatch[];
  mode: 'manual' | 'smart-fill' | 'all-same';
  isExpanded: boolean;
  insertionMode: InsertionMode;
}

// Insertion target for Notion API
interface InsertionTarget {
  pageId: string;
  pageTitle: string;
  blockId: string | null;
  position: 'after' | 'end';
}

// Insertion result
interface InsertionResult {
  pageId: string;
  pageTitle: string;
  status: 'success' | 'error' | 'fallback';
  blockId?: string;
  error?: string;
  usedFallback?: boolean;
}

// TOC Preset for saving configurations
interface TOCPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pageSelections: Array<{
    pageId: string;
    pageTitle: string;
    blockId: string | null;
    headingText: string | null;
  }>;
}

// Export/Import configuration
interface TOCExportConfig {
  version: string;
  exportedAt: number;
  selections: PageSectionSelection[];
  customSynonyms?: Record<string, string[]>;
}
```

### Synonym Dictionary

```typescript
const SYNONYM_DICTIONARY: Record<string, string[]> = {
  'actions': ['action items', 'todo', 'todos', 'tasks', 'à faire', 'tâches'],
  'notes': ['remarques', 'observations', 'comments', 'commentaires'],
  'summary': ['résumé', 'recap', 'conclusion', 'synthèse', 'takeaways'],
  'objectives': ['goals', 'objectifs', 'targets', 'aims', 'buts'],
  'questions': ['q&a', 'qna', 'questions/réponses', 'faq'],
  'resources': ['liens', 'links', 'références', 'sources', 'ressources'],
  'attendees': ['participants', 'présents', 'people', 'membres'],
  'agenda': ['ordre du jour', 'program', 'programme', 'plan'],
  'decisions': ['décisions', 'actions décidées', 'resolutions'],
  'next steps': ['prochaines étapes', 'suite', 'follow-up', 'suivi']
};
```

### State Management

```typescript
// React state hook for TOC management
function useTOCState(selectedPages: PageInfo[]) {
  const [tocState, setTocState] = useState<MultiPageTOCState>({
    selections: new Map(),
    activeTabPageId: selectedPages[0]?.id || '',
    smartMatches: [],
    mode: 'manual',
    isExpanded: true,
    insertionMode: 'end-of-section'
  });

  const selectSection = useCallback((pageId: string, selection: PageSectionSelection) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      newSelections.set(pageId, selection);
      return { ...prev, selections: newSelections };
    });
  }, []);

  const clearSelection = useCallback((pageId: string) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      newSelections.delete(pageId);
      return { ...prev, selections: newSelections };
    });
  }, []);

  const resetAllSelections = useCallback(() => {
    setTocState(prev => ({
      ...prev,
      selections: new Map(),
      mode: 'manual'
    }));
  }, []);

  const applySmartFill = useCallback((matches: SectionMatch[]) => {
    setTocState(prev => {
      const newSelections = new Map(prev.selections);
      matches.forEach(match => {
        match.matchedPages.forEach(page => {
          newSelections.set(page.pageId, {
            pageId: page.pageId,
            pageTitle: page.pageTitle,
            blockId: page.blockId,
            headingText: match.headingText,
            headingLevel: match.headingLevel,
            confidence: match.confidence
          });
        });
      });
      return { ...prev, selections: newSelections, mode: 'smart-fill' };
    });
  }, []);

  return {
    tocState,
    setTocState,
    selectSection,
    clearSelection,
    resetAllSelections,
    applySmartFill
  };
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the acceptance criteria analysis, the following correctness properties must be verified through property-based testing:

### Property 1: Tab Count Matches Page Count
*For any* array of selected pages with length >= 2, the rendered TabBar SHALL contain exactly the same number of tabs as pages in the array.
**Validates: Requirements 1.1**

### Property 2: Badge State Reflects Selection State
*For any* page in the selections Map, if the page has a non-null blockId, the corresponding tab SHALL display a checkmark badge; otherwise, it SHALL display an empty circle indicator.
**Validates: Requirements 1.3, 1.4**

### Property 3: Selection Data Completeness
*For any* section selection operation, the resulting PageSectionSelection object SHALL contain all required fields: pageId, pageTitle, blockId, headingText, and headingLevel.
**Validates: Requirements 2.2**

### Property 4: Selection Count Synchronization
*For any* sequence of selection operations (add, remove, update), the displayed selection count SHALL equal the size of the selections Map.
**Validates: Requirements 2.4**

### Property 5: Exact Matching Confidence
*For any* two or more pages with headings that have identical normalized text and identical heading level, the Smart Matching Engine SHALL produce a SectionMatch with confidence = 100 and matchType = 'exact'.
**Validates: Requirements 4.2**

### Property 6: Normalized Matching Confidence
*For any* two or more pages with headings that match after normalization (but differ in original text), the Smart Matching Engine SHALL produce a SectionMatch with confidence = 90 and matchType = 'normalized'.
**Validates: Requirements 4.3**

### Property 7: Fuzzy Matching Confidence Range
*For any* two headings with Levenshtein distance between 2-3 characters or matching a synonym group, the Smart Matching Engine SHALL produce a SectionMatch with confidence between 70-85 and matchType = 'fuzzy' or 'synonym'.
**Validates: Requirements 4.4**

### Property 8: Heading Level Constraint
*For any* two headings being compared, the Smart Matching Engine SHALL only create a match if both headings have the same heading level (1, 2, or 3).
**Validates: Requirements 5.7**

### Property 9: Text Normalization Idempotence
*For any* heading text string, applying normalizeHeadingText twice SHALL produce the same result as applying it once: normalizeHeadingText(normalizeHeadingText(text)) === normalizeHeadingText(text).
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 10: Synonym Matching Confidence
*For any* heading that matches a word in the SYNONYM_DICTIONARY, the Smart Matching Engine SHALL assign confidence = 85 and matchType = 'synonym'.
**Validates: Requirements 6.2**

### Property 11: Levenshtein Similarity Threshold
*For any* two strings with calculateSimilarity() returning > 80, the Smart Matching Engine SHALL consider them as potential matches.
**Validates: Requirements 6.5**

### Property 12: Select All End Action
*For any* set of selected pages, after executing the "Select All → End of Page" action, every page in the selections Map SHALL have blockId = null and headingText = null.
**Validates: Requirements 7.1**

### Property 13: Reset Action Clears All
*For any* non-empty selections Map, after executing the "Reset" action, the selections Map SHALL be empty (size = 0).
**Validates: Requirements 7.3**

### Property 14: Insertion Target Correctness
*For any* page with a section selection, the InsertionTarget SHALL have blockId equal to the selection's blockId; for pages without selection, blockId SHALL be null.
**Validates: Requirements 9.2, 9.3**

### Property 15: Insertion Error Resilience
*For any* sequence of page insertions where one or more fail, the system SHALL continue processing remaining pages and the final InsertionResult array SHALL contain entries for all pages.
**Validates: Requirements 9.5**

### Property 16: Rate Limiting Compliance
*For any* multi-page insertion operation, the time between consecutive Notion API calls SHALL be at least 350ms.
**Validates: Requirements 9.6**

### Property 17: Invalid Block Fallback
*For any* page where the selected blockId no longer exists (validation fails), the insertion SHALL fallback to end-of-page (blockId = null) and the result SHALL have usedFallback = true.
**Validates: Requirements 13.3**

### Property 18: Preset Save/Load Round-Trip
*For any* valid TOCPreset object, saving it to storage and then loading it back SHALL produce an equivalent object with matching name, pageSelections, and all selection data.
**Validates: Requirements 14.1, 14.2, 14.3**

### Property 19: Config Export/Import Round-Trip
*For any* valid TOCExportConfig object, exporting to JSON and then importing SHALL produce an equivalent configuration with matching selections and customSynonyms.
**Validates: Requirements 15.1, 15.2, 15.3**

## Error Handling

### API Errors

| Error Type | Handling Strategy | User Feedback |
|------------|-------------------|---------------|
| Notion API timeout | Retry with exponential backoff (3 attempts) | "Connection slow, retrying..." |
| Notion API rate limit | Queue requests with 350ms delay | Progress bar continues |
| Block not found | Fallback to end-of-page insertion | Warning in summary |
| Page access denied | Skip page, continue with others | Error in summary modal |
| Network offline | Cache stale data, disable send | "Offline - cached data shown" |

### Validation Errors

| Error Type | Handling Strategy | User Feedback |
|------------|-------------------|---------------|
| Invalid block ID | Pre-send validation, offer fallback | Confirmation dialog |
| Empty page structure | Show "No sections" message | Informational message |
| Preset not found | Skip preset application | Toast notification |
| Import version mismatch | Reject import | Error with version info |

### State Recovery

```typescript
// Error boundary for TOC component
class TOCErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('TOC Error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">TOC encountered an error</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property-based tests**: Verify universal properties that should hold across all inputs

### Property-Based Testing Framework

**Framework**: [fast-check](https://github.com/dubzzz/fast-check) for TypeScript/JavaScript

**Configuration**: Each property test runs a minimum of 100 iterations.

### Property Test Implementation Plan

```typescript
import fc from 'fast-check';

// Arbitrary generators for test data
const pageInfoArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 })
});

const headingLevelArb = fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>;

const pageHeadingArb = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  level: headingLevelArb,
  position: fc.nat()
});

const pageStructureArb = fc.record({
  pageId: fc.uuid(),
  pageTitle: fc.string({ minLength: 1, maxLength: 100 }),
  headings: fc.array(pageHeadingArb, { minLength: 0, maxLength: 50 }),
  totalBlocks: fc.nat(),
  fetchedAt: fc.nat()
});

const pageSectionSelectionArb = fc.record({
  pageId: fc.uuid(),
  pageTitle: fc.string({ minLength: 1, maxLength: 100 }),
  blockId: fc.option(fc.uuid(), { nil: null }),
  headingText: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  headingLevel: fc.option(headingLevelArb, { nil: null }),
  confidence: fc.integer({ min: 0, max: 100 })
});
```

### Unit Test Coverage

| Component | Test Focus | Priority |
|-----------|------------|----------|
| SmartMatchingEngine | Normalization, matching algorithms | High |
| TabBar | Rendering, badge states, overflow | High |
| SectionList | Selection, highlighting, virtualization | High |
| SmartFillModal | Checkbox states, apply logic | Medium |
| BulkActionsToolbar | Action handlers | Medium |
| TOCStateManager | State transitions | High |
| Preset management | CRUD operations | Medium |
| Export/Import | Serialization round-trip | Medium |

### Integration Test Scenarios

1. **Multi-page selection flow**: Select 3 pages → configure sections → send → verify insertions
2. **Smart Fill flow**: Load pages with common sections → Smart Fill → verify selections
3. **Error recovery flow**: Simulate API failure → verify fallback → verify summary
4. **Preset workflow**: Create preset → reload app → apply preset → verify selections

### Test File Structure

```
packages/ui/src/components/editor/
├── MultiPageTOCManager.tsx
├── MultiPageTOCManager.test.tsx        # Unit tests
├── MultiPageTOCManager.property.test.tsx # Property tests
├── TabBar.tsx
├── TabBar.test.tsx
├── SectionList.tsx
├── SectionList.test.tsx
└── SmartFillModal.tsx
    └── SmartFillModal.test.tsx

packages/core-shared/src/services/
├── SmartMatchingEngine.ts
├── SmartMatchingEngine.test.ts         # Unit tests
├── SmartMatchingEngine.property.test.ts # Property tests
├── TOCStateManager.ts
└── TOCStateManager.test.ts
```

### Test Annotations

All property-based tests must include the following annotation format:

```typescript
/**
 * **Feature: toc-multi-select, Property 5: Exact Matching Confidence**
 * **Validates: Requirements 4.2**
 */
test('exact matching produces 100% confidence', () => {
  fc.assert(
    fc.property(/* ... */),
    { numRuns: 100 }
  );
});
```
