# Plan "Plate Parfait" - Notion-like Editor

## État actuel

### Ce qui fonctionne ✅
- Autoformat rules configurées (# → H1, - → list, etc.)
- Break plugins (Shift+Enter, Exit break)
- Reset node (Backspace au début)
- NodeIdPlugin (IDs stables)
- Typecheck passe

### Ce qui ne fonctionne PAS ❌
1. **Listes/Todos pas rendus** - `BaseListPlugin` ne suffit pas, il faut les plugins spécifiques + components
2. **Slash `/h1` reste écrit** - Le menu custom ne supprime pas le trigger
3. **Pas de handles** - Pas de DnD, pas de BlockMenu
4. **Pas de BlockSelection** - Ctrl+A ne sélectionne pas "Notion-like"

---

## Plan d'action

### Phase 1: List Plugins + Components (CRITIQUE)

**Packages à ajouter:**
```bash
pnpm add @udecode/plate-list @udecode/plate-indent-list --filter @notion-clipper/plate-adapter
```

**Fichiers à modifier:**

1. `editorPlugins.ts` - Remplacer `BaseListPlugin` par:
   - `BulletedListPlugin`
   - `NumberedListPlugin`
   - `ListItemPlugin`
   - `TodoListPlugin` (ou `BaseTogglePlugin` selon version)

2. Créer `components/plate-elements.tsx` - Components React pour:
   - `BulletedListElement`
   - `NumberedListElement`
   - `ListItemElement`
   - `TodoListElement` (checkbox)

3. `ClipperPlateEditor.tsx` - Passer les components au `createPlateEditor`

### Phase 2: Slash Menu propre (SlashInputPlugin)

**Packages:**
```bash
pnpm add @udecode/plate-slash-command --filter @notion-clipper/plate-adapter
```

**Fichiers:**

1. `editorPlugins.ts` - Ajouter `SlashInputPlugin`
2. Créer `components/SlashInputElement.tsx` - Composant qui:
   - Affiche le menu
   - Supprime le trigger `/` + query
   - Applique la transformation

3. Supprimer le slash menu custom dans `ClipperPlateEditor.tsx`

### Phase 3: Block Selection (Ctrl+A Notion-like)

**Packages:**
```bash
pnpm add @udecode/plate-selection --filter @notion-clipper/plate-adapter
```

**Fichiers:**

1. `editorPlugins.ts` - Ajouter `BlockSelectionPlugin`
2. CSS pour la sélection de blocs

### Phase 4: DnD + Block Menu (handles)

**Packages:**
```bash
pnpm add @udecode/plate-dnd @udecode/plate-block-menu --filter @notion-clipper/plate-adapter
```

**Fichiers:**

1. `editorPlugins.ts` - Ajouter `DndPlugin`, `BlockMenuPlugin`
2. Créer `components/BlockHandle.tsx` - Le "⋮⋮" draggable
3. Créer `components/BlockMenu.tsx` - Le menu "+"

---

## Ordre d'exécution recommandé

```
1. Phase 1 (Lists) - Sans ça, l'éditeur est inutilisable
   └── 2-3h de travail

2. Phase 2 (Slash) - UX critique
   └── 1-2h de travail

3. Phase 3 (Selection) - Nice to have
   └── 1h de travail

4. Phase 4 (DnD) - Polish
   └── 2-3h de travail
```

---

## Alternative: Utiliser Plate UI

Plate fournit des composants pré-faits via `@udecode/plate-ui`. C'est plus rapide mais moins customisable.

```bash
pnpm add @udecode/plate-ui --filter @notion-clipper/plate-adapter
```

Puis importer les composants directement au lieu de les créer.

---

## Décision requise

**Option A**: Implémenter Phase 1 + 2 maintenant (minimum viable)
**Option B**: Utiliser @udecode/plate-ui pour aller plus vite
**Option C**: Garder le setup actuel et documenter les limitations

Quelle option tu préfères?
