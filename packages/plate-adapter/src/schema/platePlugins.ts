/**
 * Plate Plugins Configuration
 * 
 * Element type constants and slash menu items for Notion-like editor.
 */

import type { PlateEditorConfig } from '../types';

// ═══════════════════════════════════════════════════════════════
// ELEMENT TYPE CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Core blocks
export const ELEMENT_PARAGRAPH = 'p';
export const ELEMENT_H1 = 'h1';
export const ELEMENT_H2 = 'h2';
export const ELEMENT_H3 = 'h3';
export const ELEMENT_UL = 'ul';
export const ELEMENT_OL = 'ol';
export const ELEMENT_LI = 'li';
export const ELEMENT_LIC = 'lic';
export const ELEMENT_BLOCKQUOTE = 'blockquote';
export const ELEMENT_CODE_BLOCK = 'code_block';
export const ELEMENT_CODE_LINE = 'code_line';
export const ELEMENT_HR = 'hr';
export const ELEMENT_LINK = 'a';

// Advanced blocks
export const ELEMENT_TABLE = 'table';
export const ELEMENT_TR = 'tr';
export const ELEMENT_TD = 'td';
export const ELEMENT_TH = 'th';
export const ELEMENT_IMAGE = 'img';
export const ELEMENT_MEDIA_EMBED = 'media_embed';
export const ELEMENT_CALLOUT = 'callout';
export const ELEMENT_TOGGLE = 'toggle';
export const ELEMENT_MENTION = 'mention';
export const ELEMENT_MENTION_INPUT = 'mention_input';
export const ELEMENT_ACTION_ITEM = 'action_item';

// ═══════════════════════════════════════════════════════════════
// MARK TYPE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const MARK_BOLD = 'bold';
export const MARK_ITALIC = 'italic';
export const MARK_UNDERLINE = 'underline';
export const MARK_STRIKETHROUGH = 'strikethrough';
export const MARK_CODE = 'code';

// ═══════════════════════════════════════════════════════════════
// SLASH MENU ITEMS
// ═══════════════════════════════════════════════════════════════

export interface SlashMenuItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  type: string;
  category?: 'basic' | 'media' | 'advanced' | 'embed';
}

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  // ─────────────────────────────────────────────────────────────
  // BASIC BLOCKS
  // ─────────────────────────────────────────────────────────────
  {
    key: 'text',
    label: 'Text',
    description: 'Just start writing with plain text',
    icon: 'Aa',
    type: ELEMENT_PARAGRAPH,
    category: 'basic',
  },
  {
    key: 'heading1',
    label: 'Heading 1',
    description: 'Big section heading',
    icon: 'H1',
    type: ELEMENT_H1,
    category: 'basic',
  },
  {
    key: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    type: ELEMENT_H2,
    category: 'basic',
  },
  {
    key: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    type: ELEMENT_H3,
    category: 'basic',
  },
  {
    key: 'bulletList',
    label: 'Bulleted List',
    description: 'Create a simple bulleted list',
    icon: '•',
    type: ELEMENT_UL,
    category: 'basic',
  },
  {
    key: 'numberedList',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    type: ELEMENT_OL,
    category: 'basic',
  },
  {
    key: 'todo',
    label: 'To-do',
    description: 'Track tasks with a to-do list',
    icon: '☐',
    type: ELEMENT_ACTION_ITEM,
    category: 'basic',
  },
  {
    key: 'quote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: '"',
    type: ELEMENT_BLOCKQUOTE,
    category: 'basic',
  },
  {
    key: 'divider',
    label: 'Divider',
    description: 'Visually divide blocks',
    icon: '—',
    type: ELEMENT_HR,
    category: 'basic',
  },

  // ─────────────────────────────────────────────────────────────
  // ADVANCED BLOCKS
  // ─────────────────────────────────────────────────────────────
  {
    key: 'toggle',
    label: 'Toggle',
    description: 'Toggles can hide and show content',
    icon: '▶',
    type: ELEMENT_TOGGLE,
    category: 'advanced',
  },
  {
    key: 'callout',
    label: 'Callout',
    description: 'Make writing stand out',
    icon: '💡',
    type: ELEMENT_CALLOUT,
    category: 'advanced',
  },
  {
    key: 'code',
    label: 'Code',
    description: 'Capture a code snippet',
    icon: '</>',
    type: ELEMENT_CODE_BLOCK,
    category: 'advanced',
  },
  {
    key: 'table',
    label: 'Table',
    description: 'Add a table',
    icon: '▦',
    type: ELEMENT_TABLE,
    category: 'advanced',
  },

  // ─────────────────────────────────────────────────────────────
  // MEDIA
  // ─────────────────────────────────────────────────────────────
  {
    key: 'image',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: '🖼️',
    type: ELEMENT_IMAGE,
    category: 'media',
  },
  {
    key: 'embed',
    label: 'Embed',
    description: 'Embed a video or other content',
    icon: '🎬',
    type: ELEMENT_MEDIA_EMBED,
    category: 'media',
  },
];

/**
 * Create plugins config (placeholder for future use)
 */
export function createClipperPlugins(_config: PlateEditorConfig = {}) {
  return [];
}
