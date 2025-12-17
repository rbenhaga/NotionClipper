# Requirements Document

## Introduction

Ce document spécifie les améliorations nécessaires pour le NotionClipboardEditor, un composant d'édition de contenu qui convertit du Markdown vers des blocs Notion API. L'objectif est de corriger les bugs existants et d'améliorer l'expérience utilisateur pour qu'elle soit fidèle à Notion, incluant le formatage Markdown en temps réel et le support de tous les types de blocs Notion.

## Glossary

- **NotionClipboardEditor**: Composant React d'édition de contenu avec conversion Markdown → HTML pour l'affichage et Markdown → Notion API pour l'envoi
- **Clipboard**: Contenu copié depuis le système d'exploitation, surveillé par l'application
- **ModernParser**: Parser qui convertit le Markdown en AST (Abstract Syntax Tree) puis en blocs Notion
- **Lexer**: Tokenizer qui découpe le texte en tokens typés (HEADING, LIST_ITEM, etc.)
- **Toggle List**: Liste déroulante/pliable dans Notion (syntaxe: `> contenu` suivi de space)
- **Callout**: Bloc d'alerte/note avec icône et couleur (syntaxe: `> [!type] contenu`)
- **Rich Text**: Texte formaté avec gras, italique, code inline, liens, etc.
- **MathJax**: Bibliothèque JavaScript pour le rendu des équations LaTeX
- **Syntax Highlighting**: Coloration syntaxique du code selon le langage
- **Live Markdown**: Formatage Markdown appliqué en temps réel pendant la frappe (ex: `**texte**` devient **texte**)
- **Block Menu**: Menu accessible via `/` pour insérer différents types de blocs
- **Inline Formatting**: Formatage appliqué au texte sélectionné (gras, italique, code, etc.)

## Requirements

### Requirement 1: Bouton d'annulation des modifications

**User Story:** As a user, I want to cancel my edits and restore the original clipboard content, so that I can quickly revert unwanted changes.

#### Acceptance Criteria

1. WHEN the user has edited the content AND the clipboard content differs from the edited content THEN the NotionClipboardEditor SHALL display a visible "Réinitialiser" button
2. WHEN the user clicks the reset button THEN the NotionClipboardEditor SHALL restore the content to the last clipboard value
3. WHEN the user has not edited the content THEN the NotionClipboardEditor SHALL hide the reset button
4. WHEN the clipboard updates AND the user has not edited the content THEN the NotionClipboardEditor SHALL automatically update the displayed content

---

### Requirement 2: Affichage correct des listes à puces dans le menu contextuel

**User Story:** As a user, I want to see bullet points displayed correctly when I transform a block to a bulleted list, so that I can verify the formatting is applied.

#### Acceptance Criteria

1. WHEN the user selects "Liste à puces" from the context menu THEN the NotionClipboardEditor SHALL display the block with a visible bullet marker (•)
2. WHEN the user selects "Liste numérotée" from the context menu THEN the NotionClipboardEditor SHALL display the block with a visible number prefix
3. WHEN the user selects "Liste de tâches" from the context menu THEN the NotionClipboardEditor SHALL display the block with a visible checkbox

---

### Requirement 3: Réduction des retours à la ligne excessifs

**User Story:** As a user, I want the editor to display content without excessive blank lines, so that the content is readable and compact.

#### Acceptance Criteria

1. WHEN parsing markdown content THEN the markdownToHtml function SHALL limit consecutive empty lines to a maximum of 1
2. WHEN converting HTML back to markdown THEN the htmlToMarkdown function SHALL remove sequences of more than 2 consecutive newlines
3. WHEN displaying content THEN the NotionClipboardEditor SHALL apply CSS that minimizes vertical spacing between paragraphs

---

### Requirement 4: Images intégrées avec positionnement au curseur

**User Story:** As a user, I want images to be inserted at my cursor position and displayed inline like in Notion, so that I can place images exactly where I want them.

#### Acceptance Criteria

1. WHEN the user pastes or drops an image THEN the NotionClipboardEditor SHALL insert the image at the current cursor position
2. WHEN an image is displayed THEN the NotionClipboardEditor SHALL render it inline within the content flow
3. WHEN the user hovers over an image THEN the NotionClipboardEditor SHALL display resize and delete controls
4. WHEN the user drags an image THEN the NotionClipboardEditor SHALL allow repositioning within the content

---

### Requirement 5: Fichiers intégrés avec positionnement au curseur

**User Story:** As a user, I want files to be inserted at my cursor position and displayed inline, so that I can organize attachments within my content.

#### Acceptance Criteria

1. WHEN the user drops files into the editor THEN the NotionClipboardEditor SHALL insert file blocks at the current cursor position
2. WHEN a file is displayed THEN the NotionClipboardEditor SHALL render it as an inline block with icon, name, and size
3. WHEN the user hovers over a file block THEN the NotionClipboardEditor SHALL display a delete control
4. WHEN the file quota is exceeded THEN the NotionClipboardEditor SHALL display a warning notification

---

### Requirement 6: Toggle Lists fonctionnels

**User Story:** As a user, I want toggle lists to be rendered as collapsible sections, so that I can organize content hierarchically.

#### Acceptance Criteria

1. WHEN parsing markdown with `> content` syntax (single >) THEN the Lexer SHALL tokenize it as a TOGGLE_LIST token
2. WHEN rendering a toggle list THEN the NotionClipboardEditor SHALL display it as a collapsible `<details>` element
3. WHEN the user clicks on a toggle list header THEN the NotionClipboardEditor SHALL expand or collapse the content
4. WHEN parsing `>> content` syntax (double >) THEN the Lexer SHALL tokenize it as a QUOTE_BLOCK token

---

### Requirement 7: Coloration syntaxique du code

**User Story:** As a user, I want code blocks to have syntax highlighting, so that code is easier to read and understand.

#### Acceptance Criteria

1. WHEN rendering a code block with a specified language THEN the NotionClipboardEditor SHALL apply syntax highlighting for that language
2. WHEN the language is not specified THEN the NotionClipboardEditor SHALL render the code without highlighting but with monospace font
3. WHEN rendering inline code THEN the NotionClipboardEditor SHALL apply a distinct background color and monospace font

---

### Requirement 8: Équations LaTeX formatées

**User Story:** As a user, I want LaTeX equations to be rendered as mathematical notation, so that formulas are displayed correctly.

#### Acceptance Criteria

1. WHEN parsing inline equations with `$$formula$$` syntax THEN the markdownToHtml function SHALL wrap them in MathJax-compatible spans
2. WHEN parsing block equations with `$\n formula \n$` syntax THEN the markdownToHtml function SHALL wrap them in MathJax-compatible divs
3. WHEN content is updated THEN the NotionClipboardEditor SHALL trigger MathJax typesetting to render equations
4. WHEN MathJax fails to load THEN the NotionClipboardEditor SHALL display the raw LaTeX as fallback

---

### Requirement 9: Tableaux CSV et TSV formatés

**User Story:** As a user, I want CSV and TSV data to be rendered as formatted tables, so that tabular data is easy to read.

#### Acceptance Criteria

1. WHEN parsing content with comma-separated values on consecutive lines THEN the Lexer SHALL detect and tokenize it as TABLE_ROW tokens with tableType 'csv'
2. WHEN parsing content with tab-separated values on consecutive lines THEN the Lexer SHALL detect and tokenize it as TABLE_ROW tokens with tableType 'tsv'
3. WHEN rendering a table THEN the NotionClipboardEditor SHALL display it with headers, borders, and hover effects

---

### Requirement 10: Images affichées depuis URLs markdown

**User Story:** As a user, I want markdown image syntax to render actual images, so that I can preview images in my content.

#### Acceptance Criteria

1. WHEN parsing `![alt](url)` markdown syntax THEN the markdownToHtml function SHALL convert it to an `<img>` tag
2. WHEN parsing a standalone image URL (jpg, png, gif, webp, svg) THEN the markdownToHtml function SHALL convert it to an `<img>` tag
3. WHEN an image fails to load THEN the NotionClipboardEditor SHALL display a placeholder with the alt text

---

### Requirement 11: HTML converti correctement

**User Story:** As a user, I want pasted HTML content to be converted to markdown and displayed correctly, so that I can paste content from web pages.

#### Acceptance Criteria

1. WHEN the user pastes HTML content THEN the handlePaste function SHALL convert it to markdown using htmlToMarkdownFromString
2. WHEN converting HTML lists THEN the htmlToMarkdown function SHALL preserve list structure with proper markers
3. WHEN converting HTML formatting (strong, em, code) THEN the htmlToMarkdown function SHALL convert to equivalent markdown syntax
4. WHEN converting HTML paragraphs and divs THEN the htmlToMarkdown function SHALL preserve paragraph breaks

---

### Requirement 12: Callouts affichés correctement

**User Story:** As a user, I want callout blocks to be rendered with icons and colors like in Notion, so that notes and warnings are visually distinct.

#### Acceptance Criteria

1. WHEN parsing `> [!type] content` syntax THEN the Lexer SHALL tokenize it as a CALLOUT token with appropriate type
2. WHEN rendering a callout THEN the NotionClipboardEditor SHALL display it with the correct icon (📝, ℹ️, 💡, ⚠️, 🚨, ✅)
3. WHEN rendering a callout THEN the NotionClipboardEditor SHALL apply the correct background color based on type
4. WHEN the callout type is not recognized THEN the NotionClipboardEditor SHALL use default styling (gray background, 💡 icon)

---

### Requirement 13: Menu contextuel enrichi avec tous les types de blocs

**User Story:** As a user, I want the context menu to offer all block transformation options, so that I can quickly change block types.

#### Acceptance Criteria

1. WHEN the user right-clicks in the editor THEN the FormattingMenu SHALL display a "Transformer en" panel with all block types
2. WHEN the user selects a block type THEN the NotionClipboardEditor SHALL convert the current block to that type
3. WHEN transforming to a list type THEN the NotionClipboardEditor SHALL add the appropriate list marker to the content
4. WHEN transforming to a heading THEN the NotionClipboardEditor SHALL wrap the content in the appropriate heading tag

---

### Requirement 14: Drag and drop de fichiers et images

**User Story:** As a user, I want to drag and drop files and images into the editor, so that I can quickly add attachments.

#### Acceptance Criteria

1. WHEN the user drags files over the editor THEN the NotionClipboardEditor SHALL display a visual drop zone overlay
2. WHEN the user drops files THEN the NotionClipboardEditor SHALL validate file size against maxFileSize
3. WHEN the user drops files THEN the NotionClipboardEditor SHALL validate against fileQuotaRemaining
4. WHEN validation fails THEN the NotionClipboardEditor SHALL display an appropriate error notification
5. WHEN validation succeeds THEN the NotionClipboardEditor SHALL add files to the attachedFiles list

---

### Requirement 15: Pretty printer pour le round-trip Markdown

**User Story:** As a developer, I want a pretty printer that converts AST back to Markdown, so that I can verify parsing correctness through round-trip testing.

#### Acceptance Criteria

1. WHEN converting AST nodes to Markdown THEN the pretty printer SHALL produce valid Markdown syntax for each node type
2. WHEN round-tripping content (parse → print) THEN the output SHALL be semantically equivalent to the input
3. WHEN printing list items THEN the pretty printer SHALL preserve indentation levels
4. WHEN printing tables THEN the pretty printer SHALL produce valid Markdown table syntax

---

### Requirement 16: Formatage Markdown en temps réel (Live Markdown)

**User Story:** As a user, I want Markdown syntax to be converted to formatted text as I type, so that I can see the final result immediately like in Notion.

#### Acceptance Criteria

1. WHEN the user types `**texte**` and presses space or continues typing THEN the NotionClipboardEditor SHALL convert it to bold text and remove the asterisks
2. WHEN the user types `*texte*` and presses space or continues typing THEN the NotionClipboardEditor SHALL convert it to italic text and remove the asterisks
3. WHEN the user types `` `code` `` and presses space or continues typing THEN the NotionClipboardEditor SHALL convert it to inline code and remove the backticks
4. WHEN the user types `~~texte~~` and presses space or continues typing THEN the NotionClipboardEditor SHALL convert it to strikethrough text and remove the tildes
5. WHEN the user types `[texte](url)` THEN the NotionClipboardEditor SHALL convert it to a clickable link

---

### Requirement 17: Raccourcis Markdown en début de ligne

**User Story:** As a user, I want to use Markdown shortcuts at the beginning of lines to create different block types, so that I can quickly format content.

#### Acceptance Criteria

1. WHEN the user types `*`, `-`, or `+` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to a bulleted list item
2. WHEN the user types `[]` at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to a to-do checkbox
3. WHEN the user types `1.`, `a.`, or `i.` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to a numbered list item
4. WHEN the user types `#` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to an H1 heading
5. WHEN the user types `##` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to an H2 heading
6. WHEN the user types `###` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to an H3 heading
7. WHEN the user types `>` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to a toggle list
8. WHEN the user types `"` followed by space at the beginning of a line THEN the NotionClipboardEditor SHALL convert the line to a quote block
9. WHEN the user types `---` at the beginning of a line THEN the NotionClipboardEditor SHALL insert a divider

---

### Requirement 18: Menu de commandes slash (/)

**User Story:** As a user, I want to access a menu of block types by typing `/`, so that I can quickly insert any type of content.

#### Acceptance Criteria

1. WHEN the user types `/` THEN the NotionClipboardEditor SHALL display a searchable menu of block types
2. WHEN the user types `/` followed by a block type name (e.g., `/bullet`, `/heading`) THEN the NotionClipboardEditor SHALL filter the menu to matching options
3. WHEN the user selects an option from the menu THEN the NotionClipboardEditor SHALL insert the corresponding block type
4. WHEN the user types `/` followed by an action (e.g., `/delete`, `/duplicate`) THEN the NotionClipboardEditor SHALL execute that action on the current block
5. WHEN the user types `/` followed by a color name (e.g., `/red`, `/blue`) THEN the NotionClipboardEditor SHALL change the color of the current block
6. WHEN the user presses Escape THEN the NotionClipboardEditor SHALL close the menu without action

---

### Requirement 19: Support de tous les types de blocs basiques Notion

**User Story:** As a user, I want to create all basic Notion block types, so that I can structure my content like in Notion.

#### Acceptance Criteria

1. WHEN creating a text block THEN the NotionClipboardEditor SHALL render it as a paragraph with rich text support
2. WHEN creating a page block THEN the NotionClipboardEditor SHALL render it as a link to a sub-page
3. WHEN creating a to-do block THEN the NotionClipboardEditor SHALL render it with a clickable checkbox
4. WHEN creating heading blocks (H1, H2, H3) THEN the NotionClipboardEditor SHALL render them with appropriate font sizes
5. WHEN creating a toggle list THEN the NotionClipboardEditor SHALL render it as a collapsible section
6. WHEN creating a quote block THEN the NotionClipboardEditor SHALL render it with larger text and left border
7. WHEN creating a divider THEN the NotionClipboardEditor SHALL render a thin gray horizontal line
8. WHEN creating a callout THEN the NotionClipboardEditor SHALL render it with an emoji icon and colored background

---

### Requirement 20: Support des médias (images, vidéos, audio, fichiers)

**User Story:** As a user, I want to add and preview media content in the editor, so that I can include rich media in my notes.

#### Acceptance Criteria

1. WHEN adding an image THEN the NotionClipboardEditor SHALL display it inline with resize controls
2. WHEN adding a video URL (YouTube, Vimeo) THEN the NotionClipboardEditor SHALL display an embedded video player or preview
3. WHEN adding an audio URL (Spotify, Soundcloud) THEN the NotionClipboardEditor SHALL display an audio player or embed
4. WHEN adding a file THEN the NotionClipboardEditor SHALL display it as a file block with icon, name, and size
5. WHEN adding a code block THEN the NotionClipboardEditor SHALL display it with syntax highlighting and language selector
6. WHEN adding a web bookmark THEN the NotionClipboardEditor SHALL display a clickable link preview with title and description

---

### Requirement 21: Support des embeds

**User Story:** As a user, I want to embed content from external services, so that I can include interactive content from other apps.

#### Acceptance Criteria

1. WHEN embedding a Google Drive link THEN the NotionClipboardEditor SHALL display an embedded preview
2. WHEN embedding a Figma link THEN the NotionClipboardEditor SHALL display an embedded Figma frame
3. WHEN embedding a PDF link THEN the NotionClipboardEditor SHALL display the PDF inline
4. WHEN embedding a Loom link THEN the NotionClipboardEditor SHALL display an embedded video player
5. WHEN embedding a GitHub Gist THEN the NotionClipboardEditor SHALL display the code snippet
6. WHEN embedding a Google Maps link THEN the NotionClipboardEditor SHALL display an interactive map

---

### Requirement 22: Manipulation des blocs (drag & drop, actions)

**User Story:** As a user, I want to rearrange and modify blocks using drag and drop and context actions, so that I can organize my content easily.

#### Acceptance Criteria

1. WHEN hovering over a block THEN the NotionClipboardEditor SHALL display a drag handle (⋮⋮) in the left margin
2. WHEN dragging a block THEN the NotionClipboardEditor SHALL show visual guides indicating drop position
3. WHEN dropping a block THEN the NotionClipboardEditor SHALL move it to the new position
4. WHEN clicking the drag handle THEN the NotionClipboardEditor SHALL display a menu with actions (Turn into, Color, Duplicate, Delete, Move to, Comment)
5. WHEN selecting "Turn into" THEN the NotionClipboardEditor SHALL transform the block to the selected type
6. WHEN selecting "Color" THEN the NotionClipboardEditor SHALL change the text or background color
7. WHEN selecting "Duplicate" THEN the NotionClipboardEditor SHALL create an exact copy of the block
8. WHEN selecting "Delete" THEN the NotionClipboardEditor SHALL remove the block

---

### Requirement 23: Sélection de contenu multi-blocs

**User Story:** As a user, I want to select content across multiple blocks, so that I can copy, cut, or format multiple blocks at once.

#### Acceptance Criteria

1. WHEN clicking and dragging from the page margin THEN the NotionClipboardEditor SHALL select entire blocks
2. WHEN clicking and dragging within text THEN the NotionClipboardEditor SHALL allow partial text selection across multiple blocks
3. WHEN pressing Escape while editing THEN the NotionClipboardEditor SHALL select the entire current block
4. WHEN multiple blocks are selected THEN the NotionClipboardEditor SHALL allow bulk actions (delete, duplicate, move)

