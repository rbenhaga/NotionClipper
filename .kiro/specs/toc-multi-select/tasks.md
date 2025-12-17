# Implementation Plan

## Phase 1: Core Data Types and Smart Matching Engine

- [x] 1. Create core TypeScript types and interfaces





  - [x] 1.1 Create TOC types file with PageInfo, PageHeading, PageStructure, PageSectionSelection, SectionMatch interfaces


    - Create `packages/core-shared/src/types/toc.types.ts`
    - Export all types from core-shared index
    - _Requirements: 2.2, 3.2, 4.2_
  - [ ]* 1.2 Write property test for Selection Data Completeness
    - **Property 3: Selection Data Completeness**
    - **Validates: Requirements 2.2**
  - [x] 1.3 Create MultiPageTOCState interface and InsertionTarget, InsertionResult types


    - Add to `packages/core-shared/src/types/toc.types.ts`
    - _Requirements: 9.2, 9.3_

- [x] 2. Implement SmartMatchingEngine service





  - [x] 2.1 Create SmartMatchingEngine class with normalizeHeadingText method


    - Create `packages/core-shared/src/services/SmartMatchingEngine.ts`
    - Implement lowercase, trim, punctuation removal, accent removal, emoji removal
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]* 2.2 Write property test for Text Normalization Idempotence
    - **Property 9: Text Normalization Idempotence**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
  - [x] 2.3 Implement calculateLevenshteinDistance method


    - Add to SmartMatchingEngine
    - _Requirements: 6.4_
  - [ ]* 2.4 Write property test for Levenshtein Similarity Threshold
    - **Property 11: Levenshtein Similarity Threshold**
    - **Validates: Requirements 6.5**
  - [x] 2.5 Create SYNONYM_DICTIONARY constant with bilingual variations


    - Add to SmartMatchingEngine
    - Include: actions/tasks, notes/remarques, summary/résumé, etc.
    - _Requirements: 6.1, 6.6_

  - [x] 2.6 Implement findMatchingSections method with three-tier algorithm

    - Exact match (100% confidence)
    - Normalized match (90% confidence)
    - Fuzzy/Synonym match (70-85% confidence)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 2.7 Write property test for Exact Matching Confidence
    - **Property 5: Exact Matching Confidence**
    - **Validates: Requirements 4.2**
  - [ ]* 2.8 Write property test for Normalized Matching Confidence
    - **Property 6: Normalized Matching Confidence**
    - **Validates: Requirements 4.3**
  - [ ]* 2.9 Write property test for Fuzzy Matching Confidence Range
    - **Property 7: Fuzzy Matching Confidence Range**
    - **Validates: Requirements 4.4**
  - [ ]* 2.10 Write property test for Heading Level Constraint
    - **Property 8: Heading Level Constraint**
    - **Validates: Requirements 5.7**
  - [ ]* 2.11 Write property test for Synonym Matching Confidence
    - **Property 10: Synonym Matching Confidence**
    - **Validates: Requirements 6.2**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: State Management

- [x] 4. Implement TOC State Manager




  - [x] 4.1 Create useTOCState custom hook


    - Create `packages/ui/src/hooks/useTOCState.ts`
    - Implement selections Map, activeTabPageId, smartMatches state
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 4.2 Implement selectSection, clearSelection, resetAllSelections functions


    - Add to useTOCState hook
    - _Requirements: 2.1, 7.3_
  - [ ]* 4.3 Write property test for Reset Action Clears All
    - **Property 13: Reset Action Clears All**
    - **Validates: Requirements 7.3**
  - [x] 4.4 Implement applySmartFill function


    - Add to useTOCState hook
    - _Requirements: 7.2, 8.4_
  - [x] 4.5 Implement selectAllEndOfPage function


    - Add to useTOCState hook
    - _Requirements: 7.1_
  - [ ]* 4.6 Write property test for Select All End Action
    - **Property 12: Select All End Action**
    - **Validates: Requirements 7.1**
  - [ ]* 4.7 Write property test for Selection Count Synchronization
    - **Property 4: Selection Count Synchronization**
    - **Validates: Requirements 2.4**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: UI Components - Tab Navigation

- [x] 6. Create TabBar component





  - [x] 6.1 Create TabBar component with page tabs


    - Create `packages/ui/src/components/editor/toc/TabBar.tsx`
    - Render one tab per page with title truncation
    - _Requirements: 1.1, 1.2_
  - [ ]* 6.2 Write property test for Tab Count Matches Page Count
    - **Property 1: Tab Count Matches Page Count**
    - **Validates: Requirements 1.1**
  - [x] 6.3 Add selection badge indicators (checkmark/circle)


    - Show checkmark for pages with selection, circle for others
    - _Requirements: 1.3, 1.4_
  - [ ]* 6.4 Write property test for Badge State Reflects Selection State
    - **Property 2: Badge State Reflects Selection State**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 6.5 Implement horizontal scrolling with "+N" counter for overflow


    - Show max 5 visible tabs, scroll for more
    - _Requirements: 1.5_
  - [x] 6.6 Add tooltip on tab hover showing page title and selected section


    - _Requirements: 1.6, 10.3_
  - [x] 6.7 Implement keyboard navigation (Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1-9)


    - _Requirements: 1.7, 1.8, 1.9, 12.4_

- [x] 7. Create SectionList component



  - [x] 7.1 Create SectionList component with heading items

    - Create `packages/ui/src/components/editor/toc/SectionList.tsx`
    - Display headings with hierarchical indentation
    - _Requirements: 3.2, 3.3_
  - [x] 7.2 Add "End of Page" option at bottom of list

    - _Requirements: 2.3_

  - [x] 7.3 Implement selection highlighting and click handling
    - _Requirements: 2.1, 2.5_
  - [x] 7.4 Add skeleton loading state

    - _Requirements: 3.5_
  - [x] 7.5 Add "No sections found" empty state

    - _Requirements: 3.4_

  - [x] 7.6 Add error state with retry button
    - _Requirements: 3.7_
  - [x] 7.7 Implement virtualization for lists with >50 headings


    - Use react-window FixedSizeList
    - _Requirements: 3.8_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: UI Components - Smart Matching

- [x] 9. Create SmartSuggestionsPanel component





  - [x] 9.1 Create SmartSuggestionsPanel component


    - Create `packages/ui/src/components/editor/toc/SmartSuggestionsPanel.tsx`
    - Display matched sections with count and confidence
    - _Requirements: 4.5_


  - [x] 9.2 Add confidence indicator badges (exact/fuzzy/warning)
    - Green for exact, yellow for fuzzy, warning icon for <80%

    - _Requirements: 4.7, 6.3_
  - [x] 9.3 Add "Apply" button for each matched section

    - _Requirements: 4.6_
-

- [x] 10. Create SmartFillModal component




  - [x] 10.1 Create SmartFillModal component structure


    - Create `packages/ui/src/components/editor/toc/SmartFillModal.tsx`
    - Modal with header, content, footer
    - _Requirements: 8.1_
  - [x] 10.2 Implement match list with checkboxes

    - Pre-check matches with confidence >80%
    - _Requirements: 8.1, 8.2_
  - [x] 10.3 Add page list for each match

    - Show which pages contain each section
    - _Requirements: 8.3_
  - [x] 10.4 Add warning icon for low confidence matches

    - _Requirements: 8.6_

  - [x] 10.5 Implement insertion mode selector (end/start/replace)

    - _Requirements: 8.5_
  - [x] 10.6 Add dynamic preview panel

    - Show affected pages based on current selection

    - _Requirements: 8.8_
  - [x] 10.7 Add Select All / Deselect All buttons
    - _Requirements: 8.9, 8.10_
  - [x] 10.8 Implement Apply and Cancel actions
    - _Requirements: 8.4_

- [x] 11. Create BulkActionsToolbar component



  - [x] 11.1 Create BulkActionsToolbar component


    - Create `packages/ui/src/components/editor/toc/BulkActionsToolbar.tsx`
    - Smart Fill, Select All End, Reset buttons
    - _Requirements: 7.1, 7.2, 7.3_


  - [x] 11.2 Implement disabled state for Reset when no selections

    - _Requirements: 7.5_
  - [x] 11.3 Wire up bulk action handlers


    - _Requirements: 7.4_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Main Container and Integration
-

- [x] 13. Create MultiPageTOCManager component




  - [x] 13.1 Create MultiPageTOCManager container component


    - Create `packages/ui/src/components/editor/toc/MultiPageTOCManager.tsx`
    - Compose TabBar, SectionList, SmartSuggestionsPanel, BulkActionsToolbar
    - _Requirements: 1.1, 10.4_

  - [x] 13.2 Add header with title and selection count

    - _Requirements: 10.1_

  - [x] 13.3 Add InsertionPreview summary component

    - Show configured vs total pages
    - _Requirements: 10.5_


  - [x] 13.4 Implement page structure fetching with caching

    - 5 minute cache TTL
    - _Requirements: 3.1, 3.6_

  - [x] 13.5 Wire up smart matching on structure load

    - Call SmartMatchingEngine.findMatchingSections
    - _Requirements: 4.1_

  - [x] 13.6 Add Framer Motion animations for selection changes

    - _Requirements: 10.2_

- [x] 14. Integrate with EnhancedContentEditor

  - [x] 14.1 Add MultiPageTOCManager to EnhancedContentEditor
    - Show when selectedPages.length > 1
    - _Requirements: 1.1_

  - [x] 14.2 Pass tocState and handlers to MultiPageTOCManager
    - _Requirements: 2.1, 2.4_

  - [x] 14.3 Update existing single-page TOC to coexist with multi-page


    - Show FloatingTOC when selectedPages.length === 1
    - Show MultiPageTOCManager when selectedPages.length > 1
    - _Requirements: 1.1_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Multi-Page Insertion
-

- [x] 16. Implement multi-page insertion logic




  - [x] 16.1 Create insertContentMultiPages function


    - Create `packages/core-shared/src/services/MultiPageInsertion.ts`
    - Sequential insertion with rate limiting
    - _Requirements: 9.1, 9.6_
  - [ ]* 16.2 Write property test for Rate Limiting Compliance
    - **Property 16: Rate Limiting Compliance**
    - **Validates: Requirements 9.6**

  - [x] 16.3 Implement insertion target resolution
    - Use blockId if selected, null for end of page
    - _Requirements: 9.2, 9.3_
  - [ ]* 16.4 Write property test for Insertion Target Correctness
    - **Property 14: Insertion Target Correctness**

    - **Validates: Requirements 9.2, 9.3**
  - [x] 16.5 Implement error collection and continuation
    - Continue on error, collect all results
    - _Requirements: 9.5_
  - [ ]* 16.6 Write property test for Insertion Error Resilience
    - **Property 15: Insertion Error Resilience**

    - **Validates: Requirements 9.5**

  - [x] 16.7 Add progress callback for UI updates
    - _Requirements: 9.4_
  - [x] 16.8 Add quota tracking after successful insertions
    - _Requirements: 9.9_
-

- [x] 17. Implement block validation




  - [x] 17.1 Create validateSelections function


    - Check if selected blockIds still exist
    - _Requirements: 13.1_

  - [x] 17.2 Implement fallback to end-of-page for invalid blocks
    - _Requirements: 13.3_
  - [ ]* 17.3 Write property test for Invalid Block Fallback
    - **Property 17: Invalid Block Fallback**
    - **Validates: Requirements 13.3**

  - [x] 17.4 Add confirmation dialog for invalid selections

    - _Requirements: 13.4, 13.5_

  - [x] 17.5 Add warning notification for affected pages

    - _Requirements: 13.2_

- [x] 18. Integrate insertion with UI

  - [x] 18.1 Update Send button handler in EnhancedContentEditor
    - Call insertContentMultiPages with tocState.selections
    - _Requirements: 9.1_
  - [x] 18.2 Add progress bar UI during insertion

    - _Requirements: 9.4_
  - [x] 18.3 Add summary notification on completion

    - _Requirements: 9.7_
  - [x] 18.4 Add error details modal

    - _Requirements: 9.8_

- [ ] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Preset Management and Export/Import
- [x] 20. Implement TOC Preset Management




- [ ] 20. Implement TOC Preset Management


  - [x] 20.1 Create TOCPreset type and storage service

    - Create `packages/core-shared/src/services/TOCPresetService.ts`
    - Use electron-store for persistence
    - _Requirements: 14.1, 14.6_


  - [-] 20.2 Implement savePreset function

    - _Requirements: 14.1_

  - [ ] 20.3 Implement loadPresets function
    - _Requirements: 14.2_

  - [x] 20.4 Implement applyPreset function with page matching

    - Skip pages not in current selection
    - _Requirements: 14.3, 14.4_

  - [x] 20.5 Implement deletePreset function with confirmation

    - _Requirements: 14.5_
  - [ ]* 20.6 Write property test for Preset Save/Load Round-Trip
    - **Property 18: Preset Save/Load Round-Trip**
    - **Validates: Requirements 14.1, 14.2, 14.3**
-

- [x] 21. Implement Configuration Export/Import





  - [x] 21.1 Create TOCExportConfig type

    - Include version, selections, customSynonyms
    - _Requirements: 15.1, 15.2_

  - [x] 21.2 Implement exportConfig function

    - Generate JSON file download
    - _Requirements: 15.1_

  - [x] 21.3 Implement importConfig function with version validation

    - _Requirements: 15.3, 15.4_
  - [ ] 21.4 Implement synonym merging on import
    - _Requirements: 15.5_



  - [x]* 21.5 Write property test for Config Export/Import Round-Trip


    - **Property 19: Config Export/Import Round-Trip**





    - **Validates: Requirements 15.1, 15.2, 15.3**


- [ ] 22. Add Preset UI


  - [-] 22.1 Add preset menu to MultiPageTOCManager


    - Dropdown with saved presets
    - _Requirements: 14.2_
  - [ ] 22.2 Add "Save Preset" button and name input dialog
    - _Requirements: 14.1_
  - [ ] 22.3 Add preset delete confirmation
    - _Requirements: 14.5_
  - [ ] 22.4 Add Export/Import buttons
    - _Requirements: 15.1, 15.3_

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Accessibility and Polish

- [x] 24. Implement accessibility features



  - [x] 24.1 Add ARIA attributes to TabBar (role="tablist", role="tab")

    - _Requirements: 12.3_
  - [x] 24.2 Add ARIA attributes to SectionList (role="listbox", role="option")


    - _Requirements: 12.3_
  - [x] 24.3 Implement keyboard navigation for sections (Arrow Up/Down, Space/Enter)


    - _Requirements: 12.6_
  - [x] 24.4 Add visible focus indicators (2px outline)


    - _Requirements: 12.7_
  - [x] 24.5 Add screen reader announcements for selection changes


    - _Requirements: 12.5_
  - [x] 24.6 Verify WCAG AAA contrast ratios


    - _Requirements: 12.8_

- [x] 25. Performance optimization


  - [x] 25.1 Add memoization for SmartMatchingEngine results


    - _Requirements: 11.2_

  - [x] 25.2 Add lazy loading for page structures (load on tab switch)
    - _Requirements: 11.3_
  - [x] 25.3 Verify performance targets (<100ms render, <200ms matching)



    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 26. Final integration testing
  - [ ]* 26.1 Write integration tests for multi-page selection flow
    - Select pages → configure sections → send → verify
  - [ ]* 26.2 Write integration tests for Smart Fill flow
    - Load pages → Smart Fill → verify selections
  - [ ]* 26.3 Write integration tests for error recovery flow
    - Simulate API failure → verify fallback → verify summary

- [ ] 27. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
