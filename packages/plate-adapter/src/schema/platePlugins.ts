/**
 * Plate Plugins Configuration
 * 
 * Minimal Notion-like setup for V1.
 * Note: Plate v40 has a different API - we use simple string constants.
 */

import type { PlateEditorConfig } from '../types';

// Element type constants (Plate v40 uses strings)
export const ELEMENT_PARAGRAPH = 'p';
export const ELEMENT_H1 = 'h1';
export const ELEMENT_H2 = 'h2';
export const ELEMENT_H3 = 'h3';
export const ELEMENT_UL = 'ul';
export const ELEMENT_OL = 'ol';
export const ELEMENT_LI = 'li';
export const ELEMENT_BLOCKQUOTE = 'blockquote';
export const ELEMENT_CODE_BLOCK = 'code_block';
export const ELEMENT_HR = 'hr';
export const ELEMENT_LINK = 'a';
export const ELEMENT_IMAGE = 'img';

// Mark type constants
export const MARK_BOLD = 'bold';
export const MARK_ITALIC = 'italic';
export const MARK_UNDERLINE = 'underline';
export const MARK_STRIKETHROUGH = 'strikethrough';
export const MARK_CODE = 'code';

/**
 * Slash menu items for Notion-like block insertion
 */
export const SLASH_MENU_ITEMS = [
  {
    key: 'heading1',
    label: 'Heading 1',
    description: 'Big section heading',
    icon: 'H1',
    type: ELEMENT_H1,
  },
  {
    key: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    type: ELEMENT_H2,
  },
  {
    key: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    type: ELEMENT_H3,
  },
  {
    key: 'bulletList',
    label: 'Bulleted List',
    description: 'Create a simple bulleted list',
    icon: '•',
    type: ELEMENT_UL,
  },
  {
    key: 'numberedList',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    type: ELEMENT_OL,
  },
  {
    key: 'todo',
    label: 'To-do',
    description: 'Track tasks with a to-do list',
    icon: '☐',
    type: 'action_item',
  },
  {
    key: 'quote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: '"',
    type: ELEMENT_BLOCKQUOTE,
  },
  {
    key: 'code',
    label: 'Code',
    description: 'Capture a code snippet',
    icon: '</>',
    type: ELEMENT_CODE_BLOCK,
  },
  {
    key: 'divider',
    label: 'Divider',
    description: 'Visually divide blocks',
    icon: '—',
    type: ELEMENT_HR,
  },
];

/**
 * Create plugins config (placeholder for future use)
 */
export function createClipperPlugins(_config: PlateEditorConfig = {}) {
  // Plate v40 uses a different plugin system
  // For now, return empty - we'll use basic Slate
  return [];
}
