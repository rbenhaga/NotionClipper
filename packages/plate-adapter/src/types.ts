/**
 * @notion-clipper/plate-adapter - Types
 * 
 * Types for Plate editor integration with ClipperDoc.
 * ClipperDoc is the ONLY source of truth - Plate is just a view/edit layer.
 */

// Re-export ClipperDoc types from notion-parser
export type {
  ClipperDocument,
  ClipperBlock,
  ClipperBlockType,
  ClipperInlineContent,
  ClipperText,
  ClipperLink,
} from '@notion-clipper/notion-parser';

/**
 * Plate/Slate value type (array of nodes)
 */
export type PlateValue = PlateElement[];

/**
 * Base Plate element (Slate node)
 */
export interface PlateElement {
  id: string;
  type: string;
  children: (PlateElement | PlateText)[];
  [key: string]: unknown;
}

/**
 * Plate text node with marks
 */
export interface PlateText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

/**
 * ID mapping between ClipperDoc and Plate
 */
export interface IdMapping {
  clipperToPlate: Map<string, string>;
  plateToClipper: Map<string, string>;
}

/**
 * Editor state for tracking changes
 */
export interface ClipperEditorState {
  isDirty: boolean;
  lastSavedAt: Date | null;
  modifiedBlockIds: Set<string>;
  newBlockIds: Set<string>;
  deletedBlockIds: Set<string>;
}

/**
 * Plate editor configuration
 */
export interface PlateEditorConfig {
  /** Enable AI features (default: false) */
  enableAi?: boolean;
  /** Debounce delay for onChange (ms) */
  debounceMs?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Mapping from ClipperBlock type to Plate type
 */
export const CLIPPER_TO_PLATE_TYPE: Record<string, string> = {
  'paragraph': 'p',
  'heading1': 'h1',
  'heading2': 'h2',
  'heading3': 'h3',
  'bulletList': 'ul',
  'numberedList': 'ol',
  'todoList': 'action_item',
  'quote': 'blockquote',
  'code': 'code_block',
  'divider': 'hr',
  'image': 'img',
  'callout': 'blockquote',
  'toggle': 'blockquote',
};

/**
 * Mapping from Plate type to ClipperBlock type
 */
export const PLATE_TO_CLIPPER_TYPE: Record<string, string> = {
  'p': 'paragraph',
  'h1': 'heading1',
  'h2': 'heading2',
  'h3': 'heading3',
  'ul': 'bulletList',
  'ol': 'numberedList',
  'action_item': 'todoList',
  'blockquote': 'quote',
  'code_block': 'code',
  'hr': 'divider',
  'img': 'image',
};
