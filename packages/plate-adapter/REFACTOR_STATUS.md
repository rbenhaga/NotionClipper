# Plate Adapter Refactor Status

**Date:** 20 Décembre 2024
**Objectif:** Implémenter une expérience Notion-like complète avec Plate v52

## ✅ Migration vers Plate v52 (DONE)

### Packages mis à jour
- `platejs` v52.0.15 (core)
- `@platejs/autoformat` v52.0.11
- `@platejs/dnd` v52.0.11 (DnD avec render.aboveSlate/aboveNodes)
- `@platejs/selection` v52.0.16 (BlockSelectionPlugin)
- Autres plugins restent sur `@udecode/plate-*` v49 (compatibles)

### Imports corrigés
- `platejs` et `platejs/react` pour le core
- `@platejs/dnd` pour DndPlugin
- `@platejs/selection/react` pour BlockSelectionPlugin
- `@platejs/autoformat` pour AutoformatPlugin

## ✅ DnD & BlockSelection (DONE)

### DndPlugin v52
- `render.aboveSlate`: Injecte DndProvider automatiquement
- `render.aboveNodes`: Wrappe chaque bloc avec BlockDraggable
- Plus besoin de wrapper manuel dans le composant

### BlockSelectionPlugin v52
- Import depuis `@platejs/selection/react`
- Configuration avec `areaOptions` pour le scroll

## ✅ Build & Tests (DONE)

```bash
# Typecheck
pnpm --filter @notion-clipper/plate-adapter typecheck  # ✅ OK

# Build
pnpm --filter @notion-clipper/plate-adapter build      # ✅ OK

# Tests
pnpm --filter @notion-clipper/plate-adapter test       # ✅ 40/40 passing
```

## 🔄 Prochaines étapes (TODO)

### P0 - Test en live
- [ ] Lancer l'app avec `pnpm --filter notion-clipper-app dev -- --force`
- [ ] Vérifier que les drag handles apparaissent au hover
- [ ] Tester le drag & drop de blocs
- [ ] Tester Ctrl+A pour la sélection de blocs

### P1 - Polish DnD
- [ ] Ajuster le positionnement du gutter (left: -44px peut varier selon le layout)
- [ ] Ajouter des styles hover plus visibles
- [ ] Tester avec différents types de blocs (headings, lists, code blocks)

### P2 - Conversions ClipperDoc
- [x] Mettre à jour `clipperDocToPlate.ts` pour les nouveaux types (callout, toggle, table)
- [x] Mettre à jour `plateToClipperDoc.ts` pour les nouveaux types
- [ ] Ajouter des tests roundtrip pour Table, Callout, Toggle
- Note: mention et embed ne sont pas des types ClipperDoc natifs (convertis en paragraph/image)

### P3 - Polish
- [ ] Emoji picker (`:emoji:`)
- [ ] Mention autocomplete
- [ ] Image upload/resize
- [ ] Link dialog dans FloatingToolbar

## Packages installés

```json
{
  "platejs": "^52.0.15",
  "@platejs/autoformat": "^52.0.11",
  "@platejs/dnd": "^52.0.11",
  "@platejs/selection": "^52.0.16",
  "@udecode/plate-basic-marks": "^49.0.0",
  "@udecode/plate-block-quote": "^49.0.0",
  "@udecode/plate-break": "^49.0.0",
  "@udecode/plate-callout": "^49.0.0",
  "@udecode/plate-code-block": "^49.0.0",
  "@udecode/plate-heading": "^49.0.0",
  "@udecode/plate-horizontal-rule": "^49.0.0",
  "@udecode/plate-indent": "^49.0.0",
  "@udecode/plate-indent-list": "^49.0.0",
  "@udecode/plate-link": "^49.0.0",
  "@udecode/plate-list": "^49.0.0",
  "@udecode/plate-media": "^49.0.0",
  "@udecode/plate-mention": "^49.0.0",
  "@udecode/plate-reset-node": "^49.0.0",
  "@udecode/plate-table": "^49.0.0",
  "@udecode/plate-toggle": "^49.0.0"
}
```

## Fichiers modifiés

### Migration v52
- `package.json` - Nouvelles dépendances platejs v52
- `src/plugins/editorPlugins.ts` - Imports mis à jour, DndPlugin avec render hooks
- `src/components/ClipperPlateEditor.tsx` - Imports platejs/react
- `src/hooks/useClipperPlateEditor.ts` - Imports platejs
- `src/commands/blockCommands.ts` - Import PlateEditor
- `src/plugins/HorizontalRulePlugin.tsx` - Import createPlatePlugin
- `src/plugins/autoformatRules.ts` - Imports @platejs/autoformat
- `src/components/plate-ui/*.tsx` - Imports platejs/react
- `src/components/plate-elements.tsx` - Imports platejs/react

### Fichiers supprimés (quarantaine)
- `src/components/_old_draggable-elements.tsx`
- `src/components/_old_withDraggable.tsx`
- `src/components/BlockDraggable.tsx` (doublon)
