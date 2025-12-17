# Implementation Plan

## Phase 1: Core Parser Fixes

- [x] 1. Fix Lexer toggle vs quote distinction





  - [x] 1.1 Update BlockRules to distinguish single `>` (toggle) from `>>` (quote) and `> [!` (callout)


    - Modify the regex patterns in `packages/notion-parser/src/lexer/rules/BlockRules.ts`
    - Single `>` followed by space (not `[!`) → TOGGLE_LIST token
    - Double `>>` → QUOTE_BLOCK token
    - `> [!type]` → CALLOUT token (already handled)
    - _Requirements: 6.1, 6.4_
  - [ ]* 1.2 Write property test for toggle vs quote distinction
    - **Property 8: Toggle vs Quote distinction**
    - **Validates: Requirements 6.1, 6.4**
  - [x] 1.3 Update ModernParser to handle TOGGLE_LIST tokens


    - Add `createToggleFromToken` method
    - Return AST node with type 'toggle' and children support
    - _Requirements: 6.2_

- [x] 2. Fix CSV/TSV table detection in Lexer



  - [x] 2.1 Add CSV detection logic to Lexer


    - Detect 2+ consecutive lines with comma-separated values
    - Set `tableType: 'csv'` in token metadata
    - _Requirements: 9.1_

  - [x] 2.2 Add TSV detection logic to Lexer

    - Detect 2+ consecutive lines with tab-separated values
    - Set `tableType: 'tsv'` in token metadata
    - _Requirements: 9.2_
  - [ ]* 2.3 Write property tests for CSV/TSV detection
    - **Property 14: CSV detection produces table tokens**
    - **Property 15: TSV detection produces table tokens**
    - **Validates: Requirements 9.1, 9.2**

- [-] 3. Implement PrettyPrinter for round-trip testing




  - [x] 3.1 Create PrettyPrinter class in `packages/notion-parser/src/converters/`


    - Implement `print(nodes: ASTNode[]): string` method
    - Handle all AST node types (paragraph, heading, list, code, table, etc.)
    - Preserve indentation for nested lists
    - _Requirements: 15.1, 15.3, 15.4_
  - [ ]* 3.2 Write property test for round-trip consistency
    - **Property 25: Pretty printer round-trip consistency**
    - **Validates: Requirements 15.2**
  - [ ]* 3.3 Write property test for list indentation preservation
    - **Property 26: Pretty printer preserves list indentation**
    - **Validates: Requirements 15.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Markdown to HTML Conversion Fixes
- [x] 5. Fix markdownToHtml function in NotionClipboardEditor




- [ ] 5. Fix markdownToHtml function in NotionClipboardEditor

  - [x] 5.1 Fix consecutive empty lines handling


    - Limit consecutive `<p><br></p>` to maximum of 1
    - Clean up excessive whitespace in output
    - _Requirements: 3.1_
  - [ ]* 5.2 Write property test for empty line limiting
    - **Property 5: Consecutive empty lines are limited**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 5.3 Fix toggle list rendering
    - Render toggle lists as `<details><summary>` elements
    - Add CSS for toggle arrow animation
    - _Requirements: 6.2_
  - [ ]* 5.4 Write property test for toggle rendering
    - **Property 9: Toggle list renders as details element**
    - **Validates: Requirements 6.2**
  - [x] 5.5 Fix code block rendering with language attribute

    - Add `data-language` attribute to `<pre>` elements
    - Integrate syntax highlighting library (Prism.js or highlight.js)
    - _Requirements: 7.1, 7.2_
  - [ ]* 5.6 Write property test for code block language
    - **Property 10: Code blocks have language attribute**
    - **Validates: Requirements 7.1**

  - [ ] 5.7 Fix inline equation rendering
    - Wrap `$$formula$$` in `<span class="notion-equation-inline">`

    - _Requirements: 8.1_
  - [ ] 5.8 Fix block equation rendering
    - Wrap block equations in `<div class="notion-equation">`
    - _Requirements: 8.2_
  - [ ]* 5.9 Write property tests for equation rendering
    - **Property 12: Inline equations wrapped for MathJax**
    - **Property 13: Block equations wrapped for MathJax**
    - **Validates: Requirements 8.1, 8.2**
  - [x] 5.10 Fix table rendering with proper structure


    - Ensure `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` elements
    - Add hover effects CSS
    - _Requirements: 9.3_
  - [ ]* 5.11 Write property test for table structure
    - **Property 16: Tables render with proper structure**
    - **Validates: Requirements 9.3**
  - [x] 5.12 Fix markdown image conversion


    - Convert `![alt](url)` to `<img src="url" alt="alt">`
    - _Requirements: 10.1_

  - [ ] 5.13 Fix standalone image URL conversion
    - Detect URLs ending in image extensions
    - Convert to `<img>` tags
    - _Requirements: 10.2_
  - [ ]* 5.14 Write property tests for image conversion
    - **Property 17: Markdown images convert to img tags**
    - **Property 18: Image URLs convert to img tags**
    - **Validates: Requirements 10.1, 10.2**
  - [x] 5.15 Fix callout rendering with icons and colors


    - Map callout types to icons and background colors
    - Apply correct CSS classes
    - _Requirements: 12.2, 12.3_
  - [ ]* 5.16 Write property test for callout rendering
    - **Property 22: Callout rendering includes icon and color**
    - **Validates: Requirements 12.2, 12.3**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: HTML to Markdown Conversion Fixes

- [x] 7. Fix htmlToMarkdown function





  - [x] 7.1 Fix HTML list conversion


    - Preserve `<ul>/<ol>/<li>` structure as markdown lists
    - Handle nested lists with proper indentation
    - _Requirements: 11.2_
  - [ ]* 7.2 Write property test for list conversion
    - **Property 19: HTML list conversion preserves structure**
    - **Validates: Requirements 11.2**
  - [x] 7.3 Fix HTML formatting conversion


    - Convert `<strong>` → `**`
    - Convert `<em>` → `*`
    - Convert `<code>` → backticks
    - _Requirements: 11.3_
  - [ ]* 7.4 Write property test for formatting conversion
    - **Property 20: HTML formatting conversion**
    - **Validates: Requirements 11.3**
  - [x] 7.5 Fix consecutive newline cleanup


    - Remove sequences of more than 2 consecutive newlines
    - _Requirements: 3.2_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: UI Component Improvements

- [x] 9. Implement reset button functionality
  - [x] 9.1 Add reset button visibility logic
    - Show when `hasUserEdited === true` AND `content !== clipboardContent`
    - Hide otherwise
    - _Requirements: 1.1, 1.3_
  - [ ]* 9.2 Write property test for reset button visibility
    - **Property 1: Reset button visibility matches edit state**
    - **Validates: Requirements 1.1, 1.3**
  - [x] 9.3 Implement reset action
    - Call `onResetToClipboard` callback
    - Restore content to clipboard value
    - _Requirements: 1.2_
  - [ ]* 9.4 Write property test for reset action
    - **Property 2: Reset restores clipboard content**
    - **Validates: Requirements 1.2**
  - [x] 9.5 Implement clipboard sync when not edited

    - Auto-update content when clipboard changes and `hasUserEdited === false`
    - _Requirements: 1.4_
  - [ ]* 9.6 Write property test for clipboard sync
    - **Property 3: Clipboard sync when not edited**
    - **Validates: Requirements 1.4**
- [x] 10. Fix block transformation in FormattingMenu




- [ ] 10. Fix block transformation in FormattingMenu

  - [x] 10.1 Fix bullet list transformation


    - Ensure visible bullet marker (•) after transformation
    - Wrap in `<ul><li>` structure
    - _Requirements: 2.1_

  - [x] 10.2 Fix numbered list transformation

    - Ensure visible number prefix after transformation
    - Wrap in `<ol><li>` structure
    - _Requirements: 2.2_

  - [x] 10.3 Fix todo list transformation

    - Ensure visible checkbox after transformation
    - Use `<div class="notion-todo">` structure
    - _Requirements: 2.3_


  - [ ] 10.4 Fix heading transformation
    - Wrap content in appropriate `<h1>/<h2>/<h3>` tags
    - _Requirements: 13.4_
  - [ ]* 10.5 Write property test for block transformations
    - **Property 4: Block transformation produces correct markup**
    - **Validates: Requirements 2.1, 2.2, 2.3, 13.4**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: File Handling Improvements

- [x] 12. Implement file validation and quota handling




  - [x] 12.1 Implement file size validation


    - Reject files exceeding `maxFileSize`
    - Call `showNotification` with error message
    - _Requirements: 14.2_
  - [ ]* 12.2 Write property test for file size validation
    - **Property 23: File size validation**
    - **Validates: Requirements 14.2**

  - [x] 12.3 Implement quota validation

    - Check `fileQuotaRemaining` before adding files
    - Call `onFileQuotaExceeded` when quota is 0
    - _Requirements: 14.3_
  - [ ]* 12.4 Write property test for quota validation
    - **Property 7: File quota validation**
    - **Validates: Requirements 5.4, 14.3, 14.4**

  - [x] 12.5 Implement file addition on success

    - Add validated files to `attachedFiles` via `onFilesAdd`
    - _Requirements: 14.5_
  - [ ]* 12.6 Write property test for file addition
    - **Property 24: Valid files are added to attachedFiles**
    - **Validates: Requirements 14.5**
- [x] 13. Improve file block rendering




- [ ] 13. Improve file block rendering



  - [ ] 13.1 Render file blocks with icon, name, and size
    - Display file icon based on type
    - Show file name and formatted size
    - _Requirements: 5.2_
  - [ ]* 13.2 Write property test for file block rendering
    - **Property 6: File blocks contain required information**
    - **Validates: Requirements 5.2**

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Live Markdown Formatting

- [x] 15. Implement LiveMarkdownFormatter module

  - [x] 15.1 Create LiveMarkdownFormatter class
    - Define patterns for bold, italic, code, strikethrough, link
    - Implement `processInlineFormatting` method
    - _Requirements: 16.1-16.5_

  - [x] 15.2 Implement bold formatting (`**text**`)
    - Detect pattern and convert to `<strong>`
    - Remove asterisks from display
    - _Requirements: 16.1_
  - [ ]* 15.3 Write property test for bold formatting
    - **Property 27: Live bold formatting**
    - **Validates: Requirements 16.1**
  - [x] 15.4 Implement italic formatting (`*text*`)
    - Detect pattern (not `**`) and convert to `<em>`
    - Remove asterisks from display
    - _Requirements: 16.2_
  - [ ]* 15.5 Write property test for italic formatting
    - **Property 28: Live italic formatting**
    - **Validates: Requirements 16.2**
  - [x] 15.6 Implement code formatting (`` `text` ``)
    - Detect pattern and convert to `<code>`
    - Remove backticks from display
    - _Requirements: 16.3_
  - [ ]* 15.7 Write property test for code formatting
    - **Property 29: Live code formatting**
    - **Validates: Requirements 16.3**
  - [x] 15.8 Implement strikethrough formatting (`~~text~~`)
    - Detect pattern and convert to `<s>`
    - Remove tildes from display
    - _Requirements: 16.4_
  - [ ]* 15.9 Write property test for strikethrough formatting
    - **Property 30: Live strikethrough formatting**
    - **Validates: Requirements 16.4**
  - [x] 15.10 Implement link formatting (`[text](url)`)
    - Detect pattern and convert to `<a href>`
    - _Requirements: 16.5_

  - [ ]* 15.11 Write property test for link formatting
    - **Property 31: Live link formatting**
    - **Validates: Requirements 16.5**

- [x] 16. Integrate LiveMarkdownFormatter into NotionClipboardEditor




  - [x] 16.1 Add `enableLiveMarkdown` prop



    - Default to true
    - _Requirements: 16.1-16.5_

  - [x] 16.2 Hook formatter into input handler

    - Process text on space/enter key
    - Update content and cursor position
    - _Requirements: 16.1-16.5_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Line-Start Shortcuts



- [x] 18. Implement LineStartHandler module



  - [x] 18.1 Create LineStartHandler class


    - Define shortcut patterns and mappings
    - Implement `processLineStart` method
    - _Requirements: 17.1-17.9_

  - [x] 18.2 Implement bullet list shortcut (`-`, `*`, `+` + space)

    - Detect pattern at line start
    - Convert to bulleted list item
    - _Requirements: 17.1_
  - [ ]* 18.3 Write property test for bullet list shortcut
    - **Property 32: Line-start bullet list shortcut**
    - **Validates: Requirements 17.1**

  - [ ] 18.4 Implement todo shortcut (`[]`)
    - Detect pattern at line start
    - Convert to checkbox
    - _Requirements: 17.2_
  - [ ]* 18.5 Write property test for todo shortcut
    - **Property 33: Line-start todo shortcut**

    - **Validates: Requirements 17.2**
  - [ ] 18.6 Implement numbered list shortcut (`1.`, `a.`, `i.` + space)
    - Detect pattern at line start
    - Convert to numbered list item
    - _Requirements: 17.3_
  - [x]* 18.7 Write property test for numbered list shortcut

    - **Property 34: Line-start numbered list shortcut**
    - **Validates: Requirements 17.3**
  - [ ] 18.8 Implement heading shortcuts (`#`, `##`, `###` + space)
    - Detect pattern at line start
    - Convert to appropriate heading level
    - _Requirements: 17.4, 17.5, 17.6_

  - [ ]* 18.9 Write property test for heading shortcuts
    - **Property 35: Line-start heading shortcuts**
    - **Validates: Requirements 17.4, 17.5, 17.6**
  - [ ] 18.10 Implement toggle shortcut (`>` + space)
    - Detect pattern at line start (not `[!`)
    - Convert to toggle list

    - _Requirements: 17.7_
  - [ ]* 18.11 Write property test for toggle shortcut
    - **Property 36: Line-start toggle shortcut**
    - **Validates: Requirements 17.7**
  - [ ] 18.12 Implement quote shortcut (`"` + space)
    - Detect pattern at line start

    - Convert to quote block
    - _Requirements: 17.8_
  - [ ]* 18.13 Write property test for quote shortcut
    - **Property 37: Line-start quote shortcut**
    --**Validates: Requirements 17.8**

  - [ ] 18.14 Implement divider shortcut (`---`)
    - Detect pattern
    - Insert divider element
    - _Requirements: 17.9_
  - [ ]* 18.15 Write property test for divider shortcut
    - **Property 38: Line-start divider shortcut**
    - **Validates: Requirements 17.9**

- [x] 19. Integrate LineStartHandler into NotionClipboardEditor





  - [x] 19.1 Hook handler into keydown event

    - Process on space key after shortcut patterns
    - _Requirements: 17.1-17.9_

- [ ] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Slash Menu
-


- [x] 21. Implement SlashMenu component



  - [x] 21.1 Create SlashMenu component


    - Display searchable list of commands
    - Support keyboard navigation
    - _Requirements: 18.1_

  - [ ] 21.2 Implement command filtering
    - Filter by name/keywords on input
    - Case-insensitive matching
    - _Requirements: 18.2_
  - [ ]* 21.3 Write property test for menu filtering
    - **Property 39: Slash menu filter**

    - **Validates: Requirements 18.2**
  - [x] 21.4 Define block type commands

    - Text, Heading 1/2/3, Bullet list, Numbered list, Todo, Toggle, Quote, Divider, Callout
    - _Requirements: 18.3_

  - [ ] 21.5 Define action commands
    - Delete, Duplicate, Move to

    - _Requirements: 18.4_
  - [ ] 21.6 Define color commands
    - Red, Blue, Green, Yellow, Orange, Purple, Gray
    - _Requirements: 18.5_
  - [ ] 21.7 Implement escape to close
    - Close menu on Escape key
    - _Requirements: 18.6_


- [x] 22. Integrate SlashMenu into NotionClipboardEditor



  - [x] 22.1 Add `enableSlashCommands` prop


    - Default to true
    - _Requirements: 18.1_

  - [x] 22.2 Detect `/` input and show menu

    - Track filter text after `/`
    - Position menu near cursor
    - _Requirements: 18.1, 18.2_

  - [ ] 22.3 Execute selected command
    - Insert block or execute action
    - _Requirements: 18.3, 18.4, 18.5_

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: Block Rendering Improvements
-

- [x] 24. Improve basic block rendering





  - [x] 24.1 Ensure all basic blocks render correctly

    - Paragraph, Heading 1/2/3, Bullet list, Numbered list, Todo, Toggle, Quote, Divider, Callout
    - _Requirements: 19.1-19.8_
  - [ ]* 24.2 Write property test for block rendering
    - **Property 40: Block type rendering**
    - **Validates: Requirements 19.1-19.8**
- [x] 25. Improve media block rendering





- [x] 25. Improve media block rendering


  - [ ] 25.1 Ensure all media blocks render correctly
    - Image, Video, Audio, File, Code, Bookmark
    - _Requirements: 20.1-20.6_
  - [ ]* 25.2 Write property test for media rendering
    - **Property 41: Media block rendering**
    - **Validates: Requirements 20.1-20.6**


- [x] 26. Add embed support



  - [x] 26.1 Detect embed URLs (Google Drive, Figma, PDF, Loom, GitHub Gist, Google Maps)


    - Parse URL patterns
    - Create appropriate embed blocks
    - _Requirements: 21.1-21.6_


  - [ ] 26.2 Render embeds with iframe or preview
    - Use appropriate embed method per service
    - _Requirements: 21.1-21.6_

- [-] 27. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.


## Phase 10: Block Manipulation

- [x] 28. Implement drag handle and block actions
  - [x] 28.1 Add drag handle (⋮⋮) on hover
    - Display in left margin
    - _Requirements: 22.1_
  - [x] 28.2 Implement drag and drop
    - Show visual guides during drag
    - Move block on drop
    - _Requirements: 22.2, 22.3_
  - [x] 28.3 Implement block action menu
    - Turn into, Color, Duplicate, Delete, Move to, Comment
    - _Requirements: 22.4_
  - [x] 28.4 Implement "Turn into" action
    - Transform block to selected type
    - _Requirements: 22.5_
  - [x] 28.5 Implement "Color" action
    - Change text or background color
    - _Requirements: 22.6_
  - [x] 28.6 Implement "Duplicate" action
    - Create exact copy of block
    - _Requirements: 22.7_
  - [x] 28.7 Implement "Delete" action

    - Remove block
    - _Requirements: 22.8_

- [x] 29. Implement multi-block selection




  - [x] 29.1 Implement margin drag selection


    - Select entire blocks when dragging from margin
    - _Requirements: 23.1_

  - [x] 29.2 Implement partial text selection across blocks

    - Allow selecting text across multiple blocks
    - _Requirements: 23.2_

  - [ ] 29.3 Implement Escape to select block
    - Select entire block on Escape while editing

    - _Requirements: 23.3_
  - [ ] 29.4 Implement bulk actions
    - Delete, duplicate, move multiple selected blocks
    - _Requirements: 23.4_
-


- [x] 30. Final Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.
