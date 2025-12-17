# Requirements Document

## Introduction

Ce document spécifie le refactoring architectural majeur du NotionClipboardEditor, un composant React monolithique de 4,576 lignes qui viole les principes SOLID et présente des problèmes critiques de maintenabilité, testabilité et performance. L'objectif est de transformer ce composant en une architecture modulaire avec séparation des responsabilités, extraction des services métier, et mise en place d'une stratégie de tests complète incluant des property-based tests.

## Requirements Priority Matrix (MoSCoW)

### MUST HAVE (Phase 1-2 - Bloquant)
- REQ-4: HtmlToMarkdownConverter
- REQ-5: MarkdownToHtmlConverter
- REQ-6: useEditorState
- REQ-10: NotionEditor principal
- REQ-11: EditorArea

### SHOULD HAVE (Phase 3 - Important)
- REQ-1: MediaUrlParser
- REQ-2: FileValidator
- REQ-7: useFormattingMenu
- REQ-8: useSlashCommands
- REQ-12: FormattingToolbar
- REQ-13: SlashMenu

### COULD HAVE (Phase 4 - Nice to have)
- REQ-3: ImageProcessor
- REQ-9: useDragAndDrop
- REQ-14: DragHandle
- REQ-15: PBT converters
- REQ-16: PBT hooks

### WON'T HAVE (This iteration)
- Advanced embed support (Google Maps, Figma live preview)
- Collaborative editing features

## Requirements Dependency Graph

```
REQ-4 (HtmlToMarkdown) ─┐
                        ├──> REQ-6 (useEditorState) ──> REQ-10 (NotionEditor)
REQ-5 (MarkdownToHtml) ─┘

REQ-1 (MediaUrlParser) ──> REQ-11 (EditorArea)

REQ-2 (FileValidator) ──> REQ-3 (ImageProcessor)

REQ-6 (useEditorState) ──> REQ-7 (useFormattingMenu) ──> REQ-12 (FormattingToolbar)
                       └──> REQ-8 (useSlashCommands) ──> REQ-13 (SlashMenu)
                       └──> REQ-9 (useDragAndDrop) ──> REQ-14 (DragHandle)

REQ-10 (NotionEditor) ──> REQ-17 (Migration) ──> REQ-18 (Performance)
```

## Glossary

- **NotionClipboardEditor**: Composant React monolithique actuel d'édition de contenu (4,576 lignes)
- **MediaUrlParser**: Service d'analyse et détection des URLs de médias (YouTube, Spotify, Vimeo, etc.)
- **FileValidator**: Service de validation des fichiers (taille, type, dimensions)
- **ImageProcessor**: Service de traitement d'images (preview, compression, redimensionnement)
- **HtmlToMarkdownConverter**: Convertisseur HTML vers Markdown
- **MarkdownToHtmlConverter**: Convertisseur Markdown vers HTML
- **EditorState**: État unifié de l'éditeur géré via useReducer
- **FormattingMenu**: Composant de menu de formatage contextuel
- **SlashMenu**: Composant de menu de commandes slash (/)
- **DragHandle**: Composant de poignée de glissement pour réorganiser les blocs
- **Property-Based Testing (PBT)**: Technique de test qui vérifie des propriétés universelles sur des entrées générées aléatoirement
- **Round-Trip Testing**: Test de cohérence aller-retour (parse → print → parse)
- **Cyclomatic Complexity**: Mesure de la complexité du code basée sur le nombre de chemins d'exécution

## Requirements

### Requirement 1: Extraction du service MediaUrlParser

**User Story:** As a developer, I want media URL parsing logic extracted into a dedicated service, so that I can test and reuse it independently of the editor component.

#### Acceptance Criteria

1. WHEN parsing a YouTube URL (standard or short format) THEN the MediaUrlParser SHALL return a MediaMetadata object with type YOUTUBE and the correct video ID
2. WHEN parsing a Spotify URL (track, album, or playlist) THEN the MediaUrlParser SHALL return a MediaMetadata object with type SPOTIFY and the correct resource ID
3. WHEN parsing a Vimeo URL THEN the MediaUrlParser SHALL return a MediaMetadata object with type VIMEO and the correct video ID
4. WHEN parsing an unsupported URL THEN the MediaUrlParser SHALL return null or a MediaMetadata with type UNKNOWN
5. WHEN generating an embed URL THEN the MediaUrlParser SHALL produce a valid embeddable URL for the detected media type

---

### Requirement 2: Extraction du service FileValidator

**User Story:** As a developer, I want file validation logic extracted into a dedicated service, so that I can validate files consistently across the application.

#### Acceptance Criteria

1. WHEN validating a file against maxSize THEN the FileValidator SHALL return an error if the file exceeds the limit
2. WHEN validating a file against allowedTypes THEN the FileValidator SHALL return an error if the MIME type is not in the allowed list
3. WHEN validating an image against maxDimensions THEN the FileValidator SHALL return an error if dimensions exceed the limits
4. WHEN all validations pass THEN the FileValidator SHALL return a valid result with no errors
5. WHEN detecting file type THEN the FileValidator SHALL correctly identify images, PDFs, audio, and video files

---

### Requirement 3: Extraction du service ImageProcessor

**User Story:** As a developer, I want image processing logic extracted into a dedicated service, so that I can generate previews and compress images independently.

#### Acceptance Criteria

1. WHEN generating a preview for an image file THEN the ImageProcessor SHALL return a base64 data URL
2. WHEN compressing an image THEN the ImageProcessor SHALL reduce file size while maintaining acceptable quality
3. WHEN resizing an image THEN the ImageProcessor SHALL respect maxWidth and maxHeight constraints while preserving aspect ratio
4. WHEN getting image dimensions THEN the ImageProcessor SHALL return accurate width and height values
5. WHEN processing fails THEN the ImageProcessor SHALL throw a descriptive error

---

### Requirement 4: Amélioration du HtmlToMarkdownConverter

**User Story:** As a developer, I want the HTML to Markdown converter improved and moved to core-shared, so that conversion logic is centralized and testable.

#### Acceptance Criteria

1. WHEN converting HTML with nested lists THEN the HtmlToMarkdownConverter SHALL preserve list structure with correct indentation
2. WHEN converting HTML tables THEN the HtmlToMarkdownConverter SHALL produce valid Markdown table syntax
3. WHEN converting HTML formatting (strong, em, code, s) THEN the HtmlToMarkdownConverter SHALL use correct Markdown syntax
4. WHEN converting HTML links THEN the HtmlToMarkdownConverter SHALL produce valid Markdown link syntax
5. WHEN round-tripping content (HTML → Markdown → HTML) THEN the semantic structure SHALL be preserved

---

### Requirement 5: Création du MarkdownToHtmlConverter

**User Story:** As a developer, I want a dedicated Markdown to HTML converter in core-shared, so that rendering logic is centralized and testable.

#### Acceptance Criteria

1. WHEN converting Markdown headings THEN the MarkdownToHtmlConverter SHALL produce correct h1/h2/h3 tags
2. WHEN converting Markdown lists THEN the MarkdownToHtmlConverter SHALL produce correct ul/ol/li structure
3. WHEN converting Markdown code blocks THEN the MarkdownToHtmlConverter SHALL include language attribute for syntax highlighting
4. WHEN converting Markdown inline formatting THEN the MarkdownToHtmlConverter SHALL produce correct strong/em/code/s tags
5. WHEN converting Markdown equations THEN the MarkdownToHtmlConverter SHALL wrap them in MathJax-compatible elements

---

### Requirement 6: Extraction du hook useEditorState

**User Story:** As a developer, I want editor state management extracted into a custom hook with useReducer, so that state logic is centralized and predictable.

#### Acceptance Criteria

1. WHEN initializing the editor THEN the useEditorState hook SHALL convert initial content to HTML
2. WHEN content changes externally THEN the useEditorState hook SHALL sync state if not dirty
3. WHEN the user edits content THEN the useEditorState hook SHALL mark state as dirty and notify onChange
4. WHEN inserting text at cursor THEN the useEditorState hook SHALL update content and maintain cursor position
5. WHEN getting content THEN the useEditorState hook SHALL return current Markdown content

---

### Requirement 7: Extraction du hook useFormattingMenu

**User Story:** As a developer, I want formatting menu logic extracted into a custom hook, so that menu behavior is isolated and testable.

#### Acceptance Criteria

1. WHEN text is selected THEN the useFormattingMenu hook SHALL show the menu positioned above the selection
2. WHEN selection is collapsed THEN the useFormattingMenu hook SHALL hide the menu
3. WHEN a formatting action is triggered THEN the useFormattingMenu hook SHALL apply the formatting and update content
4. WHEN hide is called THEN the useFormattingMenu hook SHALL close the menu immediately

---

### Requirement 8: Extraction du hook useSlashCommands

**User Story:** As a developer, I want slash command logic extracted into a custom hook, so that command handling is isolated and testable.

#### Acceptance Criteria

1. WHEN the user types "/" at line start or after whitespace THEN the useSlashCommands hook SHALL show the menu
2. WHEN the user types after "/" THEN the useSlashCommands hook SHALL filter commands by the typed text
3. WHEN the user selects a command THEN the useSlashCommands hook SHALL execute it and close the menu
4. WHEN the user presses Escape THEN the useSlashCommands hook SHALL close the menu without action
5. WHEN the user types space after "/" THEN the useSlashCommands hook SHALL close the menu

---

### Requirement 9: Extraction du hook useDragAndDrop

**User Story:** As a developer, I want drag and drop logic extracted into a custom hook, so that block reordering is isolated and testable.

#### Acceptance Criteria

1. WHEN hovering over a block THEN the useDragAndDrop hook SHALL show the drag handle at the correct position
2. WHEN dragging starts THEN the useDragAndDrop hook SHALL track the dragged block and show visual feedback
3. WHEN dragging over other blocks THEN the useDragAndDrop hook SHALL show drop indicators
4. WHEN dropping THEN the useDragAndDrop hook SHALL move the block to the new position
5. WHEN drag is cancelled THEN the useDragAndDrop hook SHALL restore original state

---

### Requirement 10: Création du composant NotionEditor principal

**User Story:** As a developer, I want a new NotionEditor component that orchestrates sub-components and hooks, so that the main component is under 300 lines.

#### Acceptance Criteria

1. WHEN rendering THEN the NotionEditor component SHALL be under 300 lines of code
2. WHEN rendering THEN the NotionEditor component SHALL compose EditorArea, FormattingToolbar, SlashMenu, and DragHandle components
3. WHEN exposing API via ref THEN the NotionEditor component SHALL provide insertAtCursor, focus, getSelection, and getContent methods
4. WHEN readOnly is true THEN the NotionEditor component SHALL hide all editing controls
5. WHEN content changes THEN the NotionEditor component SHALL call onChange with updated Markdown

---

### Requirement 11: Création du composant EditorArea

**User Story:** As a developer, I want a dedicated EditorArea component for the contenteditable region, so that editing logic is isolated.

#### Acceptance Criteria

1. WHEN rendering THEN the EditorArea component SHALL display content in a contenteditable div
2. WHEN the user types THEN the EditorArea component SHALL call onChange with updated content
3. WHEN the user pastes THEN the EditorArea component SHALL handle paste events and convert HTML to Markdown
4. WHEN files are dropped THEN the EditorArea component SHALL call onDrop with the files
5. WHEN placeholder is provided AND content is empty THEN the EditorArea component SHALL display the placeholder

---

### Requirement 12: Création du composant FormattingToolbar

**User Story:** As a developer, I want a dedicated FormattingToolbar component, so that formatting UI is isolated and reusable.

#### Acceptance Criteria

1. WHEN visible THEN the FormattingToolbar component SHALL display formatting buttons (bold, italic, code, etc.)
2. WHEN a button is clicked THEN the FormattingToolbar component SHALL call onAction with the action type
3. WHEN positioned THEN the FormattingToolbar component SHALL appear at the specified coordinates
4. WHEN clicking outside THEN the FormattingToolbar component SHALL call onClose

---

### Requirement 13: Création du composant SlashMenu

**User Story:** As a developer, I want a dedicated SlashMenu component, so that command menu UI is isolated and reusable.

#### Acceptance Criteria

1. WHEN visible THEN the SlashMenu component SHALL display a searchable list of commands
2. WHEN filter is provided THEN the SlashMenu component SHALL show only matching commands
3. WHEN a command is selected THEN the SlashMenu component SHALL call onSelect with the command
4. WHEN keyboard navigation is used THEN the SlashMenu component SHALL highlight the selected item
5. WHEN Escape is pressed THEN the SlashMenu component SHALL call onClose

---

### Requirement 14: Création du composant DragHandle

**User Story:** As a developer, I want a dedicated DragHandle component, so that drag UI is isolated and reusable.

#### Acceptance Criteria

1. WHEN visible THEN the DragHandle component SHALL display a drag icon (⋮⋮)
2. WHEN positioned THEN the DragHandle component SHALL appear at the specified coordinates
3. WHEN drag starts THEN the DragHandle component SHALL call onDragStart with the block element
4. WHEN clicked THEN the DragHandle component SHALL show a block action menu

---

### Requirement 15: Tests property-based pour les convertisseurs

**User Story:** As a developer, I want property-based tests for converters, so that I can verify correctness across many inputs.

#### Acceptance Criteria

1. WHEN testing HtmlToMarkdownConverter THEN the property test SHALL verify round-trip consistency for valid HTML
2. WHEN testing MarkdownToHtmlConverter THEN the property test SHALL verify round-trip consistency for valid Markdown
3. WHEN testing MediaUrlParser THEN the property test SHALL verify that valid URLs produce correct MediaMetadata
4. WHEN testing FileValidator THEN the property test SHALL verify that validation results are consistent

---

### Requirement 16: Tests property-based pour les hooks

**User Story:** As a developer, I want property-based tests for editor hooks, so that I can verify state management correctness.

#### Acceptance Criteria

1. WHEN testing useEditorState THEN the property test SHALL verify that content changes are reflected in state
2. WHEN testing useFormattingMenu THEN the property test SHALL verify that menu visibility matches selection state
3. WHEN testing useDragAndDrop THEN the property test SHALL verify that block order is preserved after drag operations

---

### Requirement 17: Migration progressive avec feature flag

**User Story:** As a developer, I want to migrate to the new architecture progressively using feature flags, so that I can rollback if issues arise.

#### Acceptance Criteria

1. WHEN the feature flag is OFF THEN the application SHALL use the legacy NotionClipboardEditor
2. WHEN the feature flag is ON THEN the application SHALL use the new NotionEditor
3. WHEN switching between versions THEN the application SHALL maintain feature parity
4. WHEN errors occur in the new version THEN the application SHALL log them for monitoring

---

### Requirement 18: Performance et bundle size

**User Story:** As a developer, I want the refactored editor to have better performance and smaller bundle size, so that the application loads faster.

#### Acceptance Criteria

1. WHEN rendering THEN the NotionEditor component SHALL have initial render time under 100ms
2. WHEN typing THEN the NotionEditor component SHALL have re-render time under 16ms (60fps)
3. WHEN bundled THEN the notion-editor package SHALL be under 500KB
4. WHEN lazy loading THEN heavy components (syntax highlighting, MathJax) SHALL be loaded on demand


---

## API Contracts

### Service: MediaUrlParser

```typescript
export enum MediaType {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
  GOOGLE_DRIVE = 'google-drive',
  FIGMA = 'figma',
  LOOM = 'loom',
  GIST = 'gist',
  UNKNOWN = 'unknown'
}

export interface MediaMetadata {
  type: MediaType;
  id: string;
  url: string;
  embedUrl?: string;
  title?: string;
  thumbnail?: string;
}

export class MediaUrlParser {
  static parse(url: string): MediaMetadata | null;
  static isYouTubeUrl(url: string): boolean;
  static isSpotifyUrl(url: string): boolean;
  static extractYouTubeId(url: string): string | null;
  static generateEmbedUrl(metadata: MediaMetadata): string;
}
```

### Service: FileValidator

```typescript
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileValidationOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[]; // MIME types
  maxDimensions?: { width: number; height: number };
}

export class FileValidator {
  static validate(file: File, options: FileValidationOptions): FileValidationResult;
  static isImage(file: File): boolean;
  static isPdf(file: File): boolean;
  static isAudio(file: File): boolean;
  static isVideo(file: File): boolean;
}
```

### Hook: useEditorState

```typescript
export interface EditorState {
  content: string;
  html: string;
  isFocused: boolean;
  selectedBlocks: Set<HTMLElement>;
  isDirty: boolean;
}

export interface UseEditorStateReturn {
  ref: RefObject<HTMLDivElement>;
  html: string;
  isFocused: boolean;
  selectedBlocks: Set<HTMLElement>;
  insertAtCursor: (text: string) => void;
  focus: () => void;
  getSelection: () => Selection | null;
  getContent: () => string;
  handleChange: () => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handlePaste: (e: ClipboardEvent) => void;
}

export function useEditorState(props: {
  content: string;
  onChange: (content: string) => void;
}): UseEditorStateReturn;
```

---

## Non-Functional Requirements

### NFR-1: Accessibility (WCAG 2.1 Level AA)

**User Story:** As a user with disabilities, I want the editor to be fully accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. WHEN using keyboard navigation THEN all editor functions SHALL be accessible
2. WHEN using screen reader THEN all UI elements SHALL have appropriate ARIA labels
3. WHEN focusing elements THEN focus indicators SHALL be clearly visible
4. WHEN using high contrast mode THEN all UI SHALL remain readable

---

### NFR-2: Browser Compatibility

**User Story:** As a user, I want the editor to work on all modern browsers, so that I can use my preferred browser.

#### Acceptance Criteria

1. WHEN using Chrome >= 90 THEN all features SHALL work
2. WHEN using Firefox >= 88 THEN all features SHALL work
3. WHEN using Safari >= 14 THEN all features SHALL work
4. WHEN using Edge >= 90 THEN all features SHALL work

---

### NFR-3: Security

**User Story:** As a user, I want my content to be safe from XSS attacks, so that my data is secure.

#### Acceptance Criteria

1. WHEN pasting HTML THEN the content SHALL be sanitized against XSS
2. WHEN embedding media THEN only trusted domains SHALL be allowed
3. WHEN handling file uploads THEN file types SHALL be validated on client and server
4. WHEN storing content THEN sensitive data SHALL NOT be logged

---

## Definition of Done

A requirement is considered DONE when ALL of the following criteria are met:

### Code Quality
- [ ] Code written and peer-reviewed
- [ ] No TypeScript errors or warnings
- [ ] No ESLint errors or warnings
- [ ] Code follows project style guide
- [ ] Cyclomatic complexity < 10 per function

### Testing
- [ ] Unit tests written with 80%+ coverage
- [ ] Integration tests written (if applicable)
- [ ] Property-based tests written (for converters/parsers)
- [ ] All tests pass in CI/CD
- [ ] Manual testing completed

### Documentation
- [ ] JSDoc comments for all public APIs
- [ ] README updated (if new package)
- [ ] Storybook stories created (for components)
- [ ] Migration guide updated (if breaking change)

### Performance
- [ ] No performance regressions vs baseline
- [ ] Bundle size increase < 10KB (if applicable)

### Security & Accessibility
- [ ] Security review completed (for new APIs)
- [ ] Accessibility audit passed (for UI changes)

### Deployment
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Smoke tests passed

---

## Property-Based Testing Framework

**Testing Framework:** fast-check (https://github.com/dubzzz/fast-check)

**Custom Arbitraries to Create:**
- `fc.htmlFragments()` - Generate valid HTML snippets
- `fc.markdownFragments()` - Generate valid Markdown snippets
- `fc.mediaUrls()` - Generate valid YouTube/Spotify/Vimeo URLs
- `fc.fileObjects()` - Generate mock File objects with various sizes/types
