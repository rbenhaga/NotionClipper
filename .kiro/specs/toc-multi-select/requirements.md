# Requirements Document

## Introduction

This document specifies the requirements for an advanced Table of Contents (TOC) system enabling multi-page section selection in Clipper Pro. The system allows users to select specific sections across multiple Notion pages simultaneously, with intelligent matching capabilities to detect similar sections and apply bulk actions. The feature combines tab-based navigation, smart section matching (AI-powered detection), and visual feedback to streamline content insertion workflows.

## Glossary

- **TOC (Table of Contents)**: A navigable list of headings extracted from a Notion page structure
- **Section**: A heading block (H1, H2, H3) within a Notion page that can serve as an insertion target
- **Smart Matching**: Algorithm that detects sections with identical or similar names across multiple pages using exact, normalized, and fuzzy comparison
- **Fuzzy Matching**: Text comparison using Levenshtein distance that finds similar but not identical section names
- **Exact Match**: Sections with identical normalized text and heading level (100% confidence)
- **Normalized Match**: Sections matching after text normalization (lowercase, trim, remove accents) with 90% confidence
- **Block ID**: Unique identifier for a Notion block, used to specify insertion position
- **Insertion Target**: The specific location (page + block) where content will be inserted
- **Tab**: UI element representing one selected page in the multi-page TOC interface
- **Smart Fill**: Bulk action that auto-selects common sections across all compatible pages
- **Page Structure**: Hierarchical representation of a page's headings and their relationships
- **Confidence Score**: Percentage (0-100) indicating the reliability of a section match
- **Synonym Dictionary**: Predefined mapping of equivalent section names across languages and variations
- **Rate Limiting**: Notion API constraint of 3 requests per second requiring sequential insertion with delays
- **TOC Preset**: Saved configuration of page selections and section targets for reuse

## Requirements

### Requirement 1: Multi-Page Tab Navigation

**User Story:** As a user with multiple pages selected, I want to see one tab per selected page, so that I can navigate between pages and configure section targets independently.

#### Acceptance Criteria

1. WHEN a user selects 2 or more pages THEN the TOC System SHALL display a tab bar with one tab per selected page
2. WHEN a user clicks on a tab THEN the TOC System SHALL display the heading structure of that specific page
3. WHEN a page has a section selected THEN the TOC System SHALL display a checkmark badge on that page's tab
4. WHEN a page has no section selected THEN the TOC System SHALL display an empty circle indicator on that page's tab
5. WHILE the tab bar contains more than 5 visible tabs THEN the TOC System SHALL enable horizontal scrolling with a "+N" counter for hidden tabs
6. WHEN a user hovers over a tab THEN the TOC System SHALL display a tooltip showing page title, section count, and selected section name
7. WHEN a user presses Ctrl+Tab THEN the TOC System SHALL navigate to the next tab
8. WHEN a user presses Ctrl+Shift+Tab THEN the TOC System SHALL navigate to the previous tab
9. WHEN a user presses Ctrl+1 through Ctrl+9 THEN the TOC System SHALL navigate directly to the corresponding tab number

### Requirement 2: Section Selection Per Page

**User Story:** As a user, I want to select a different section in each page independently, so that my content is inserted exactly where I want in each page.

#### Acceptance Criteria

1. WHEN a user clicks on a heading in the section list THEN the TOC System SHALL mark that heading as the selected insertion point for the active page
2. WHEN a user selects a section THEN the TOC System SHALL store the block ID, heading text, and heading level for that page
3. WHEN a user clicks "End of Page" option THEN the TOC System SHALL set the insertion target to append at the end of that page
4. WHEN a section is selected THEN the TOC System SHALL update the selection count display immediately
5. WHILE a page has a selected section THEN the TOC System SHALL highlight that section in the list when the tab is active

### Requirement 3: Page Structure Extraction

**User Story:** As a user, I want to see the heading structure of each selected page, so that I can choose the appropriate section for content insertion.

#### Acceptance Criteria

1. WHEN a page tab becomes active THEN the TOC System SHALL fetch and display the page's heading structure
2. WHEN fetching page structure THEN the TOC System SHALL extract all heading blocks (H1, H2, H3) with their block IDs
3. WHEN displaying headings THEN the TOC System SHALL show hierarchical indentation based on heading level
4. IF a page has no headings THEN the TOC System SHALL display "No sections found - insertion at end of page" message
5. WHILE page structure is loading THEN the TOC System SHALL display a skeleton loading indicator
6. WHEN page structure is fetched THEN the TOC System SHALL cache the result for 5 minutes to avoid redundant API calls
7. IF Notion API fails to fetch structure THEN the TOC System SHALL display a warning with retry button and use stale cache if available
8. WHEN a page has more than 50 headings THEN the TOC System SHALL use virtualization for the section list

### Requirement 4: Smart Section Matching

**User Story:** As a user with pages that have similar structures, I want to see which sections exist in multiple pages, so that I can insert content into the same section type across all compatible pages.

#### Acceptance Criteria

1. WHEN page structures are loaded THEN the Smart Matching Engine SHALL analyze all headings for matches using a three-tier algorithm
2. WHEN two or more pages have headings with identical normalized text and same heading level THEN the Smart Matching Engine SHALL create an exact match entry with 100% confidence
3. WHEN headings match after normalization (lowercase, trim, remove accents) THEN the Smart Matching Engine SHALL create a normalized match entry with 90% confidence
4. WHEN headings have Levenshtein distance of 2-3 characters or match synonym dictionary THEN the Smart Matching Engine SHALL create a fuzzy match entry with 70-85% confidence
5. WHEN matches are found THEN the TOC System SHALL display a Smart Suggestions panel showing common sections with match count and confidence indicator
6. WHEN a user clicks "Apply" on a matched section THEN the TOC System SHALL select that section for all pages where it exists
7. WHEN confidence score is between 60-80% THEN the TOC System SHALL display a warning indicator "Approximate match" on the suggestion
8. WHEN confidence score is below 70% THEN the TOC System SHALL exclude the match from default Smart Fill selection

### Requirement 5: Text Normalization for Matching

**User Story:** As a user, I want the system to recognize similar section names even with minor variations, so that matching works reliably across different page formats.

#### Acceptance Criteria

1. WHEN normalizing heading text THEN the Smart Matching Engine SHALL convert text to lowercase
2. WHEN normalizing heading text THEN the Smart Matching Engine SHALL remove punctuation characters
3. WHEN normalizing heading text THEN the Smart Matching Engine SHALL collapse multiple spaces into single spaces
4. WHEN normalizing heading text THEN the Smart Matching Engine SHALL trim leading and trailing whitespace
5. WHEN normalizing heading text THEN the Smart Matching Engine SHALL decompose and remove accents using Unicode NFD normalization
6. WHEN normalizing heading text THEN the Smart Matching Engine SHALL remove emoji characters
7. WHEN comparing headings THEN the Smart Matching Engine SHALL match headings only if they have the same heading level

### Requirement 6: Fuzzy Matching Variations

**User Story:** As a user, I want the system to recognize common variations of section names, so that sections like "Tasks" and "Action Items" are recognized as similar.

#### Acceptance Criteria

1. WHEN analyzing headings THEN the Smart Matching Engine SHALL check against a predefined synonym dictionary containing common section name variations
2. WHEN a heading matches a synonym group THEN the Smart Matching Engine SHALL assign a fuzzy match type with 85% confidence
3. WHEN displaying fuzzy matches THEN the TOC System SHALL show a yellow badge indicator distinguishing them from exact matches
4. WHEN calculating similarity THEN the Smart Matching Engine SHALL use Levenshtein distance for string comparison
5. IF similarity score exceeds 80% THEN the Smart Matching Engine SHALL consider the headings as potential matches
6. WHEN the synonym dictionary is used THEN the Smart Matching Engine SHALL support bilingual variations (French/English) including: actions/tasks/todo, notes/remarques, summary/résumé, objectives/goals/objectifs, resources/liens/links, attendees/participants, agenda/ordre du jour, decisions/décisions, next steps/prochaines étapes

### Requirement 7: Bulk Actions

**User Story:** As a power user managing many pages, I want to quickly select sections for all pages, so that I save time on repetitive selections.

#### Acceptance Criteria

1. WHEN a user clicks "Select All → End of Page" THEN the TOC System SHALL set all selected pages to insert at end of page
2. WHEN a user clicks "Smart Fill" THEN the TOC System SHALL open a modal showing all detected common sections
3. WHEN a user clicks "Reset" THEN the TOC System SHALL clear all section selections across all pages
4. WHEN bulk actions are applied THEN the TOC System SHALL update all affected tab badges immediately
5. WHILE no selections exist THEN the Reset button SHALL be visually disabled

### Requirement 8: Smart Fill Modal

**User Story:** As a user, I want to review and select which common sections to apply across pages, so that I have control over the smart fill behavior.

#### Acceptance Criteria

1. WHEN the Smart Fill modal opens THEN the TOC System SHALL display all detected section matches with checkboxes pre-checked for confidence above 80%
2. WHEN displaying a match THEN the TOC System SHALL show the heading text, level, match count (X/Y pages), confidence percentage, and match type badge
3. WHEN displaying a match THEN the TOC System SHALL list all pages where that section was found with page titles
4. WHEN a user clicks "Apply" THEN the TOC System SHALL select the checked sections for all their matching pages
5. WHEN a user selects insertion mode THEN the TOC System SHALL store the preference (end of section, start of section, or replace section content)
6. WHEN displaying a match with confidence below 80% THEN the TOC System SHALL show a warning icon with tooltip "Approximate match - verify before applying"
7. WHEN a user hovers over the preview icon THEN the TOC System SHALL display a tooltip showing the section content preview
8. WHEN the modal is open THEN the TOC System SHALL display a dynamic preview panel showing which pages will be affected by current selection
9. WHEN a user clicks "Select All" THEN the TOC System SHALL check all matches with confidence above 70%
10. WHEN a user clicks "Deselect All" THEN the TOC System SHALL uncheck all matches

### Requirement 9: Multi-Page Content Insertion

**User Story:** As a user, I want to send content to multiple pages with their configured section targets, so that content is inserted at the correct location in each page.

#### Acceptance Criteria

1. WHEN a user clicks Send THEN the Content Editor SHALL iterate over all selected pages with their section configurations sequentially
2. WHEN a page has a section selected THEN the Notion API call SHALL include the block ID as the after_block_id parameter
3. WHEN a page has no section selected THEN the Notion API call SHALL append content at the end of the page
4. WHEN sending to multiple pages THEN the TOC System SHALL display a progress bar with current/total count and page name
5. IF an insertion fails for one page THEN the TOC System SHALL continue with remaining pages and collect all errors for final report
6. WHEN inserting content THEN the Content Editor SHALL wait 350ms between each Notion API call to respect rate limits (3 requests/second)
7. WHEN all insertions complete THEN the TOC System SHALL display a summary notification showing success count and error count
8. IF errors occurred THEN the TOC System SHALL provide a "View Details" action to show error modal with page names and error messages
9. WHEN insertion completes successfully THEN the TOC System SHALL track usage quota for each page inserted

### Requirement 10: Visual Feedback and State

**User Story:** As a user, I want clear visual feedback about my selections and the system state, so that I understand what will happen when I send content.

#### Acceptance Criteria

1. WHEN selections change THEN the TOC System SHALL update the selection summary display showing configured vs total pages
2. WHEN a section is selected THEN the TOC System SHALL animate the selection change using Framer Motion
3. WHEN hovering over a tab THEN the TOC System SHALL show a tooltip with the page title and selected section
4. WHILE the TOC panel is visible THEN the TOC System SHALL maintain a fixed position on the right side of the editor
5. WHEN the user has made selections THEN the TOC System SHALL display a summary bar showing selection status

### Requirement 11: Performance Requirements

**User Story:** As a user with many pages selected, I want the TOC system to remain responsive, so that I can work efficiently without delays.

#### Acceptance Criteria

1. WHEN rendering the TOC for up to 10 pages THEN the TOC System SHALL complete rendering in less than 100 milliseconds
2. WHEN running smart matching for up to 10 pages THEN the Smart Matching Engine SHALL complete analysis in less than 200 milliseconds
3. WHEN switching tabs THEN the TOC System SHALL update the view in less than 50 milliseconds
4. WHEN sending to multiple pages THEN the Content Editor SHALL complete each page insertion in less than 2 seconds
5. WHILE handling 20 or more pages THEN the TOC System SHALL use virtualization for the tab bar if needed

### Requirement 12: Accessibility

**User Story:** As a user relying on keyboard navigation or screen readers, I want the TOC system to be fully accessible, so that I can use all features without a mouse.

#### Acceptance Criteria

1. WHEN navigating with keyboard THEN the TOC System SHALL support Tab key navigation between interactive elements
2. WHEN a tab is focused THEN the TOC System SHALL support Enter key to activate the tab
3. WHEN using screen reader THEN the TOC System SHALL provide ARIA labels for all interactive elements including role="tablist", role="tab", and role="tabpanel"
4. WHEN switching tabs with keyboard THEN the TOC System SHALL support Arrow Left/Right for tab navigation and Home/End for first/last tab
5. WHEN a section is selected THEN the TOC System SHALL announce the selection to screen readers with page title and section name
6. WHEN navigating sections THEN the TOC System SHALL support Arrow Up/Down for section navigation and Space/Enter for selection
7. WHEN focus is on any interactive element THEN the TOC System SHALL display a visible focus indicator with 2px outline
8. WHEN displaying colors THEN the TOC System SHALL maintain WCAG AAA contrast ratios (7:1 for text, 4.5:1 for UI components)

### Requirement 13: Selection Conflict Handling

**User Story:** As a user, I want the system to handle cases where a selected section no longer exists in Notion, so that my content is still inserted gracefully.

#### Acceptance Criteria

1. WHEN a user clicks Send THEN the TOC System SHALL validate that all selected block IDs still exist in their respective pages
2. IF a selected block ID no longer exists THEN the TOC System SHALL display a warning notification listing affected pages
3. IF a selected block ID no longer exists THEN the TOC System SHALL fallback to inserting at end of page for that specific page
4. WHEN validation finds invalid selections THEN the TOC System SHALL ask user to confirm proceeding with fallback behavior
5. WHEN displaying validation warning THEN the TOC System SHALL show which pages will use fallback insertion

### Requirement 14: TOC Preset Management

**User Story:** As a power user, I want to save and reuse my TOC configurations, so that I can quickly apply the same section selections for recurring workflows.

#### Acceptance Criteria

1. WHEN a user clicks "Save Preset" THEN the TOC System SHALL store the current page selections and section targets with a user-provided name
2. WHEN a user opens the preset menu THEN the TOC System SHALL display all saved presets with name and creation date
3. WHEN a user clicks on a preset THEN the TOC System SHALL apply the saved selections to matching pages
4. IF a preset references pages not currently selected THEN the TOC System SHALL skip those pages and notify the user
5. WHEN a user clicks "Delete Preset" THEN the TOC System SHALL remove the preset after confirmation
6. WHEN saving presets THEN the TOC System SHALL persist data to electron-store for desktop app

### Requirement 15: Configuration Export/Import

**User Story:** As a team lead, I want to export and share my TOC configurations with team members, so that we can maintain consistent workflows.

#### Acceptance Criteria

1. WHEN a user clicks "Export Configuration" THEN the TOC System SHALL generate a JSON file containing current selections, smart matches, and custom synonyms
2. WHEN exporting configuration THEN the TOC System SHALL include a version number for compatibility checking
3. WHEN a user imports a configuration file THEN the TOC System SHALL validate the version and apply compatible settings
4. IF imported configuration version is incompatible THEN the TOC System SHALL display an error with supported version range
5. WHEN importing configuration THEN the TOC System SHALL merge custom synonyms with existing dictionary without overwriting
