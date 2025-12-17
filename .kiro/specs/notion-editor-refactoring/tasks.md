# Implementation Plan - NotionEditor Refactoring (3 Jours)

## Jour 1 : Services (6h)

- [x] 1. Créer package media-handlers





  - [x] 1.1 Créer `packages/media-handlers/package.json` et structure


    - Initialiser le package avec TypeScript
    - _Requirements: 1.1-1.5_

  - [x] 1.2 Implémenter `MediaUrlParser.ts`

    - Copier logique lignes 2840-3120 de NotionClipboardEditor.tsx
    - Méthodes: parse(), isYouTubeUrl(), isSpotifyUrl(), extractYouTubeId(), extractSpotifyId()
    - Support: YouTube, Spotify, Vimeo, SoundCloud
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - [ ]* 1.3 Write property test for media URL parsing
    - **Property 2: Media URL Parsing**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 2. Créer package file-handlers




  - [x] 2.1 Créer `packages/file-handlers/package.json` et structure


    - Initialiser le package avec TypeScript
    - _Requirements: 2.1-2.5, 3.1-3.4_

  - [x] 2.2 Implémenter `FileValidator.ts`

    - Copier logique lignes 1580-1650 de NotionClipboardEditor.tsx
    - Méthodes: validate(), isImage(), isPdf(), isAudio(), isVideo()
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 2.3 Implémenter `ImageProcessor.ts`

    - Copier logique lignes 1650-1750 de NotionClipboardEditor.tsx
    - Méthodes: generatePreview(), compress(), getDimensions()
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 2.4 Write property test for file validation
    - **Property 3: File Validation Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 3. Améliorer core-shared/converters





  - [x] 3.1 Améliorer `HtmlToMarkdownConverter.ts`


    - Copier logique lignes 4219-4521 de NotionClipboardEditor.tsx
    - Méthodes: convert(), processList(), processNode(), convertTable()
    - Gérer edge cases: listes avec <br>, nested tables, data-* attributes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Créer `MarkdownToHtmlConverter.ts`

    - Copier logique lignes 1040-1240 de NotionClipboardEditor.tsx
    - Méthodes: convert(), convertHeadings(), convertLists(), convertCodeBlocks()
    - Limiter empty lines à max 1
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 3.3 Write property test for round-trip conversion
    - **Property 1: HTML/Markdown Round-Trip**
    - **Validates: Requirements 4.5**

- [ ] 4. Checkpoint Jour 1
  - Tester manuellement: copier/coller URLs et HTML → vérifier parsing
  - Ensure all tests pass, ask the user if questions arise.


## Jour 2 : Hooks + Composant Principal (7h)
-

- [x] 5. Créer package notion-editor





  - [x] 5.1 Créer `packages/notion-editor/package.json` et structure

    - Initialiser le package avec TypeScript et React
    - Structure: src/components/, src/hooks/, src/types/
    - _Requirements: 10.1-10.5_
-

- [x] 6. Implémenter useEditorState hook




  - [x] 6.1 Créer `useEditorState.ts`


    - Implémenter reducer avec actions: SET_CONTENT, SET_HTML, MARK_DIRTY, MARK_CLEAN, FOCUS
    - Importer HtmlToMarkdownConverter, MarkdownToHtmlConverter
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 6.2 Implémenter gestion du curseur

    - Fonctions: saveCursorPosition(), restoreCursorPosition(), insertAtCursor()
    - _Requirements: 6.4_

  - [x] 6.3 Implémenter API publique

    - Return: ref, html, handleChange, insertAtCursor, focus, getContent
    - _Requirements: 6.5_
  - [ ]* 6.4 Write property test for editor state sync
    - **Property 4: Editor State Sync**
    - **Validates: Requirements 6.3, 6.5**
-

- [x] 7. Implémenter useFormattingMenu hook




  - [x] 7.1 Créer `useFormattingMenu.ts`


    - Écouter selectionchange event
    - Calculer position: 40px au-dessus de la sélection
    - Return: isVisible, position, hide()
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 7.2 Write property test for menu visibility
    - **Property 5: Formatting Menu Visibility**
    - **Validates: Requirements 7.1, 7.2**

- [x] 8. Implémenter useSlashCommands hook






  - [x] 8.1 Créer `useSlashCommands.ts`

    - Détecter "/" au début de ligne ou après whitespace
    - Filtrer commandes par name + keywords (case insensitive)
    - Return: isVisible, position, filter, selectedIndex
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Implémenter useDragAndDrop hook





  - [x] 9.1 Créer `useDragAndDrop.ts`


    - Détecter bloc survolé via .notion-block ou [data-block-id]
    - Positionner handle: 20px à gauche du bloc
    - Gérer drag start, drag over, drop, cancel
    - Return: showHandle, handlePosition, isDragging, dropIndicator

    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


- [x] 10. Créer NotionEditor principal









  - [x] 10.1 Créer `NotionEditor.tsx` (< 250 lignes)

    - Composer: useEditorState, useFormattingMenu, useSlashCommands, useDragAndDrop
    - Render: EditorArea, FormattingToolbar, SlashMenu, DragHandle
    - Exposer API via useImperativeHandle: insertAtCursor, focus, getContent
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11. Checkpoint Jour 2
  - Tester manuellement: render composant avec texte simple → vérifier édition
  - Ensure all tests pass, ask the user if questions arise.


## Jour 3 : Composants UI + Migration (7h)




- [x] 12. Créer composants UI






  - [x] 12.1 Créer `EditorArea.tsx`


    - contentEditable div avec dangerouslySetInnerHTML
    - Props: html, onChange, onKeyDown, onPaste, onDrop, placeholder, ref

    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 12.2 Créer `FormattingToolbar.tsx`

    - Boutons: Bold, Italic, Underline, Strikethrough, Code, Link, H1, H2, H3
    - Position fixe aux coordonnées fournies
    - Appeler onAction avec le type d'action
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 12.3 Créer `SlashMenu.tsx`

    - Liste filtrable de commandes
    - Navigation clavier: Up/Down, Enter, Escape
    - Commandes: Heading 1/2/3, Bullet List, Numbered List, To-do, Quote, Code, Divider
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 12.4 Créer `DragHandle.tsx`

    - Icône ⋮⋮ positionnée aux coordonnées fournies
    - Appeler onDragStart au début du drag

    - _Requirements: 14.1, 14.2, 14.3, 14.4_






- [x] 13. Intégrer avec feature flag




  - [x] 13.1 Ajouter feature flag dans UnifiedWorkspace

    - Variable: USE_NEW_EDITOR (env ou localStorage)
    - Render conditionnel: NotionEditor ou NotionClipboardEditor


    - _Requirements: 17.1, 17.2_
  - [x] 13.2 Ajouter URL params pour testing


    - ?editor=new → Force new editor
    - ?editor=old → Force old editor
    - _Requirements: 17.3, 17.4_

- [x] 14. Tests manuels complets







  - [x] 14.1 Checklist de test

    - [ ] Taper du texte → ça marche ?
    - [ ] Formater (bold, italic, underline) → ça marche ?
    - [ ] Slash commands (/heading, /bullet) → ça marche ?
    - [ ] Upload image → ça marche ?
    - [ ] Copier/coller HTML → ça marche ?
    - [ ] Drag & drop blocks → ça marche ?
    - [ ] Reset button → ça marche ?
    - _Requirements: 17.3_

- [x] 15. Fix bugs trouvés
  - [x] Fixed drag handle positioning - now uses containerRef instead of editorRef
  - [x] Fixed drag handle visibility - increased z-index and added pointerEvents: 'auto'
  - [x] Fixed image paste - now properly calls onFilesAdd instead of inserting base64 markdown
  - [x] Added file quota validation to NotionEditor
  - [x] Fixed EditorArea padding to not overlap with drag handle area

## Phase 2A : Features Critiques Manquantes (Ajouté)

- [x] 16. Implémenter Live Markdown Formatting (Requirements: 16.1-16.5)
  - [x] 16.1 Créer `useLiveMarkdown.ts` hook
    - Détection patterns: **bold**, *italic*, `code`, ~~strike~~, [link](url)
    - Conversion automatique en HTML lors de la frappe
    - Préservation position curseur après conversion
  - [x] 16.2 Intégrer dans NotionEditor.tsx
    - Prop `enableLiveMarkdown` (default: true)
    - Appel processInput() après chaque changement

- [x] 17. Implémenter Line-Start Shortcuts (Requirements: 17.1-17.9)
  - [x] 17.1 Créer `useLineStartShortcuts.ts` hook
    - Patterns: # → H1, ## → H2, ### → H3
    - Patterns: - → bullet list, 1. → numbered list
    - Patterns: [] → todo, > → quote, --- → divider
    - Déclenchement sur Space/Enter
  - [x] 17.2 Intégrer dans NotionEditor.tsx
    - Prop `enableLineStartShortcuts` (default: true)
    - Interception keyDown avant handler par défaut

- [x] 18. Créer styles CSS Notion-like
  - [x] 18.1 Créer `notion-blocks.css`
    - Styles headings (H1, H2, H3)
    - Styles listes (bullet, numbered, todo)
    - Styles quote, divider, code
    - Support dark mode
  - [x] 18.2 Exporter styles via package.json

- [x] 19. Améliorer useEditorState
  - [x] 19.1 Ajouter auto-sync clipboard
    - Sync automatique quand hasUserEdited === false
    - Intégré dans NotionEditor.tsx via useEffect

- [ ] 20. Checkpoint Phase 2A
  - [ ] Tester: taper **bold** → devient gras automatiquement
  - [ ] Tester: taper # + espace → devient H1
  - [ ] Tester: taper - + espace → devient liste
  - [ ] Tester: clipboard sync fonctionne

## Phase 2B : Features Secondaires (À faire)

- [ ] 21. Ajouter support MathJax
  - [ ] 21.1 Charger MathJax dynamiquement
  - [ ] 21.2 Typeset équations après changement contenu

- [ ] 22. Ajouter context menu (clic droit)
  - [ ] 22.1 Créer useContextMenu hook
  - [ ] 22.2 Afficher FormattingToolbar sur clic droit

- [ ] 23. Ajouter multi-block selection
  - [ ] 23.1 Escape to select current block
  - [ ] 23.2 Shift+Arrow pour étendre sélection
  - [ ] 23.3 Bulk delete avec Backspace

## Post-MVP (Après 1 semaine sans bugs)

- [ ] 17. Cleanup
  - [ ] 17.1 Supprimer NotionClipboardEditor.tsx
    - Après confirmation que le nouveau composant est stable
  - [ ] 17.2 Supprimer feature flag
    - Mettre USE_NEW_EDITOR = true par défaut
  - [ ] 17.3 Mettre à jour CHANGELOG
    - Documenter le refactoring

---

## Métriques de Succès

| Critère | Avant | Après | Status |
|---------|-------|-------|--------|
| Lignes composant principal | 4,576 | ~500 | ✅ |
| Packages séparés | 0 | 3 | ✅ |
| Hooks custom | 0 | 6 | ✅ |
| Live Markdown | ❌ | ✅ | ✅ |
| Line-start shortcuts | ❌ | ✅ | ✅ |
| Clipboard auto-sync | ❌ | ✅ | ✅ |
| Tests manuels passés | - | ?/10 | ⏳ |
| Régressions | - | 0 | ⏳ |
