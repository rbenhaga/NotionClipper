# Migration BlockNote → Plate

**Date:** Décembre 2024

## Résumé

BlockNote a été complètement supprimé du projet et remplacé par Plate (Slate-based).

## Changements effectués

### 1. Package supprimé
- `packages/blocknote-adapter/` - Supprimé entièrement

### 2. Nouveau package créé
- `packages/plate-adapter/` - Nouveau package avec :
  - `ClipperPlateEditor` - Composant éditeur principal
  - `useClipperPlateEditor` - Hook de gestion d'état
  - `clipperDocToPlate` - Convertisseur ClipperDoc → Plate
  - `plateToClipperDoc` - Convertisseur Plate → ClipperDoc
  - Styles CSS Notion-like
  - Tests unitaires

### 3. Fichiers modifiés
- `packages/ui/package.json` - Dépendance changée vers `@notion-clipper/plate-adapter`
- `packages/ui/src/components/editor/EnhancedContentEditor.tsx` - Import mis à jour
- `apps/notion-clipper-app/src/react/package.json` - Dépendances BlockNote supprimées
- `apps/notion-clipper-app/src/react/vite.config.js` - optimizeDeps mis à jour
- `apps/notion-clipper-app/src/react/src/App.tsx` - Import CSS mis à jour
- `package.json` (root) - Script build:packages mis à jour
- `scripts/license-guardrail.js` - Tous les @blocknote/* maintenant bloqués

### 4. Documentation mise à jour
- `legal/LICENSE_POLICY.md` - Politique de licence mise à jour
- `THIRD_PARTY_NOTICES.md` - BlockNote marqué comme supprimé
- `.kiro/specs/notion-parser/ARCHITECTURE_FINALE.md` - Note de mise à jour ajoutée
- `.kiro/specs/notion-parser/PRAGMATIC_STRATEGY.md` - Note de mise à jour ajoutée

## Commandes à exécuter

```bash
# 1. Installer les dépendances (va télécharger Plate)
cd NotionClipper
pnpm install

# 2. Vérifier le guardrail (doit passer)
pnpm run license:check

# 3. Build le nouveau package plate-adapter
pnpm --filter @notion-clipper/plate-adapter build

# 4. Build le package UI
pnpm --filter @notion-clipper/ui build

# 5. Build l'app
pnpm --filter @notion-clipper/app build:frontend
```

## Vérification

Après les builds, vérifier que :
- [ ] `pnpm run license:check` passe sans erreur
- [ ] Aucun `@blocknote/*` dans `pnpm-lock.yaml`
- [ ] L'éditeur fonctionne avec le slash menu `/`
- [ ] Les blocs sont préservés (pas de fusion en un seul bloc)
- [ ] Le roundtrip ClipperDoc → Plate → ClipperDoc est stable

## AI Features

L'IA est **désactivée par défaut** via le flag `enableAi={false}`.

Pour activer l'IA plus tard :
```tsx
<ClipperPlateEditor
  enableAi={true}
  // Les commandes AI apparaîtront dans le slash menu
/>
```

L'implémentation AI sera "chez nous" - pas de dépendance externe.

## Rollback (si nécessaire)

En cas de problème, le code BlockNote peut être restauré depuis git :
```bash
git checkout HEAD~1 -- packages/blocknote-adapter
```

Mais cela n'est pas recommandé - Plate est la direction choisie.
