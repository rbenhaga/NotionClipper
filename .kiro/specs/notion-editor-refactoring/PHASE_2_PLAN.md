# 📋 PHASE 2 - Plan d'Implémentation Détaillé

**Objectif**: Atteindre 90% de fidélité Notion pour les interactions critiques  
**Durée estimée**: 3-4 jours  
**Priorité**: CRITIQUE

---

## 🎯 Objectifs Phase 2A

1. ✅ Sélection multi-blocs complète
2. ✅ Menu contextuel (clic droit)
3. ✅ Raccourcis clavier globaux
4. ✅ Fix Live Markdown

---

## 📦 TÂCHE 1: Sélection Multi-Blocs (1.5 jours)

### 1.1 Créer Hook `useBlockSelection`

**Fichier**: `packages/notion-editor/src/hooks/useBlockSelection.ts`

```typescript
/**
 * useBlockSelection - Multi-block selection hook
 * 
 * Features:
 * - Esc → select current block
 * - Shift + ↑/↓ → extend selection
 * - Shift + Click → range selection
 * - Drag in margin → lasso selection
 * - Cmd/Ctrl + D → duplicate selection
 * - Delete/Backspace → delete selection
 * - Cmd/Ctrl + Shift + ↑/↓ → move selection
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface BlockSelectionState {
  selectedBlockIds: Set<string>;
  anchorBlockId: string | null;
  isSelecting: boolean;
}

export interface UseBlockSelectionProps {
  editorRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  onSelectionChange?: (blockIds: Set<string>) => void;
}

export interface UseBlockSelectionReturn {
  selectedBlockIds: Set<string>;
  isBlockSelected: (blockId: string) => boolean;
  selectBlock: (blockId: string, mode?: 'replace' | 'add' | 'range') => void;
  clearSelection: () => void;
  selectAll: () => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  moveSelection: (direction: 'up' | 'down') => void;
  // Lasso selection
  startLasso: (e: React.MouseEvent) => void;
  // Keyboard handlers
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

export function useBlockSelection({
  editorRef,
  enabled = true,
  onSelectionChange,
}: UseBlockSelectionProps): UseBlockSelectionReturn {
  // Implementation...
}
```

**Fonctionnalités clés**:
- État: `selectedBlockIds: Set<string>`
- Modes de sélection: replace, add, range
- Lasso: mousedown dans marge → calcul blocs intersectés
- Keyboard: Esc, Shift+↑/↓, Cmd+D, Delete, Cmd+Shift+↑/↓

### 1.2 Ajouter Attributs `data-block-id` aux Blocs

**Problème**: Actuellement, les blocs n'ont pas d'ID unique.

**Solution**: Modifier `EditorArea` pour wrapper chaque bloc avec un ID.

**Fichier**: `packages/notion-editor/src/components/EditorArea.tsx`

```typescript
// Option 1: Wrapper automatique (complexe)
// Parcourir le DOM et ajouter data-block-id à chaque bloc

// Option 2: Modifier la structure HTML (plus simple)
// Chaque bloc est wrappé dans un <div data-block-id="...">
```

**Recommandation**: Option 2 - Modifier la structure pour avoir des blocs identifiables.

### 1.3 Créer Composant `BlockWrapper`

**Fichier**: `packages/notion-editor/src/components/BlockWrapper.tsx`

```typescript
interface BlockWrapperProps {
  blockId: string;
  isSelected: boolean;
  children: React.ReactNode;
  onSelect: (blockId: string, mode: 'replace' | 'add' | 'range') => void;
}

export function BlockWrapper({ blockId, isSelected, children, onSelect }: BlockWrapperProps) {
  return (
    <div
      data-block-id={blockId}
      className={`notion-block ${isSelected ? 'is-selected' : ''}`}
      onClick={(e) => {
        if (e.shiftKey) {
          onSelect(blockId, 'range');
        } else if (e.metaKey || e.ctrlKey) {
          onSelect(blockId, 'add');
        }
      }}
    >
      {children}
    </div>
  );
}
```

### 1.4 Styles CSS pour Sélection

**Fichier**: `apps/notion-clipper-app/src/react/src/index.css`

```css
/* Block selection */
.notion-block {
  position: relative;
  padding: 3px 2px;
  margin: 1px 0;
  border-radius: 3px;
  transition: background-color 0.1s ease;
}

.notion-block.is-selected {
  background-color: rgba(35, 131, 226, 0.08);
  border-left: 3px solid rgb(35, 131, 226);
  padding-left: 6px;
}

.notion-block.is-selecting {
  background-color: rgba(35, 131, 226, 0.04);
}

/* Lasso selection indicator */
.notion-lasso-indicator {
  position: absolute;
  background: rgba(35, 131, 226, 0.1);
  border: 1px solid rgba(35, 131, 226, 0.3);
  pointer-events: none;
  z-index: 100;
}
```

### 1.5 Intégrer dans NotionEditor

**Fichier**: `packages/notion-editor/src/components/NotionEditor.tsx`

```typescript
// Ajouter le hook
const blockSelection = useBlockSelection({
  editorRef: containerRef,
  enabled: !readOnly,
  onSelectionChange: (blockIds) => {
    console.log('Selected blocks:', blockIds);
  },
});

// Passer aux handlers
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  // Try block selection first
  if (blockSelection.handleKeyDown(e)) {
    return; // Handled by block selection
  }
  
  // Then line-start shortcuts
  if (enableLineStartShortcuts && !readOnly) {
    const result = lineStartShortcuts.handleKeyDown(e);
    if (result.applied) return;
  }
  
  // Finally default behavior
  editorState.handleKeyDown(e);
}, [blockSelection, enableLineStartShortcuts, readOnly, lineStartShortcuts, editorState]);
```

---

## 📦 TÂCHE 2: Menu Contextuel (1 jour)

### 2.1 Créer Hook `useBlockContextMenu`

**Fichier**: `packages/notion-editor/src/hooks/useBlockContextMenu.ts`

```typescript
export type BlockAction =
  | 'turn-into'
  | 'color'
  | 'duplicate'
  | 'delete'
  | 'move-to'
  | 'copy-link'
  | 'comment';

export interface UseBlockContextMenuProps {
  editorRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  onAction: (action: BlockAction, blockId: string) => void;
}

export interface UseBlockContextMenuReturn {
  isVisible: boolean;
  position: Position;
  targetBlockId: string | null;
  hide: () => void;
}

export function useBlockContextMenu({
  editorRef,
  enabled = true,
  onAction,
}: UseBlockContextMenuProps): UseBlockContextMenuReturn {
  // Listen to contextmenu event
  // Check if target is in margin or on handle
  // Show menu at cursor position
}
```

### 2.2 Créer Composant `BlockContextMenu`

**Fichier**: `packages/notion-editor/src/components/BlockContextMenu.tsx`

```typescript
interface BlockContextMenuProps {
  position: Position;
  blockId: string;
  onAction: (action: BlockAction) => void;
  onClose: () => void;
}

export function BlockContextMenu({ position, blockId, onAction, onClose }: BlockContextMenuProps) {
  return (
    <div
      className="notion-context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        // Notion-like styles
      }}
    >
      <MenuItem icon={<TurnIntoIcon />} label="Turn into" onClick={() => onAction('turn-into')} />
      <MenuItem icon={<ColorIcon />} label="Color" onClick={() => onAction('color')} />
      <Divider />
      <MenuItem icon={<DuplicateIcon />} label="Duplicate" onClick={() => onAction('duplicate')} />
      <MenuItem icon={<DeleteIcon />} label="Delete" onClick={() => onAction('delete')} />
      <Divider />
      <MenuItem icon={<MoveIcon />} label="Move to" onClick={() => onAction('move-to')} />
      <MenuItem icon={<LinkIcon />} label="Copy link to block" onClick={() => onAction('copy-link')} />
      <MenuItem icon={<CommentIcon />} label="Comment" onClick={() => onAction('comment')} />
    </div>
  );
}
```

### 2.3 Styles CSS

```css
.notion-context-menu {
  width: 240px;
  background: white;
  border-radius: 8px;
  box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px,
              rgba(15, 15, 15, 0.1) 0px 3px 6px,
              rgba(15, 15, 15, 0.2) 0px 9px 24px;
  padding: 6px 0;
  z-index: 1000;
}

.notion-context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
  color: rgb(55, 53, 47);
  transition: background-color 0.1s ease;
}

.notion-context-menu-item:hover {
  background-color: rgba(55, 53, 47, 0.08);
}

.notion-context-menu-divider {
  height: 1px;
  background: rgba(55, 53, 47, 0.16);
  margin: 4px 0;
}
```

---

## 📦 TÂCHE 3: Raccourcis Clavier Globaux (0.5 jour)

### 3.1 Créer Hook `useKeyboardShortcuts`

**Fichier**: `packages/notion-editor/src/hooks/useKeyboardShortcuts.ts`

```typescript
export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  action: () => void;
  when?: () => boolean;
}

export interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        // Check if key matches
        if (e.key !== shortcut.key) continue;

        // Check modifiers
        const modifiers = shortcut.modifiers || {};
        if (modifiers.ctrl && !e.ctrlKey) continue;
        if (modifiers.shift && !e.shiftKey) continue;
        if (modifiers.alt && !e.altKey) continue;
        if (modifiers.meta && !e.metaKey) continue;

        // Check condition
        if (shortcut.when && !shortcut.when()) continue;

        // Execute action
        e.preventDefault();
        shortcut.action();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
```

### 3.2 Intégrer dans NotionEditor

```typescript
// Define shortcuts
const shortcuts: KeyboardShortcut[] = [
  {
    key: '/',
    modifiers: { meta: true },
    action: () => {
      // Open command palette
      console.log('Open command palette');
    },
  },
  {
    key: 'd',
    modifiers: { meta: true },
    action: () => blockSelection.duplicateSelection(),
  },
  {
    key: 'ArrowUp',
    modifiers: { meta: true, shift: true },
    action: () => blockSelection.moveSelection('up'),
  },
  {
    key: 'ArrowDown',
    modifiers: { meta: true, shift: true },
    action: () => blockSelection.moveSelection('down'),
  },
  {
    key: 'm',
    modifiers: { meta: true, shift: true },
    action: () => {
      // Open comment
      console.log('Open comment');
    },
  },
];

useKeyboardShortcuts({ shortcuts, enabled: !readOnly });
```

---

## 📦 TÂCHE 4: Fix Live Markdown (1 jour)

### 4.1 Débugger `useLiveMarkdown`

**Problème**: Le curseur se déplace lors de la conversion.

**Solution**: Utiliser la même approche que `useLineStartShortcuts`:
1. Sauvegarder position curseur AVANT conversion
2. Faire la conversion
3. Restaurer position curseur APRÈS conversion (avec `requestAnimationFrame`)

**Fichier**: `packages/notion-editor/src/hooks/useLiveMarkdown.ts`

```typescript
// Améliorer la logique de conversion
const applyFormatting = useCallback((
  pattern: MarkdownPattern,
  match: RegExpMatchArray,
  node: Text,
  offset: number
) => {
  // Save cursor position
  const selection = window.getSelection();
  const cursorOffset = selection?.rangeCount ? selection.getRangeAt(0).startOffset : 0;

  // Apply formatting
  const before = node.textContent!.substring(0, match.index!);
  const after = node.textContent!.substring(match.index! + match[0].length);
  const formatted = pattern.format(match);

  // Create new HTML
  const newHtml = before + formatted + after;
  
  // Replace node content
  const parent = node.parentElement;
  if (parent) {
    parent.innerHTML = newHtml;
    
    // Restore cursor with requestAnimationFrame
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        // Calculate new cursor position
        const newOffset = cursorOffset - (match[0].length - formatted.length);
        // Set cursor
        // ...
      }
    });
  }
}, []);
```

### 4.2 Réactiver dans NotionEditor

```typescript
const handleEditorChange = useCallback(() => {
  editorState.handleChange();

  // Re-enable live markdown
  if (enableLiveMarkdown && !readOnly) {
    requestAnimationFrame(() => {
      liveMarkdown.processInput();
    });
  }
}, [editorState, enableLiveMarkdown, readOnly, liveMarkdown]);
```

---

## 📊 Checklist Phase 2A

### Sélection Multi-Blocs
- [ ] Hook `useBlockSelection` créé
- [ ] Esc → sélectionne bloc courant
- [ ] Shift + ↑/↓ → étend sélection
- [ ] Shift + Click → sélection intervalle
- [ ] Drag marge → lasso
- [ ] Cmd+D → duplique
- [ ] Delete → supprime
- [ ] Cmd+Shift+↑/↓ → déplace
- [ ] Styles CSS appliqués
- [ ] Tests manuels passés

### Menu Contextuel
- [ ] Hook `useBlockContextMenu` créé
- [ ] Composant `BlockContextMenu` créé
- [ ] Clic droit sur bloc → menu
- [ ] Clic droit sur handle → menu
- [ ] Actions: Turn into, Color, Duplicate, Delete
- [ ] Styles CSS appliqués
- [ ] Tests manuels passés

### Raccourcis Clavier
- [ ] Hook `useKeyboardShortcuts` créé
- [ ] Cmd+/ → palette commandes
- [ ] Cmd+D → duplicate
- [ ] Cmd+Shift+↑/↓ → move
- [ ] Cmd+Shift+M → comment
- [ ] Tab/Shift+Tab → indent/outdent
- [ ] Tests manuels passés

### Live Markdown
- [ ] Bug curseur fixé
- [ ] `**bold**` → **bold**
- [ ] `*italic*` → *italic*
- [ ] `` `code` `` → `code`
- [ ] `~~strike~~` → ~~strike~~
- [ ] Réactivé dans NotionEditor
- [ ] Tests manuels passés

---

## 🎯 Résultat Attendu

Après Phase 2A, l'éditeur devrait avoir:
- ✅ Sélection multi-blocs complète (comme Notion)
- ✅ Menu contextuel riche (comme Notion)
- ✅ Raccourcis clavier essentiels (comme Notion)
- ✅ Live Markdown fonctionnel (comme Notion)

**Score de fidélité Notion**: **8/10** (interactions critiques OK, features avancées manquantes)

---

## 📝 Notes d'Implémentation

### Ordre Recommandé
1. **Sélection multi-blocs** (fondation pour le reste)
2. **Raccourcis clavier** (utilise la sélection)
3. **Menu contextuel** (utilise la sélection)
4. **Live Markdown** (indépendant, peut être fait en parallèle)

### Pièges à Éviter
- Ne pas oublier de gérer les cas edge (sélection vide, bloc unique, etc.)
- Tester sur différents navigateurs (Chrome, Firefox, Safari)
- Vérifier la performance avec beaucoup de blocs (100+)
- Gérer les conflits entre raccourcis (ex: Cmd+D natif vs custom)

### Tests Manuels Essentiels
- Sélectionner 10 blocs → Cmd+D → vérifier duplication
- Sélectionner 5 blocs → Delete → vérifier suppression
- Clic droit sur bloc → vérifier menu
- Taper `**bold**` → vérifier conversion
- Taper `# ` → vérifier H1 + continuer à taper

---

**Prêt à commencer ?** 🚀
