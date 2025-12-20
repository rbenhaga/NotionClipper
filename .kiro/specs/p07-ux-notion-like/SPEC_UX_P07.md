# P0.7 UX Notion-like — Spec UI/UX

> **Objectif**: Améliorer l'expérience utilisateur pour atteindre un niveau "Notion-like" avec feedback clair sur les envois, navigation rapide, et onboarding fluide.

---

## 1. État actuel de l'UI

### 1.1 Layout actuel (2 colonnes)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER (h-14)                                                       │
│ [Logo] Clipper Pro [Sync OK] │ [Quota: X clips] │ Actions │ Window  │
├──────────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR      │ CONTENT AREA                                         │
│ (w-80)       │                                                      │
│              │  ┌─────────────────────────────────────────────┐     │
│ PageList     │  │ ClipperPlateEditor                          │     │
│ - Page 1     │  │ (max-w-3xl mx-auto)                         │     │
│ - Page 2     │  │                                             │     │
│ - Page 3     │  │ [Contenu éditable Plate v49]                │     │
│              │  │                                             │     │
│              │  └─────────────────────────────────────────────┘     │
│              │                                                      │
│              │  ┌─────────────────────────────────────────────┐     │
│              │  │ TOOLBAR BOTTOM                              │     │
│              │  │ [Sections] | [Voice][Templates][Attach] [Send]│   │
│              │  └─────────────────────────────────────────────┘     │
└──────────────┴──────────────────────────────────────────────────────┘
```

### 1.2 Composants existants

| Composant | Fichier | Rôle |
|-----------|---------|------|
| Header | `layout/Header.tsx` | Logo, status, quotas, actions fenêtre |
| Sidebar | `layout/Sidebar.tsx` | Container animé pour PageList |
| EnhancedContentEditor | `editor/EnhancedContentEditor.tsx` | Éditeur + toolbar + TOC flottant |
| ClipperPlateEditor | `plate-adapter/ClipperPlateEditor.tsx` | Éditeur Plate v49 |
| MultiPageTOCManager | `editor/toc/` | Gestion TOC multi-pages |

### 1.3 Ce qui fonctionne bien ✅

- Éditeur Plate avec ClipperDoc comme source de vérité
- Envoi structuré vers Notion (children nichés)
- TOC multi-pages avec insertion ciblée
- Quotas affichés dans Header (FREE users)
- Mode compact / Focus mode

### 1.4 Ce qui manque ❌

1. **Delivery Center**: Aucun feedback post-envoi (succès/échec/dégradations)
2. **Command Palette**: Pas de raccourci Ctrl+K pour actions rapides
3. **Slash menu**: Basique, pas de catégories ni recherche
4. **Block handles**: Pas de drag & drop ni menu contextuel
5. **Onboarding**: Fonctionnel mais pas guidé (3 étapes)

---

## 2. Spec P0.7 — Delivery Center

### 2.1 Objectif

Afficher un panneau latéral (ou modal) après chaque envoi avec:
- Status global (succès/partiel/échec)
- Compteurs: blocs convertis / skipped / dégradés
- Liste des dégradations avec CTA "Show me where"
- Historique des derniers envois

### 2.2 Wireframe

```
┌─────────────────────────────────────────┐
│ DELIVERY CENTER                    [X]  │
├─────────────────────────────────────────┤
│ ✅ Envoi réussi                         │
│ Page: "Meeting Notes"                   │
│ 12 blocs envoyés • 2 dégradés           │
├─────────────────────────────────────────┤
│ ⚠️ Dégradations (2)                     │
│ ┌─────────────────────────────────────┐ │
│ │ • columnList → paragraphs           │ │
│ │   [Show in Notion ↗]                │ │
│ │ • table → text (no API support)     │ │
│ │   [Show in Notion ↗]                │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 📊 Conversion Report                    │
│ Converted: 10 │ Skipped: 0 │ Degraded: 2│
├─────────────────────────────────────────┤
│ 📜 Historique récent                    │
│ • 14:32 - "Daily Standup" ✅            │
│ • 14:28 - "Project Ideas" ⚠️ 1 degraded │
│ • 14:15 - "Quick Note" ✅               │
└─────────────────────────────────────────┘
```

### 2.3 Données requises

```typescript
interface DeliveryReport {
  deliveryId: string;
  timestamp: number;
  pageId: string;
  pageTitle: string;
  status: 'success' | 'partial' | 'failed';
  conversionReport: {
    blocksConverted: number;
    blocksSkipped: number;
    degraded: Array<{
      originalType: string;
      fallbackType: string;
      blockId?: string;
      reason: string;
    }>;
  };
  error?: string;
  notionUrl?: string;
}
```

### 2.4 Intégration

- **Source**: `clipperToNotionWithReport()` retourne `ConversionReport`
- **Storage**: `contentToBlocks` log le report, stocker dans `deliveryHistory[]`
- **Trigger**: Après `sendToNotion()`, ouvrir Delivery Center si dégradations > 0
- **CTA "Show in Notion"**: Ouvrir `notion.so/pageId#blockId` dans navigateur

### 2.5 Fichiers à créer/modifier

| Action | Fichier |
|--------|---------|
| CREATE | `packages/ui/src/components/delivery/DeliveryCenter.tsx` |
| CREATE | `packages/ui/src/components/delivery/DeliveryReport.tsx` |
| CREATE | `packages/ui/src/hooks/useDeliveryHistory.ts` |
| MODIFY | `packages/core-electron/src/services/notion.service.ts` (retourner report) |
| MODIFY | `apps/notion-clipper-app/src/react/src/App.tsx` (state + trigger) |

---

## 3. Spec P0.7 — Command Palette (Ctrl+K)

### 3.1 Objectif

Palette de commandes globale accessible via `Ctrl+K` (ou `Cmd+K` sur Mac) pour:
- Actions rapides (Send, Clear, Toggle sidebar...)
- Navigation (Go to page, Go to settings...)
- Recherche dans les pages Notion

### 3.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Type a command or search...                            [Esc] │
├─────────────────────────────────────────────────────────────────┤
│ ACTIONS                                                         │
│ ├─ ⌘↵  Send to Notion                                          │
│ ├─ ⌘⌫  Clear clipboard                                         │
│ ├─ ⌘B  Toggle sidebar                                          │
│ └─ ⌘,  Open settings                                           │
├─────────────────────────────────────────────────────────────────┤
│ PAGES (recent)                                                  │
│ ├─ 📄 Meeting Notes                                             │
│ ├─ 📄 Project Ideas                                             │
│ └─ 📄 Daily Standup                                             │
├─────────────────────────────────────────────────────────────────┤
│ NAVIGATION                                                      │
│ ├─ Go to History                                                │
│ ├─ Go to Queue                                                  │
│ └─ Go to Activity                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Comportement

1. `Ctrl+K` ouvre la palette (focus sur input)
2. Typing filtre les commandes/pages en temps réel
3. `↑↓` pour naviguer, `Enter` pour exécuter
4. `Esc` ferme la palette
5. Commandes groupées par catégorie

### 3.4 Fichiers à créer

| Action | Fichier |
|--------|---------|
| CREATE | `packages/ui/src/components/command/CommandPalette.tsx` |
| CREATE | `packages/ui/src/components/command/CommandItem.tsx` |
| CREATE | `packages/ui/src/hooks/useCommandPalette.ts` |
| MODIFY | `apps/notion-clipper-app/src/react/src/App.tsx` (keyboard listener) |

---

## 4. Spec P0.7 — Slash Menu amélioré ✅ IMPLÉMENTÉ

### 4.1 Objectif

Améliorer le slash menu existant avec:
- ✅ Recherche fuzzy (filter par label/description/key)
- ✅ Raccourcis clavier affichés (/hea, /bul, etc.)
- ✅ Navigation clavier (↑↓ Enter Esc)
- ✅ Indicateur de filtre actif
- ⏳ Catégories (Basic, Lists, Media, Advanced) - TODO
- ⏳ Preview du bloc avant insertion - TODO

### 4.2 Wireframe

```
┌─────────────────────────────────────────┐
│ 🔍 Filter blocks...                     │
├─────────────────────────────────────────┤
│ BASIC BLOCKS                            │
│ ├─ ¶  Paragraph           (default)     │
│ ├─ H1 Heading 1           /h1           │
│ ├─ H2 Heading 2           /h2           │
│ └─ H3 Heading 3           /h3           │
├─────────────────────────────────────────┤
│ LISTS                                   │
│ ├─ •  Bullet list         /ul           │
│ ├─ 1. Numbered list       /ol           │
│ └─ ☐  To-do list          /todo         │
├─────────────────────────────────────────┤
│ MEDIA                                   │
│ ├─ 🖼  Image               /img          │
│ ├─ 📎 File                 /file         │
│ └─ 💻 Code block           /code         │
├─────────────────────────────────────────┤
│ ADVANCED                                │
│ ├─ ❝  Quote                /quote        │
│ ├─ ─  Divider              /hr           │
│ └─ 📢 Callout              /callout      │
└─────────────────────────────────────────┘
```

### 4.3 Intégration Plate v49

Le slash menu utilise déjà `@udecode/plate-slash-command`. Améliorations:
- Ajouter `SlashInputElement` avec catégories
- Utiliser `fuzzyMatch` pour la recherche
- Afficher preview inline (optionnel)

### 4.4 Fichiers à modifier

| Action | Fichier |
|--------|---------|
| MODIFY | `packages/plate-adapter/src/plugins/slashCommandPlugin.ts` |
| CREATE | `packages/plate-adapter/src/components/SlashMenu.tsx` |
| MODIFY | `packages/plate-adapter/src/components/ClipperPlateEditor.tsx` |

---

## 5. Spec P0.7 — Block Handles

### 5.1 Objectif

Ajouter des "handles" sur chaque bloc pour:
- Drag & drop (réorganiser les blocs)
- Menu contextuel (duplicate, delete, turn into...)

### 5.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⋮⋮ │ # Heading 1                                               │
│     │                                                           │
│  ⋮⋮ │ This is a paragraph with some text content.               │
│     │                                                           │
│  ⋮⋮ │ • Bullet item 1                                           │
│  ⋮⋮ │ • Bullet item 2                                           │
│     │                                                           │
└─────────────────────────────────────────────────────────────────┘

[Hover sur ⋮⋮]
┌─────────────────┐
│ ↕ Drag to move  │
│ ─────────────── │
│ 📋 Duplicate    │
│ 🗑 Delete       │
│ ↻ Turn into...  │
│   ├─ Paragraph  │
│   ├─ Heading 1  │
│   └─ Bullet     │
└─────────────────┘
```

### 5.3 Intégration Plate v49

Utiliser `@udecode/plate-dnd` pour le drag & drop:
- `DndPlugin` pour le système de drag
- `DraggableElement` wrapper pour chaque bloc
- `BlockSelectionPlugin` pour sélection multi-blocs

### 5.4 Fichiers à créer/modifier

| Action | Fichier |
|--------|---------|
| CREATE | `packages/plate-adapter/src/components/BlockHandle.tsx` |
| CREATE | `packages/plate-adapter/src/components/BlockContextMenu.tsx` |
| MODIFY | `packages/plate-adapter/src/plugins/index.ts` (ajouter DndPlugin) |
| MODIFY | `packages/plate-adapter/src/components/ClipperPlateEditor.tsx` |

---

## 6. Spec P0.7 — Onboarding 3 étapes

### 6.1 Objectif

Guider l'utilisateur avec 3 étapes claires:
1. **Connect Notion**: OAuth Notion workspace
2. **Import exemple**: Clipper un contenu exemple
3. **Première réussite**: Envoyer vers Notion

### 6.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  STEP 1 of 3                              [Skip] [Next →]       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  🔗 Connect your Notion workspace                               │
│                                                                 │
│  Clipper Pro needs access to your Notion pages to send          │
│  your clips directly where you need them.                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  [🔐 Connect with Notion]                               │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ✓ Secure OAuth 2.0 authentication                              │
│  ✓ We never store your Notion password                          │
│  ✓ Revoke access anytime from Notion settings                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Étapes détaillées

| Étape | Titre | Action | Validation |
|-------|-------|--------|------------|
| 1 | Connect Notion | OAuth flow | `notionToken` présent |
| 2 | Import exemple | Copier texte exemple | `clipboard.text` non vide |
| 3 | Première réussite | Envoyer vers page | `sendToNotion` success |

### 6.4 Fichiers à modifier

| Action | Fichier |
|--------|---------|
| MODIFY | `packages/ui/src/components/onboarding/Onboarding.tsx` |
| CREATE | `packages/ui/src/components/onboarding/OnboardingStep.tsx` |
| CREATE | `packages/ui/src/components/onboarding/OnboardingProgress.tsx` |

---

## 7. Tickets P0.7 découpés

### 7.1 Delivery Center (P0.7-DC)

| Ticket | Titre | Effort | Priorité |
|--------|-------|--------|----------|
| P0.7-DC-1 | Créer composant DeliveryCenter.tsx | 2h | HIGH |
| P0.7-DC-2 | Hook useDeliveryHistory avec localStorage | 1h | HIGH |
| P0.7-DC-3 | Modifier notion.service pour retourner ConversionReport | 1h | HIGH |
| P0.7-DC-4 | Intégrer dans App.tsx (state + trigger) | 1h | HIGH |
| P0.7-DC-5 | CTA "Show in Notion" avec deep link | 30min | MEDIUM |

### 7.2 Command Palette (P0.7-CP)

| Ticket | Titre | Effort | Priorité |
|--------|-------|--------|----------|
| P0.7-CP-1 | Créer composant CommandPalette.tsx | 2h | MEDIUM |
| P0.7-CP-2 | Hook useCommandPalette avec fuzzy search | 1h | MEDIUM |
| P0.7-CP-3 | Keyboard listener Ctrl+K dans App.tsx | 30min | MEDIUM |
| P0.7-CP-4 | Actions: Send, Clear, Toggle sidebar | 1h | MEDIUM |
| P0.7-CP-5 | Navigation: Pages, Settings, History | 1h | LOW |

### 7.3 Slash Menu (P0.7-SM)

| Ticket | Titre | Effort | Priorité |
|--------|-------|--------|----------|
| P0.7-SM-1 | Refactor SlashMenu avec catégories | 2h | MEDIUM |
| P0.7-SM-2 | Ajouter fuzzy search | 1h | MEDIUM |
| P0.7-SM-3 | Afficher raccourcis clavier | 30min | LOW |

### 7.4 Block Handles (P0.7-BH)

| Ticket | Titre | Effort | Priorité |
|--------|-------|--------|----------|
| P0.7-BH-1 | Intégrer DndPlugin Plate | 2h | MEDIUM |
| P0.7-BH-2 | Créer BlockHandle.tsx | 1h | MEDIUM |
| P0.7-BH-3 | Menu contextuel (duplicate, delete, turn into) | 2h | MEDIUM |

### 7.5 Onboarding (P0.7-OB)

| Ticket | Titre | Effort | Priorité |
|--------|-------|--------|----------|
| P0.7-OB-1 | Refactor Onboarding en 3 étapes | 2h | LOW |
| P0.7-OB-2 | Step 2: Import exemple interactif | 1h | LOW |
| P0.7-OB-3 | Step 3: Célébration première réussite | 1h | LOW |

---

## 8. Ordre d'implémentation recommandé

```
Phase 1 (P0.7a) - Feedback critique
├── P0.7-DC-1 → P0.7-DC-4 (Delivery Center core)
└── P0.7-DC-5 (Deep links)

Phase 2 (P0.7b) - Navigation rapide  
├── P0.7-CP-1 → P0.7-CP-3 (Command Palette core)
└── P0.7-CP-4 → P0.7-CP-5 (Actions)

Phase 3 (P0.7c) - Édition avancée
├── P0.7-SM-1 → P0.7-SM-3 (Slash Menu)
└── P0.7-BH-1 → P0.7-BH-3 (Block Handles)

Phase 4 (P0.7d) - Onboarding
└── P0.7-OB-1 → P0.7-OB-3
```

---

## 9. Acceptance Criteria globaux

### 9.1 Delivery Center
- [ ] Après envoi, si `degraded.length > 0`, ouvrir automatiquement
- [ ] Afficher compteurs (converted/skipped/degraded)
- [ ] CTA "Show in Notion" ouvre la page au bon bloc
- [ ] Historique des 10 derniers envois persisté

### 9.2 Command Palette
- [ ] `Ctrl+K` ouvre la palette
- [ ] Recherche fuzzy fonctionne
- [ ] `Enter` exécute la commande sélectionnée
- [ ] `Esc` ferme la palette

### 9.3 Slash Menu
- [ ] `/` ouvre le menu avec catégories
- [ ] Recherche filtre en temps réel
- [ ] Raccourcis affichés à droite

### 9.4 Block Handles
- [ ] Hover sur bloc affiche le handle
- [ ] Drag & drop réorganise les blocs
- [ ] Menu contextuel avec actions

### 9.5 Onboarding
- [ ] 3 étapes claires avec progression
- [ ] Chaque étape validée avant suivante
- [ ] Célébration à la fin

---

## 10. Notes techniques

### 10.1 ConversionReport déjà implémenté

Le `ConversionReport` existe déjà dans `clipperToNotion.ts`:
```typescript
interface ConversionReport {
  blocksConverted: number;
  blocksSkipped: number;
  degraded: string[];
}
```

Il faut:
1. Enrichir `degraded` avec plus de détails (originalType, fallbackType, blockId)
2. Retourner le report depuis `contentToBlocks`
3. Propager jusqu'à l'UI

### 10.2 Plate v49 plugins disponibles

- `@udecode/plate-dnd` - Drag & drop
- `@udecode/plate-block-quote` - Quotes
- `@udecode/plate-slash-command` - Slash menu (déjà utilisé)
- `@udecode/plate-selection` - Block selection

### 10.3 Design System tokens

Utiliser les tokens existants:
- `--ds-primary` pour CTA
- `--ds-success` / `--ds-error` pour status
- `--ds-bg-muted` pour backgrounds secondaires


---

## 11. Implémentation P0.7a - Plate Perfect (DONE)

### 11.1 Autoformat (Markdown shortcuts) ✅

Fichier: `packages/plate-adapter/src/plugins/autoformatRules.ts`

Shortcuts implémentés:
- `# ` → H1
- `## ` → H2
- `### ` → H3
- `- ` ou `* ` → Bullet list
- `1. ` → Numbered list
- `[] ` → Todo
- `> ` → Quote
- ``` → Code block
- `---` → Divider
- `**text**` → Bold
- `*text*` → Italic
- `` `text` `` → Inline code
- `~~text~~` → Strikethrough

### 11.2 Break Plugins ✅

Fichier: `packages/plate-adapter/src/plugins/editorPlugins.ts`

- `Shift+Enter` → Soft break (line break, pas nouveau bloc)
- `Enter` dans code block → Soft break
- `Mod+Enter` → Exit break (nouveau paragraphe)
- `Enter` à la fin d'un heading → Exit vers paragraphe
- `Enter` à la fin d'une quote → Exit vers paragraphe

### 11.3 Reset Node ✅

- `Backspace` au début d'un heading/quote → Reset vers paragraphe

### 11.4 Slash Menu amélioré ✅

Fichier: `packages/plate-adapter/src/schema/notionLikeUi.tsx`

- Navigation clavier (↑↓ Enter Esc)
- Recherche fuzzy en temps réel
- Indicateur de filtre actif
- Raccourcis affichés (/hea, /bul, etc.)
- Hint clavier en bas du menu

### 11.5 Plugin Order ✅

Ordre critique respecté:
1. Core blocks (paragraph, heading, list, quote, code, hr, link)
2. Marks (bold, italic, underline, strikethrough, code)
3. Autoformat
4. SoftBreak
5. ExitBreak
6. ResetNode
7. TrailingBlock
8. NodeId

### 11.6 Tests ✅

40 tests passent:
- `blockCommands.test.ts` (20 tests)
- `roundtrip.test.ts` (20 tests)

### 11.7 Fichiers créés/modifiés

| Action | Fichier |
|--------|---------|
| CREATE | `packages/plate-adapter/src/plugins/autoformatRules.ts` |
| CREATE | `packages/plate-adapter/src/plugins/editorPlugins.ts` |
| MODIFY | `packages/plate-adapter/src/components/ClipperPlateEditor.tsx` |
| MODIFY | `packages/plate-adapter/src/schema/notionLikeUi.tsx` |
| MODIFY | `packages/plate-adapter/src/styles/plate-notion.css` |
| MODIFY | `packages/plate-adapter/package.json` (ajout dépendances) |

### 11.8 Dépendances ajoutées

```json
"@udecode/plate-autoformat": "^49.0.0",
"@udecode/plate-break": "^49.0.0",
"@udecode/plate-reset-node": "^49.0.0"
```
