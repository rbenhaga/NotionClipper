# Design Document: NotionEditor Refactoring (Lean MVP)

## Overview

Refactoring du NotionClipboardEditor (4,576 lignes) vers une architecture modulaire en 3 jours.

**Philosophie:** Ship fast, fix bugs later. Code first, documentation later.

**Critères de succès:**
- ✅ Composant principal < 300 lignes
- ✅ Logique métier dans des packages séparés
- ✅ Ça marche comme avant (pas de régression)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              NotionEditor (< 250 lignes)                    │
│  Orchestration des hooks et composants                      │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
│   EditorArea    │ │ SlashMenu │ │FormattingToolbar│
└─────────────────┘ └───────────┘ └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                        Hooks                                 │
│  useEditorState │ useFormattingMenu │ useSlashCommands      │
│  useDragAndDrop                                              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Services                               │
│  MediaUrlParser │ FileValidator │ HtmlToMarkdown            │
│  ImageProcessor │ MarkdownToHtml                            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Package Structure (Minimal)

```
packages/
├── media-handlers/src/
│   └── MediaUrlParser.ts          ← Copier lignes 2840-3120
│
├── file-handlers/src/
│   ├── FileValidator.ts           ← Copier lignes 1580-1650
│   └── ImageProcessor.ts          ← Copier lignes 1650-1750
│
├── core-shared/src/converters/
│   ├── HtmlToMarkdownConverter.ts ← Copier lignes 4219-4521
│   └── MarkdownToHtmlConverter.ts ← Copier lignes 1040-1240
│
└── notion-editor/src/
    ├── components/
    │   ├── NotionEditor.tsx       ← Main < 250 lignes
    │   ├── EditorArea.tsx
    │   ├── FormattingToolbar.tsx
    │   ├── SlashMenu.tsx
    │   └── DragHandle.tsx
    └── hooks/
        ├── useEditorState.ts
        ├── useFormattingMenu.ts
        ├── useSlashCommands.ts
        └── useDragAndDrop.ts
```


## Data Models

### EditorState (Simple)

```typescript
type EditorState = {
  content: string;    // Markdown
  html: string;       // Rendered HTML
  isDirty: boolean;   // Has changes
};
```

### Hook Returns (Minimal Types)

```typescript
// useEditorState
{ ref, html, handleChange, insertAtCursor, focus, getContent }

// useFormattingMenu
{ isVisible, position }

// useSlashCommands
{ isVisible, position, filter }

// useDragAndDrop
{ showHandle, handlePosition, isDragging }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: HTML/Markdown Round-Trip
*For any* valid content, converting HTML → Markdown → HTML SHALL preserve semantic structure.
**Validates: Requirements 4.5, 5.1-5.5**

### Property 2: Media URL Parsing
*For any* valid YouTube/Spotify/Vimeo URL, MediaUrlParser.parse() SHALL return correct type and ID.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 3: File Validation Consistency
*For any* file, FileValidator.validate() SHALL return valid=false if size > maxSize OR type not in allowedTypes.
**Validates: Requirements 2.1, 2.2, 2.4**

### Property 4: Editor State Sync
*For any* edit operation, useEditorState SHALL update content and call onChange with correct Markdown.
**Validates: Requirements 6.3, 6.5**

### Property 5: Formatting Menu Visibility
*For any* selection state, useFormattingMenu.isVisible SHALL be true if and only if selection is not collapsed.
**Validates: Requirements 7.1, 7.2**

## Error Handling

**Approche Lean:** Fail silently, log errors, don't crash.

```typescript
// Pattern utilisé partout
try {
  // Logic
} catch (error) {
  console.error('[Component] Error:', error);
  // Continue with fallback or no-op
}
```

## Testing Strategy

### Phase 1: Manual Testing Only (MVP)

**Checklist de test manuel:**
- [ ] Taper du texte → ça marche ?
- [ ] Formater (bold, italic) → ça marche ?
- [ ] Slash commands → ça marche ?
- [ ] Upload image → ça marche ?
- [ ] Copier/coller HTML → ça marche ?
- [ ] Drag & drop blocks → ça marche ?

### Phase 2: Tests Automatisés (Post-MVP)

**Quand ajouter des tests:**
- Bug revient 2+ fois → Écrire un test
- Service utilisé par 3+ composants → Écrire des tests

**Framework:** fast-check pour property-based tests (si nécessaire)

## Migration Strategy

### Feature Flag

```typescript
// Dans UnifiedWorkspace.tsx
const USE_NEW_EDITOR = process.env.REACT_APP_USE_NEW_EDITOR === 'true';

return USE_NEW_EDITOR 
  ? <NotionEditor {...props} />
  : <NotionClipboardEditor {...props} />;
```

### Rollout Plan

1. **Dev:** USE_NEW_EDITOR = true en local
2. **Test:** Checklist manuelle complète
3. **Ship:** Activer pour tous
4. **Cleanup:** Supprimer ancien code après 1 semaine sans bugs

## Ce qu'on NE fait PAS (MVP)

- ❌ Tests automatisés
- ❌ Documentation JSDoc
- ❌ Storybook
- ❌ TypeScript strict (any autorisé)
- ❌ Performance optimization (memoization, virtualization)
- ❌ Lazy loading

**Pourquoi:** Ship fast. On ajoutera si nécessaire.


---

## Component Specifications

### FormattingToolbar

**Props:**
```typescript
interface FormattingToolbarProps {
  position: { x: number; y: number };
  onAction: (action: FormattingAction) => void;
  onClose: () => void;
}

type FormattingAction = 
  | 'bold' | 'italic' | 'underline' | 'strikethrough'
  | 'code' | 'link' | 'heading1' | 'heading2' | 'heading3';
```

**Buttons (in order):**
1. Bold (⌘B)
2. Italic (⌘I)
3. Underline (⌘U)
4. Strikethrough (⌘⇧X)
5. Code (⌘E)
6. Link (⌘K)
7. Heading 1
8. Heading 2
9. Heading 3

**Behavior:**
- Position: 40px above selection center
- Auto-hide: When selection collapsed or click outside
- Keyboard: Shortcuts trigger same actions

### SlashMenu

**Props:**
```typescript
interface SlashMenuProps {
  position: { x: number; y: number };
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

interface SlashCommand {
  name: string;
  icon?: string;
  keywords: string[];
  action: () => void;
}
```

**Default Commands:**
```typescript
const DEFAULT_COMMANDS = [
  { name: 'Heading 1', keywords: ['h1', 'heading', 'title'] },
  { name: 'Heading 2', keywords: ['h2', 'heading'] },
  { name: 'Heading 3', keywords: ['h3', 'heading'] },
  { name: 'Bullet List', keywords: ['ul', 'list', 'bullet'] },
  { name: 'Numbered List', keywords: ['ol', 'list', 'numbered'] },
  { name: 'To-do List', keywords: ['todo', 'checkbox', 'task'] },
  { name: 'Quote', keywords: ['quote', 'blockquote'] },
  { name: 'Code Block', keywords: ['code', 'snippet'] },
  { name: 'Divider', keywords: ['divider', 'separator', 'hr'] },
];
```

**Filtering:** Search in name + keywords (case insensitive)

**Keyboard:** Up/Down to navigate, Enter to select, Esc to close

### DragHandle

**Props:**
```typescript
interface DragHandleProps {
  position: { top: number; left: number };
  onDragStart: (block: HTMLElement) => void;
}
```

**Block Detection:**
- Selector: `.notion-block` or `[data-block-id]`
- Position: 20px left of block, vertically centered

**Drop Indicator:**
- Blue line (2px, #2383E2)
- Show between blocks during drag

### EditorArea

**Props:**
```typescript
interface EditorAreaProps {
  html: string;
  onChange: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onPaste: (e: ClipboardEvent) => void;
  onDrop: (e: DragEvent) => void;
  placeholder?: string;
  ref: RefObject<HTMLDivElement>;
}
```

---

## Event Handling Specification

### EditorArea Events

**onKeyDown:**
- Detect "/" at line start → Show SlashMenu
- Detect "Enter" in SlashMenu → Execute command
- Detect "Escape" → Close menus

**onPaste:**
1. `e.preventDefault()`
2. Get HTML: `e.clipboardData.getData('text/html')`
3. Convert: `HtmlToMarkdownConverter.convert(html)`
4. Insert at cursor
5. Trigger onChange

**onDrop:**
1. `e.preventDefault()`
2. Get files: `Array.from(e.dataTransfer.files)`
3. Validate with FileValidator
4. Upload with ImageProcessor if image
5. Insert markdown at cursor

**onInput:**
- Trigger onChange after debounce (100ms)

---

## Cursor Position Management

**Save cursor:**
```typescript
const selection = window.getSelection();
const range = selection?.getRangeAt(0);
return { node: range.startContainer, offset: range.startOffset };
```

**Restore cursor:**
```typescript
const range = document.createRange();
range.setStart(savedPos.node, savedPos.offset);
selection.removeAllRanges();
selection.addRange(range);
```

**Insert at cursor:**
```typescript
const range = selection.getRangeAt(0);
range.deleteContents();
range.insertNode(textNode);
range.setStartAfter(textNode);
range.collapse(true);
```

---

## State Transitions

### useEditorState Reducer Actions

```typescript
type EditorAction = 
  | { type: 'SET_CONTENT'; payload: string }      // content prop change
  | { type: 'SET_HTML'; payload: string }         // internal update
  | { type: 'MARK_DIRTY' }                        // user edits
  | { type: 'MARK_CLEAN' }                        // reset to clipboard
  | { type: 'FOCUS'; payload: boolean };          // onFocus/onBlur
```

**State Transitions:**
```
CLEAN → DIRTY (user edit)
DIRTY → CLEAN (reset button)
* → FOCUSED (click editor)
FOCUSED → * (click outside)
```

---

## Implementation Order (Dependency Graph)

### Phase 1: Services (No Dependencies)
1. `MediaUrlParser.ts`
2. `FileValidator.ts`
3. `ImageProcessor.ts`
4. `HtmlToMarkdownConverter.ts`
5. `MarkdownToHtmlConverter.ts`

### Phase 2: Core Hook (Depends on Converters)
6. `useEditorState.ts`
   - Imports: HtmlToMarkdownConverter, MarkdownToHtmlConverter

### Phase 3: UI Hooks (Depends on Core Hook)
7. `useFormattingMenu.ts`
8. `useSlashCommands.ts`
9. `useDragAndDrop.ts`

### Phase 4: UI Components (Pure UI, No Dependencies)
10. `EditorArea.tsx`
11. `FormattingToolbar.tsx`
12. `SlashMenu.tsx`
13. `DragHandle.tsx`

### Phase 5: Main Component (Depends on Everything)
14. `NotionEditor.tsx`
    - Imports: All hooks + All components

---

## Edge Cases (Converters)

### HTML → Markdown

**Lists with `<br>`:**
```html
<ul><li>Item 1<br>Line 2</li></ul>
```
→ `- Item 1\n  Line 2`

**Nested tables:** Ignore inner table, keep text only

**Custom data-* attributes:** Ignore, keep content only

### Markdown → HTML

**Empty lines:** Max 1 consecutive `<p><br></p>`

**Code blocks without language:** Use `<pre><code>` without `data-language`

---

## Rollback Strategy

### Feature Flag Override
```typescript
// URL params for testing
?editor=new  → Force new editor
?editor=old  → Force old editor

// localStorage override
localStorage.setItem('forceNewEditor', 'true');
```

### Emergency Rollback
1. Set `USE_NEW_EDITOR = false` globally
2. Deploy hotfix
3. Notify users if needed
