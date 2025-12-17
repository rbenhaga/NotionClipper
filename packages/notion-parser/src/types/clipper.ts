/**
 * ClipperDoc - Format Canonique (Source de Vérité)
 * 
 * Ce fichier définit le schéma ClipperDoc qui est INDÉPENDANT de:
 * - Notion API (pas de dépendance aux types Notion)
 * - BlockNote (pas de dépendance au schéma BN)
 * 
 * ClipperDoc est la source de vérité pour tout le contenu.
 * 
 * @module types/clipper
 * @version 1.0
 */

// ============================================================================
// DOCUMENT PRINCIPAL
// ============================================================================

/**
 * Document Clipper - Format canonique
 */
export interface ClipperDocument {
  /** Version du schéma (pour migrations futures) */
  schemaVersion: '1.0';
  
  /** ID unique du document (UUID) */
  id: string;
  
  /** Métadonnées du document */
  metadata: ClipperDocumentMetadata;
  
  /** Contenu (arbre de blocs) */
  content: ClipperBlock[];
  
  /** Mapping pour sync Notion */
  notionMapping: ClipperNotionMapping;
}

/**
 * Métadonnées du document
 */
export interface ClipperDocumentMetadata {
  /** Titre du document */
  title: string;
  
  /** Date de création (ISO 8601) */
  createdAt: string;
  
  /** Date de dernière modification (ISO 8601) */
  updatedAt: string;
  
  /** Source d'origine */
  source: ClipperDocumentSource;
  
  /** Statistiques */
  stats: ClipperDocumentStats;
}

export interface ClipperDocumentSource {
  type: 'clipboard' | 'notion' | 'import' | 'manual';
  notionPageId?: string;
  notionWorkspaceId?: string;
  url?: string;
}

export interface ClipperDocumentStats {
  blockCount: number;
  wordCount: number;
  characterCount: number;
}

// ============================================================================
// BLOCS
// ============================================================================

/**
 * Bloc Clipper - Unité de contenu
 */
export interface ClipperBlock {
  /** ID unique stable (ne change JAMAIS) */
  id: string;
  
  /** Type de bloc */
  type: ClipperBlockType;
  
  /** Contenu inline (pour blocs textuels) */
  content?: ClipperInlineContent[];
  
  /** Propriétés spécifiques au type */
  props: ClipperBlockProps;
  
  /** Blocs enfants (pour nesting) */
  children: ClipperBlock[];
  
  /** Métadonnées internes */
  _meta: ClipperBlockMeta;
}

/**
 * Métadonnées internes d'un bloc
 */
export interface ClipperBlockMeta {
  /** Hash du contenu pour diff */
  contentHash: string;
  /** Timestamp dernière modification (ISO 8601) */
  modifiedAt: string;
  /** ID Notion associé (si sync) */
  notionBlockId?: string;
  /** Type Notion original (pour reconstruction) */
  notionBlockType?: string;
}

/**
 * Types de blocs supportés
 */
export type ClipperBlockType =
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
  | 'tableRow'
  // Layout (dégradé)
  | 'columnList'
  | 'column'
  // Sync (dégradé)
  | 'syncedBlock'
  // Fallback
  | 'unsupported';

// ============================================================================
// PROPRIÉTÉS PAR TYPE DE BLOC
// ============================================================================

export type ClipperBlockProps =
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
  | DividerProps
  | EquationProps
  | TableProps
  | TableRowProps
  | ColumnListProps
  | ColumnProps
  | SyncedBlockProps
  | UnsupportedProps;

// --- Texte ---

export interface ParagraphProps {
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

export interface HeadingProps {
  level: 1 | 2 | 3;
  isToggleable: boolean;
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

// --- Listes ---

export interface ListItemProps {
  checked?: boolean; // Pour todoList uniquement
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

export interface ToggleProps {
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

// --- Citations ---

export interface QuoteProps {
  textColor: ClipperColor;
  backgroundColor: ClipperColor;
}

export interface CalloutProps {
  icon: string;
  iconType: 'emoji' | 'url';
  backgroundColor: ClipperColor;
}

// --- Code ---

export interface CodeProps {
  language: string;
  caption?: string;
}

// --- Media ---

export interface ImageProps {
  url: string;
  caption?: string;
  width?: number;
  isNotionHosted: boolean;
  expiresAt?: string;
}

export interface VideoProps {
  url: string;
  caption?: string;
  provider?: 'youtube' | 'vimeo' | 'loom' | 'other';
}

export interface AudioProps {
  url: string;
  caption?: string;
}

export interface FileProps {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  caption?: string;
}

export interface BookmarkProps {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
}

// --- Autres ---

export interface DividerProps {
  // Pas de props
}

export interface EquationProps {
  expression: string;
}

export interface TableProps {
  hasColumnHeader: boolean;
  hasRowHeader: boolean;
  columnCount: number;
}

export interface TableRowProps {
  cells: ClipperTableCell[];
}

export interface ClipperTableCell {
  content: ClipperInlineContent[];
}

// --- Layout (dégradé) ---

export interface ColumnListProps {
  columnCount: number;
}

export interface ColumnProps {
  // Pas de props spécifiques
}

// --- Sync (dégradé) ---

export interface SyncedBlockProps {
  syncedFromId?: string;
  isOriginal: boolean;
}

// --- Fallback ---

export interface UnsupportedProps {
  originalType: string;
  originalData?: unknown;
  degradedTo?: string;
}

// ============================================================================
// COULEURS
// ============================================================================

export type ClipperColor =
  | 'default'
  // Couleurs de texte
  | 'gray' | 'brown' | 'orange' | 'yellow' | 'green'
  | 'blue' | 'purple' | 'pink' | 'red'
  // Couleurs de fond
  | 'grayBackground' | 'brownBackground' | 'orangeBackground'
  | 'yellowBackground' | 'greenBackground' | 'blueBackground'
  | 'purpleBackground' | 'pinkBackground' | 'redBackground';

// ============================================================================
// CONTENU INLINE
// ============================================================================

export type ClipperInlineContent =
  | ClipperText
  | ClipperLink
  | ClipperMention
  | ClipperEquationInline;

export interface ClipperText {
  type: 'text';
  text: string;
  styles: ClipperTextStyles;
}

export interface ClipperLink {
  type: 'link';
  url: string;
  content: ClipperText[];
}

export interface ClipperMention {
  type: 'mention';
  mentionType: 'user' | 'page' | 'date' | 'database';
  displayText: string;
  originalData: ClipperMentionData;
}

export interface ClipperMentionData {
  userId?: string;
  userName?: string;
  pageId?: string;
  pageTitle?: string;
  date?: { start: string; end?: string };
  databaseId?: string;
}

export interface ClipperEquationInline {
  type: 'equation';
  expression: string;
}

export interface ClipperTextStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  textColor?: ClipperColor;
  backgroundColor?: ClipperColor;
}

// ============================================================================
// MAPPING NOTION (pour sync)
// ============================================================================

export interface ClipperNotionMapping {
  /** Page Notion associée */
  pageId: string | null;
  
  /** Workspace Notion */
  workspaceId: string | null;
  
  /** Dernière sync (ISO 8601) */
  lastSyncedAt: string | null;
  
  /** Status de sync */
  syncStatus: ClipperSyncStatus;
  
  /** Mapping bloc par bloc */
  blockMappings: ClipperBlockMapping[];
}

export type ClipperSyncStatus = 'synced' | 'pending' | 'conflict' | 'never';

export interface ClipperBlockMapping {
  /** ID Clipper (stable, ne change jamais) */
  clipperId: string;
  
  /** ID Notion (peut changer si bloc recréé) */
  notionBlockId: string;
  
  /** Type Notion original */
  notionBlockType: string;
  
  /** Hash du contenu au moment du sync */
  syncedContentHash: string;
  
  /** Position au moment du sync */
  syncedOrderIndex: number;
  
  /** Parent au moment du sync */
  syncedParentId: string | null;
  
  /** Status du bloc */
  status: ClipperBlockSyncStatus;
}

export type ClipperBlockSyncStatus = 
  | 'synced'    // Identique à Notion
  | 'modified'  // Modifié localement
  | 'new'       // Créé localement, pas encore dans Notion
  | 'deleted'   // Supprimé localement
  | 'moved';    // Déplacé (parent ou ordre changé)

// ============================================================================
// VALIDATION
// ============================================================================

export interface ClipperValidationResult {
  valid: boolean;
  errors: ClipperValidationError[];
  warnings: ClipperValidationWarning[];
}

export interface ClipperValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ClipperValidationWarning {
  path: string;
  message: string;
  code: string;
}

// ============================================================================
// HELPERS / FACTORY
// ============================================================================

/**
 * Crée un nouveau ClipperDocument vide
 */
export function createClipperDocument(options?: {
  title?: string;
  source?: ClipperDocumentSource;
}): ClipperDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: '1.0',
    id: generateClipperId(),
    metadata: {
      title: options?.title || 'Untitled',
      createdAt: now,
      updatedAt: now,
      source: options?.source || { type: 'manual' },
      stats: { blockCount: 0, wordCount: 0, characterCount: 0 },
    },
    content: [],
    notionMapping: {
      pageId: null,
      workspaceId: null,
      lastSyncedAt: null,
      syncStatus: 'never',
      blockMappings: [],
    },
  };
}

/**
 * Crée un nouveau bloc Clipper
 */
export function createClipperBlock(
  type: ClipperBlockType,
  props: ClipperBlockProps,
  options?: {
    content?: ClipperInlineContent[];
    children?: ClipperBlock[];
    notionBlockId?: string;
    notionBlockType?: string;
  }
): ClipperBlock {
  const now = new Date().toISOString();
  const block: ClipperBlock = {
    id: generateClipperId(),
    type,
    props,
    content: options?.content,
    children: options?.children || [],
    _meta: {
      contentHash: '',
      modifiedAt: now,
      notionBlockId: options?.notionBlockId,
      notionBlockType: options?.notionBlockType,
    },
  };
  block._meta.contentHash = computeBlockHash(block);
  return block;
}

/**
 * Génère un ID unique pour Clipper
 */
export function generateClipperId(): string {
  return `clip-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calcule le hash d'un bloc pour détecter les changements
 */
export function computeBlockHash(block: ClipperBlock): string {
  const content = JSON.stringify({
    type: block.type,
    props: block.props,
    content: block.content,
    // Ne pas inclure children dans le hash (ils ont leur propre hash)
  });
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Calcule les stats d'un document
 */
export function computeDocumentStats(content: ClipperBlock[]): ClipperDocumentStats {
  let blockCount = 0;
  let wordCount = 0;
  let characterCount = 0;

  function processBlock(block: ClipperBlock) {
    blockCount++;
    if (block.content) {
      for (const inline of block.content) {
        if (inline.type === 'text') {
          characterCount += inline.text.length;
          wordCount += inline.text.split(/\s+/).filter(w => w.length > 0).length;
        } else if (inline.type === 'link') {
          for (const text of inline.content) {
            characterCount += text.text.length;
            wordCount += text.text.split(/\s+/).filter(w => w.length > 0).length;
          }
        } else if (inline.type === 'mention') {
          characterCount += inline.displayText.length;
          wordCount += 1;
        }
      }
    }
    for (const child of block.children) {
      processBlock(child);
    }
  }

  for (const block of content) {
    processBlock(block);
  }

  return { blockCount, wordCount, characterCount };
}
