# 🔍 AUDIT COMPLET - NotionEditor Migration

**Date**: 16 Décembre 2024  
**Status**: Migration Phase 1 terminée, Phase 2 en cours  
**Objectif**: Reproduire fidèlement l'UX Notion

---

## ✅ CE QUI EST FAIT (Phase 1)

### 1. Architecture Modulaire ✅
- [x] Package `notion-editor` créé et fonctionnel
- [x] Hooks séparés (useEditorState, useFormattingMenu, useSlashCommands, useDragAndDrop, useLiveMarkdown, useLineStartShortcuts)
- [x] Composants UI séparés (EditorArea, FormattingToolbar, SlashMenu, DragHandle)
- [x] NotionEditor principal < 350 lignes
- [x] Build passe sans erreurs TypeScript

### 2. Édition de Base ✅
- [x] contentEditable fonctionnel
- [x] Curseur stable (fix du bug "abc" → "cba")
- [x] Conversion HTML ↔ Markdown
- [x] Gestion du focus
- [x] Placeholder

### 3. Line-Start Shortcuts ✅
- [x] `# ` → H1 (avec styles inline)
- [x] `## ` → H2 (avec styles inline)
- [x] `### ` → H3 (avec styles inline)
- [x] `- ` → Bullet list
- [x] `1. ` → Numbered list
- [x] `[] ` → Todo
- [x] `> ` → Quote
- [x] `---` → Divider

### 4. Slash Commands ✅
- [x] Menu s'ouvre sur `/`
- [x] Filtrage en temps réel
- [x] Navigation clavier (↑/↓, Enter, Escape)
- [x] Design Notion-like avec icônes SVG
- [x] Catégories visuelles
- [x] Descriptions des commandes

### 5. Formatting Toolbar ✅
- [x] Apparaît sur sélection texte
- [x] Design Notion-like avec icônes SVG
- [x] Boutons: Bold, Italic, Underline, Strikethrough, Code, Link
- [x] Séparateur entre inline et block formatting
- [x] Boutons H1/H2/H3

### 6. Drag & Drop ✅
- [x] Poignée ⋮⋮ apparaît au hover
- [x] Drag fonctionnel
- [x] Preview du bloc en transparent
- [x] Drop indicator (ligne bleue)
- [x] Réorganisation des blocs

### 7. Checkbox/Todo ✅
- [x] Design custom (appearance: none)
- [x] Checkmark avec pseudo-element
- [x] Couleur Notion blue
- [x] Transitions au hover
- [x] Support dark mode

### 8. Styles CSS ✅
- [x] Headings avec tailles Notion
- [x] Listes (bullet, numbered)
- [x] Quote, Divider, Code
- [x] Drag & drop states
- [x] Support dark mode

---

## ❌ CE QUI MANQUE (Gaps Critiques)

### 🔴 PRIORITÉ MAX - Interactions Utilisateur

#### 1. Clic Droit / Menu Contextuel ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: CRITIQUE - C'est une feature signature de Notion

**Ce qui manque**:
- [ ] Clic droit sur bloc → menu contextuel
- [ ] Actions: Turn into, Color, Duplicate, Delete, Move to, Copy link, Comment
- [ ] Clic droit sur texte sélectionné → laisser menu natif OU toolbar
- [ ] Menu contextuel sur poignée ⋮⋮

**Implémentation requise**:
```typescript
// Hook useBlockContextMenu
interface BlockContextMenuProps {
  editorRef: React.RefObject<HTMLElement>;
  onAction: (action: BlockAction, blockId: string) => void;
}

type BlockAction = 
  | 'turn-into'
  | 'color'
  | 'duplicate'
  | 'delete'
  | 'move-to'
  | 'copy-link'
  | 'comment';
```

#### 2. Sélection Multi-Blocs ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: CRITIQUE - Essentiel pour productivité

**Ce qui manque**:
- [ ] `Esc` → sélectionne le bloc courant
- [ ] `Shift + ↑/↓` → étend la sélection
- [ ] `Shift + Click` → sélection en intervalle
- [ ] Drag dans la marge → lasso vertical
- [ ] `Cmd/Ctrl + D` → duplique sélection
- [ ] `Delete/Backspace` → supprime sélection
- [ ] `Cmd/Ctrl + Shift + ↑/↓` → déplace sélection
- [ ] Styles visuels: bordure gauche bleue + fond bleu léger

**Implémentation requise**:
```typescript
// Hook useBlockSelection
interface UseBlockSelectionReturn {
  selectedBlockIds: Set<string>;
  selectBlock: (id: string) => void;
  selectRange: (startId: string, endId: string) => void;
  clearSelection: () => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  moveSelection: (direction: 'up' | 'down') => void;
}
```

#### 3. Raccourcis Clavier Globaux ❌
**Status**: PARTIELLEMENT IMPLÉMENTÉ  
**Impact**: ÉLEVÉ

**Ce qui manque**:
- [ ] `Cmd/Ctrl + /` → palette de commandes bloc
- [ ] `Cmd/Ctrl + D` → duplicate bloc(s)
- [ ] `Cmd/Ctrl + Shift + ↑/↓` → déplacer bloc(s)
- [ ] `Cmd/Ctrl + Shift + M` → comment
- [ ] `Tab / Shift+Tab` → indent/outdent (nesting)

**Déjà implémenté**:
- [x] `Cmd/Ctrl + B/I/U` → bold/italic/underline (via execCommand)
- [x] `Cmd/Ctrl + E` → inline code (via toolbar)
- [x] `Cmd/Ctrl + K` → link (via toolbar)

#### 4. Slash Menu Contextuel ❌
**Status**: BASIQUE IMPLÉMENTÉ  
**Impact**: MOYEN

**Ce qui manque**:
- [ ] Slash sur bloc non vide → "Turn into..." au lieu de créer nouveau bloc
- [ ] Slash sur multi-sélection → actions en masse
- [ ] Commandes contextuelles selon type de bloc
- [ ] Catégories dynamiques (Basic, Media, Advanced, Database)

### 🟡 PRIORITÉ HAUTE - Formatage Avancé

#### 5. Liens Améliorés ❌
**Status**: BASIQUE (prompt natif)  
**Impact**: ÉLEVÉ

**Ce qui manque**:
- [ ] Popup input élégant (pas prompt natif)
- [ ] Hover sur lien → tooltip avec URL + actions (Open, Edit, Remove)
- [ ] Liens internes (pages) avec preview
- [ ] Auto-détection URLs lors du paste

#### 6. Mentions (@) ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: MOYEN

**Ce qui manque**:
- [ ] `@` ouvre menu suggestion
- [ ] Suggestions: pages, users, dates
- [ ] `@today`, `@tomorrow`, etc.
- [ ] Chip inline non éditable
- [ ] Suppression via backspace

#### 7. Équations (KaTeX) ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: FAIBLE (nice-to-have)

**Ce qui manque**:
- [ ] Inline: `$$latex$$`
- [ ] Bloc: `/math`
- [ ] Click → mode édition
- [ ] Rendu KaTeX

#### 8. Code Blocks Avancés ❌
**Status**: BASIQUE (`<pre>`)  
**Impact**: MOYEN

**Ce qui manque**:
- [ ] Sélecteur de langage
- [ ] Syntax highlighting (PrismJS)
- [ ] Bouton Copy
- [ ] Option Wrap code
- [ ] Numéros de ligne (optionnel)

### 🟢 PRIORITÉ MOYENNE - Design System

#### 9. Palette de Couleurs ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: MOYEN

**Ce qui manque**:
- [ ] 10 couleurs × (text/bg) × (light/dark)
- [ ] Couleurs: gray, brown, orange, yellow, green, blue, purple, pink, red
- [ ] CSS variables
- [ ] UI pour sélectionner couleur (dans context menu)

#### 10. Typo & Spacing ⚠️
**Status**: PARTIELLEMENT IMPLÉMENTÉ  
**Impact**: FAIBLE

**Ce qui manque**:
- [ ] Font switch (Default/Sans, Serif, Mono)
- [ ] Espacement inter-blocs plus compact (actuellement ~6-10px, OK)
- [ ] Line-height ajustable

**Déjà OK**:
- [x] Texte paragraphe ≈ 16px
- [x] Headings avec bonnes tailles
- [x] Marges verticales

#### 11. États UI ⚠️
**Status**: PARTIELLEMENT IMPLÉMENTÉ  
**Impact**: FAIBLE

**Ce qui manque**:
- [ ] Selected bloc: bordure gauche bleue + fond bleu léger (pour multi-sélection)
- [ ] Animations fade/translate pour popovers (actuellement instantané)

**Déjà OK**:
- [x] Hover bloc: poignée apparaît
- [x] Dragging: ghost + barre insertion
- [x] Menus: ombre douce

### 🔵 PRIORITÉ BASSE - Features Avancées

#### 12. Architecture Blocs Normalisée ❌
**Status**: NON IMPLÉMENTÉ (actuellement flat HTML)  
**Impact**: ÉLEVÉ pour scalabilité

**Ce qui manque**:
- [ ] Store normalisé: `blocksById`, `childrenByParentId`
- [ ] Type `Block` avec `id`, `type`, `parentId`, `props`, `content`
- [ ] Nesting pour listes, toggles, colonnes
- [ ] Synced blocks (plus tard)

**Note**: Actuellement, l'éditeur utilise du HTML flat avec `contentEditable`. Pour une vraie architecture Notion-like, il faudrait migrer vers un modèle de données structuré (comme ProseMirror ou BlockNote).

#### 13. Toggles ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: MOYEN

**Ce qui manque**:
- [ ] Bloc toggle avec chevron
- [ ] Collapse/expand animation
- [ ] Nesting de blocs enfants

#### 14. Callouts ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: FAIBLE

**Ce qui manque**:
- [ ] Bloc callout avec icône + couleur
- [ ] Types: info, warning, error, success

#### 15. Colonnes ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: FAIBLE

**Ce qui manque**:
- [ ] Bloc `column_list` → enfants `column`
- [ ] Drag vers côté → création colonne
- [ ] Resize colonnes

#### 16. Tables ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: FAIBLE

**Ce qui manque**:
- [ ] Table simple (matrice rows × cols)
- [ ] Boutons add row/col
- [ ] Resize colonnes

#### 17. Databases ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: TRÈS FAIBLE (énorme feature)

**Ce qui manque**: Tout (à repousser)

#### 18. Comments ❌
**Status**: NON IMPLÉMENTÉ  
**Impact**: FAIBLE

**Ce qui manque**:
- [ ] Threads sur bloc ou sélection
- [ ] Range offsets pour sélection texte

---

## 🐛 BUGS CONNUS

### 1. Live Markdown Désactivé ⚠️
**Status**: DÉSACTIVÉ dans `handleEditorChange`  
**Raison**: Problèmes de curseur  
**Impact**: MOYEN

**Symptômes**:
- `**bold**` ne se convertit pas automatiquement en **bold**
- `*italic*` ne se convertit pas automatiquement en *italic*

**TODO**: Réactiver après fix du curseur dans `useLiveMarkdown`

### 2. Styles H1/H2/H3 via Slash Commands ⚠️
**Status**: PARTIELLEMENT FIXÉ  
**Impact**: FAIBLE

**Symptômes**:
- Les styles inline sont appliqués via `execCommand` + manipulation DOM
- Fonctionne mais fragile (dépend de `execCommand` deprecated)

**TODO**: Migrer vers une approche plus robuste (ProseMirror ou manipulation DOM directe)

### 3. Drag Handle Disparaît Trop Vite ⚠️
**Status**: PARTIELLEMENT FIXÉ (timeout 500ms)  
**Impact**: FAIBLE

**Symptômes**:
- Le handle disparaît quand on sort de la zone du bloc
- Timeout de 500ms ajouté mais peut être amélioré

**TODO**: Améliorer la détection de hover (zone plus large)

### 4. Paste d'Images ⚠️
**Status**: FONCTIONNE mais pas optimal  
**Impact**: FAIBLE

**Symptômes**:
- Les images sont converties en base64 dans le markdown
- Pas de gestion de quota lors du paste (seulement lors du drop/upload)

**TODO**: Unifier la gestion des images (paste = drop = upload)

---

## 📊 MÉTRIQUES

| Critère | Avant | Après | Objectif | Status |
|---------|-------|-------|----------|--------|
| Lignes composant principal | 4,576 | ~350 | < 350 | ✅ |
| Packages séparés | 0 | 1 | 3+ | ⚠️ |
| Hooks custom | 0 | 6 | 6+ | ✅ |
| Live Markdown | ❌ | ⚠️ | ✅ | ⚠️ (désactivé) |
| Line-start shortcuts | ❌ | ✅ | ✅ | ✅ |
| Clipboard auto-sync | ❌ | ✅ | ✅ | ✅ |
| Clic droit menu | ❌ | ❌ | ✅ | ❌ |
| Multi-sélection | ❌ | ❌ | ✅ | ❌ |
| Mentions (@) | ❌ | ❌ | ✅ | ❌ |
| Liens avancés | ⚠️ | ⚠️ | ✅ | ⚠️ |
| Code blocks avancés | ⚠️ | ⚠️ | ✅ | ⚠️ |
| Palette couleurs | ❌ | ❌ | ✅ | ❌ |
| Architecture blocs | ❌ | ❌ | ✅ | ❌ |

**Score global**: 60% (12/20 features complètes)

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 2A - Interactions Critiques (3-4 jours)
**Priorité**: CRITIQUE

1. **Sélection Multi-Blocs** (1.5 jours)
   - Hook `useBlockSelection`
   - Gestion Esc, Shift+↑/↓, Shift+Click, Lasso
   - Styles visuels
   - Actions: duplicate, delete, move

2. **Menu Contextuel** (1 jour)
   - Hook `useBlockContextMenu`
   - Composant `BlockContextMenu`
   - Actions: Turn into, Color, Duplicate, Delete

3. **Raccourcis Clavier Globaux** (0.5 jour)
   - Hook `useKeyboardShortcuts` centralisé
   - Cmd+/, Cmd+D, Cmd+Shift+↑/↓, Tab/Shift+Tab

4. **Fix Live Markdown** (1 jour)
   - Débugger `useLiveMarkdown`
   - Réactiver dans `handleEditorChange`

### Phase 2B - Formatage Avancé (2-3 jours)
**Priorité**: HAUTE

5. **Liens Améliorés** (1 jour)
   - Popup input élégant
   - Tooltip hover avec actions
   - Auto-détection URLs

6. **Mentions (@)** (1 jour)
   - Hook `useMentions`
   - Menu suggestion
   - Chip inline

7. **Code Blocks Avancés** (1 jour)
   - Sélecteur langage
   - Syntax highlighting (PrismJS)
   - Bouton Copy

### Phase 2C - Design System (1-2 jours)
**Priorité**: MOYENNE

8. **Palette de Couleurs** (1 jour)
   - CSS variables
   - UI sélection couleur
   - Intégration context menu

9. **Animations & Polish** (1 jour)
   - Fade/translate popovers
   - Améliorer transitions
   - Peaufiner spacing

### Phase 3 - Architecture Avancée (5-7 jours)
**Priorité**: BASSE (peut être repoussé)

10. **Migration vers Architecture Blocs** (3 jours)
    - Store normalisé
    - Type `Block`
    - Nesting

11. **Toggles** (1 jour)
12. **Callouts** (1 jour)
13. **Colonnes** (2 jours)

---

## 🚨 DÉCISIONS CRITIQUES À PRENDRE

### 1. Architecture: contentEditable vs ProseMirror/BlockNote ?
**Situation actuelle**: contentEditable pur avec manipulation DOM  
**Problème**: Fragile, difficile à maintenir, limité pour features avancées

**Options**:
- **A) Continuer contentEditable** (rapide mais limité)
  - ✅ Rapide à implémenter
  - ❌ Fragile, bugs de curseur
  - ❌ Difficile pour multi-sélection, nesting, synced blocks
  
- **B) Migrer vers ProseMirror** (robuste mais complexe)
  - ✅ Très robuste, utilisé par Notion
  - ✅ Gestion curseur/sélection native
  - ✅ Undo/redo, collaboration
  - ❌ Courbe d'apprentissage élevée
  - ❌ Refactoring complet (2-3 semaines)
  
- **C) Utiliser BlockNote** (compromis)
  - ✅ Basé sur ProseMirror mais plus simple
  - ✅ Déjà Notion-like
  - ✅ Moins de code custom
  - ❌ Moins de contrôle
  - ❌ Dépendance externe

**Recommandation**: **Option C (BlockNote)** pour MVP, puis migrer vers ProseMirror si besoin de plus de contrôle.

### 2. Scope MVP: Jusqu'où aller ?
**Question**: Quelles features sont vraiment nécessaires pour le MVP ?

**MVP Minimal** (2 semaines):
- ✅ Édition de base (déjà fait)
- ✅ Line-start shortcuts (déjà fait)
- ✅ Slash commands (déjà fait)
- ✅ Formatting toolbar (déjà fait)
- ✅ Drag & drop (déjà fait)
- ⏳ Multi-sélection (critique)
- ⏳ Menu contextuel (critique)
- ⏳ Raccourcis clavier (critique)

**MVP Complet** (4 semaines):
- Tout MVP Minimal +
- ⏳ Liens avancés
- ⏳ Mentions (@)
- ⏳ Code blocks avancés
- ⏳ Palette couleurs

**Recommandation**: Viser **MVP Minimal** d'abord, puis itérer.

### 3. Tests: Quand et comment ?
**Situation actuelle**: Aucun test automatisé

**Recommandation**:
- Tests manuels pour MVP Minimal
- Tests E2E (Playwright) pour MVP Complet
- Tests unitaires pour hooks critiques (useBlockSelection, useKeyboardShortcuts)

---

## 📝 CONCLUSION

### ✅ Points Forts
- Architecture modulaire propre
- Hooks bien séparés
- Build stable
- Design Notion-like pour les features implémentées
- Pas de régressions majeures

### ❌ Points Faibles
- **Manque de features critiques** (multi-sélection, menu contextuel)
- **Architecture contentEditable limitée** pour features avancées
- **Live Markdown désactivé** (bug curseur)
- **Pas de tests automatisés**
- **Pas d'architecture blocs normalisée**

### 🎯 Prochaines Étapes Recommandées

**Immédiat** (cette semaine):
1. Implémenter multi-sélection (critique)
2. Implémenter menu contextuel (critique)
3. Fixer Live Markdown
4. Ajouter raccourcis clavier globaux

**Court terme** (2 semaines):
5. Liens avancés
6. Mentions (@)
7. Code blocks avancés
8. Palette couleurs

**Moyen terme** (1 mois):
9. Évaluer migration vers BlockNote/ProseMirror
10. Architecture blocs normalisée
11. Toggles, Callouts, Colonnes

**Long terme** (2-3 mois):
12. Tables
13. Databases (si vraiment nécessaire)
14. Collaboration temps réel

---

**Verdict Final**: La migration Phase 1 est **réussie** mais **incomplète**. L'éditeur est fonctionnel pour l'édition de base mais **manque de features critiques** pour être vraiment Notion-like. Il faut **absolument** implémenter la multi-sélection et le menu contextuel avant de considérer la migration comme terminée.

**Score de fidélité Notion**: **6/10** (édition de base OK, interactions avancées manquantes)
