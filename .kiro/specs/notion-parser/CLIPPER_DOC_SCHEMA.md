# 📐 CLIPPER DOC SCHEMA - Format Canonique

**Date**: 16 Décembre 2024  
**Version**: 1.0  
**Objectif**: Définir le format canonique interne (source de vérité)

---

## 🎯 PRINCIPE

> **ClipperDoc est la source de vérité. Ni Notion, ni BlockNote.**

```
Notion API ──────┐
                 ├──→ ClipperDoc ←──→ BlockNote (vue/édition)
Clipboard/HTML ──┘         │
                           ↓
                      Notion API (sync)
```

ClipperDoc est:
- **Indépendant** de Notion (pas de dépendance aux types Notion)
- **Indépendant** de BlockNote (pas de dépendance au schéma BN)
- **Extensible** (on peut ajouter des features sans casser)
- **Versionné** (migration possible)

---

## 📦 STRUCTURE PRINCIPALE

```typescript
/**
 * Document Clipper - Format canonique
 * Version 1.0
 */
interface ClipperDocument {
  /** Version du schéma (pour migrations) */
  schemaVersion: '1.0';
  
  /** ID unique du document */
  id: string;
  
  /** Métadonnées du document */
  metadata: ClipperDocumentMetadata;
  
  /** Contenu (arbre de blocs) */
  content: ClipperBlock[];
  
  /** Mapping pour sync Notion */
  notionMapping: ClipperNotionMapping;
}

interface ClipperDocumentMetadata {
  /** Titre du document */
  title: string;
  
  /** Date de création */
  createdAt: string; // ISO 8601
  
  /** Date de dernière modification */
  updatedAt: string; // ISO 8601
  
  /** Source d'origine */
  source: {
    type: 'clipboard' | 'notion' | 'import' | 'manual';
    notionPageId?: string;
    notionWorkspaceId?: string;
    url?: string;
  };
  
  /** Statistiques */
  stats: {
    blockCount: number;
    wordCount: number;
    characterCount: number;
  };
}
```

---

## 🧱 BLOCS

```typescript
/**
 * Bloc Clipper - Unité de contenu
 */
interface ClipperBlock {
  /** ID unique stable (ne change jamais) */
  id: string;
  
  /** Type de bloc */
  type: ClipperBlockType;
  
  /** Contenu inline (pour blocs textuels) */
  content?: ClipperInlineContent[];
  
  /** Propriétés spécifiques au type */
  props: ClipperBlockProps;
  
  /** Blocs enfants (pour nesting) */
  children: ClipperBlock[];
  
  /** Métadonnées internes (non exportées) */
  _meta: {
    /** Hash du contenu pour diff */
    contentHash: string;
    /** Timestamp dernière modification */
    modifiedAt: string;
    /** ID Notion associé (si sync) */
    notionBlockId?: string;
  };
}

type ClipperBlockType =
  // Texte
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  // Listes
  | 'bulletList'
  | 'numberedList'
  | 'todoList'
  | 'toggle'
  // Citations
  | 'quote'
  | 'callout'
  // Code
  | 'code'
  // Media
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'bookmark'
  // Autres
  | 'divider'
  | 'equation'
  | 'table'
  // Dégradés (pour import)
  | 'unsupported';
```


---

## 📝 PROPRIÉTÉS PAR TYPE

```typescript
/**
 * Props spécifiques par type de bloc
 */
type ClipperBlockProps = 
  | ParagraphProps
  | HeadingProps
  | ListItemProps
  | ToggleProps
  | QuoteProps
  | CalloutProps
  | CodeProps
  | ImageProps
  | VideoProps
  | AudioProps
  | FileProps
  | BookmarkProps
  | EquationProps
  | TableProps
  | UnsupportedProps;

// === TEXTE ===

interface ParagraphProps {
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

interface HeadingProps {
  level: 1 | 2 | 3;
  isToggleable: boolean;
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

// === LISTES ===

interface ListItemProps {
  listType: 'bullet' | 'numbered' | 'todo';
  checked?: boolean; // Pour todo
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

interface ToggleProps {
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

// === CITATIONS ===

interface QuoteProps {
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

interface CalloutProps {
  icon: string; // Emoji ou URL
  iconType: 'emoji' | 'url';
  backgroundColor: ClipperColor;
}

// === CODE ===

interface CodeProps {
  language: string;
  caption?: string;
}

// === MEDIA ===

interface ImageProps {
  url: string;
  caption?: string;
  width?: number;
  // Metadata pour fichiers Notion (temporaires)
  isNotionHosted: boolean;
  expiresAt?: string;
}

interface VideoProps {
  url: string;
  caption?: string;
  provider?: 'youtube' | 'vimeo' | 'other';
}

interface AudioProps {
  url: string;
  caption?: string;
}

interface FileProps {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface BookmarkProps {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
}

// === AUTRES ===

interface EquationProps {
  expression: string;
}

interface TableProps {
  hasColumnHeader: boolean;
  hasRowHeader: boolean;
  // Les rows sont dans children (type: tableRow)
}

interface UnsupportedProps {
  originalType: string;
  originalData: unknown;
  degradedTo?: string;
}

// === COULEURS ===

type ClipperColor =
  | 'default'
  | 'gray' | 'brown' | 'orange' | 'yellow' | 'green'
  | 'blue' | 'purple' | 'pink' | 'red'
  | 'grayBackground' | 'brownBackground' | 'orangeBackground'
  | 'yellowBackground' | 'greenBackground' | 'blueBackground'
  | 'purpleBackground' | 'pinkBackground' | 'redBackground';
```

---

## 📝 CONTENU INLINE

```typescript
/**
 * Contenu inline (texte formaté)
 */
type ClipperInlineContent =
  | ClipperText
  | ClipperLink
  | ClipperMention
  | ClipperEquationInline;

interface ClipperText {
  type: 'text';
  text: string;
  styles: ClipperTextStyles;
}

interface ClipperLink {
  type: 'link';
  url: string;
  content: ClipperText[]; // Texte du lien
}

interface ClipperMention {
  type: 'mention';
  mentionType: 'user' | 'page' | 'date' | 'database';
  displayText: string;
  // Données originales pour reconstruction
  originalData: {
    userId?: string;
    pageId?: string;
    date?: { start: string; end?: string };
    databaseId?: string;
  };
}

interface ClipperEquationInline {
  type: 'equation';
  expression: string;
}

interface ClipperTextStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  textColor?: ClipperColor;
  backgroundColor?: ClipperColor;
}
```

---

## 🔗 MAPPING NOTION

```typescript
/**
 * Mapping pour synchronisation Notion
 */
interface ClipperNotionMapping {
  /** Page Notion associée */
  pageId: string | null;
  
  /** Workspace Notion */
  workspaceId: string | null;
  
  /** Dernière sync */
  lastSyncedAt: string | null;
  
  /** Status de sync */
  syncStatus: 'synced' | 'pending' | 'conflict' | 'never';
  
  /** Mapping bloc par bloc */
  blockMappings: ClipperBlockMapping[];
}

interface ClipperBlockMapping {
  /** ID Clipper (stable) */
  clipperId: string;
  
  /** ID Notion (peut changer si recréé) */
  notionBlockId: string;
  
  /** Type Notion original */
  notionBlockType: string;
  
  /** Hash du contenu au moment du sync */
  syncedContentHash: string;
  
  /** Position au moment du sync */
  syncedOrderIndex: number;
  
  /** Parent au moment du sync */
  syncedParentId: string | null;
  
  /** Status */
  status: 'synced' | 'modified' | 'new' | 'deleted' | 'moved';
}
```

---

## 🔄 CONVERTISSEURS

### Architecture Correcte

```
┌─────────────────────────────────────────────────────────────┐
│                      IMPORT                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Notion API ──→ NotionToClipper ──→ ClipperDoc              │
│                                                              │
│  Clipboard ──→ MarkdownToClipper ──→ ClipperDoc             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      ÉDITION                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ClipperDoc ←──→ ClipperToBlockNote ←──→ BlockNote Editor   │
│                                                              │
│  (Bidirectionnel: éditions dans BN → mises à jour Clipper)  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      EXPORT                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ClipperDoc ──→ ClipperToNotion ──→ Notion API (diff/patch) │
│                                                              │
│  ClipperDoc ──→ ClipperToMarkdown ──→ Markdown (lossy, OK)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Convertisseurs à Implémenter

| Convertisseur | Direction | Fidélité | Priorité |
|---------------|-----------|----------|----------|
| NotionToClipper | Notion → Clipper | 95% | 🔥 P0 |
| ClipperToNotion | Clipper → Notion | 95% | 🔥 P0 |
| ClipperToBlockNote | Clipper → BN | 90% | 🔥 P0 |
| BlockNoteToClipper | BN → Clipper | 90% | 🔥 P0 |
| MarkdownToClipper | MD → Clipper | 80% | P1 |
| ClipperToMarkdown | Clipper → MD | 70% | P2 |

---

## 📊 VALIDATION

```typescript
/**
 * Valide un ClipperDocument
 */
function validateClipperDoc(doc: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 1. Structure de base
  if (!doc || typeof doc !== 'object') {
    errors.push({ path: '', message: 'Document must be an object' });
    return { valid: false, errors };
  }
  
  // 2. Version du schéma
  if ((doc as any).schemaVersion !== '1.0') {
    errors.push({ path: 'schemaVersion', message: 'Unknown schema version' });
  }
  
  // 3. Blocs
  validateBlocks((doc as any).content, '', errors);
  
  // 4. Mapping
  validateMapping((doc as any).notionMapping, errors);
  
  return { valid: errors.length === 0, errors };
}
```

---

## 🚀 MIGRATION

### De l'ancien format (BlockNote direct) vers ClipperDoc

```typescript
/**
 * Migre un document BlockNote vers ClipperDoc
 */
function migrateFromBlockNote(bnDoc: BlockNoteDocument): ClipperDocument {
  return {
    schemaVersion: '1.0',
    id: generateId(),
    metadata: {
      title: 'Migrated Document',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'import' },
      stats: computeStats(bnDoc),
    },
    content: bnDoc.map(block => blockNoteToClipperBlock(block)),
    notionMapping: {
      pageId: null,
      workspaceId: null,
      lastSyncedAt: null,
      syncStatus: 'never',
      blockMappings: [],
    },
  };
}
```

---

## ✅ CHECKLIST IMPLÉMENTATION

- [x] Types TypeScript complets dans `packages/notion-parser/src/types/clipper.ts`
- [ ] Validateur de schéma (à faire)
- [x] Convertisseur NotionToClipper (`converters/NotionToClipper.ts`)
- [ ] Convertisseur ClipperToNotion (à faire - Phase 3)
- [x] Convertisseur ClipperToBlockNote (`converters/ClipperToBlockNote.ts`)
- [x] Convertisseur BlockNoteToClipper (`converters/BlockNoteToClipper.ts`)
- [x] Tests de round-trip avec loss budget vérifié (20 tests passent)
- [ ] Migration depuis l'ancien format (à faire)
