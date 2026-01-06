/**
 * Autoformat Rules - Notion-like Markdown shortcuts
 * 
 * Transforms:
 * - # + space → H1
 * - ## + space → H2
 * - ### + space → H3
 * - - + space → Bullet list
 * - * + space → Bullet list
 * - 1. + space → Numbered list
 * - [] + space → Todo
 * - > + space → Quote
 * - ``` → Code block
 * - --- → Divider
 * - >! + space → Callout
 * - >> + space → Toggle
 * 
 * Reference: https://platejs.org/docs/autoformat
 */

import type { SlateEditor } from 'platejs';
import type { AutoformatBlockRule, AutoformatMarkRule } from '@platejs/autoformat';
import {
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_UL,
  ELEMENT_OL,
  ELEMENT_BLOCKQUOTE,
  ELEMENT_CODE_BLOCK,
  ELEMENT_HR,
} from '../schema/platePlugins';

// Type for Slate node (minimal)
interface SlateNode {
  type?: string;
  children?: SlateNode[];
  [key: string]: unknown;
}

// Helper: get focused block entry
function getFocusedBlockEntry(editor: SlateEditor): [SlateNode, number[]] | undefined {
  try {
    const entries = Array.from(editor.api.nodes({
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest',
    }));
    if (entries.length > 0) {
      return entries[0] as [SlateNode, number[]];
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// Helper: check if node is a paragraph (only transform from p)
function isParagraph(node: SlateNode): boolean {
  return node?.type === 'p';
}

/**
 * Block autoformat rules
 * Triggered at the start of a line
 * IMPORTANT: Only transform from paragraph blocks (Notion behavior)
 */
export const autoformatBlocks: AutoformatBlockRule[] = [
  // Headings
  {
    mode: 'block',
    type: ELEMENT_H1,
    match: '# ',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_H1 }, { at: entry[1] });
    },
  },
  {
    mode: 'block',
    type: ELEMENT_H2,
    match: '## ',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_H2 }, { at: entry[1] });
    },
  },
  {
    mode: 'block',
    type: ELEMENT_H3,
    match: '### ',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_H3 }, { at: entry[1] });
    },
  },
  
  // Quote
  {
    mode: 'block',
    type: ELEMENT_BLOCKQUOTE,
    match: '> ',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_BLOCKQUOTE }, { at: entry[1] });
    },
  },
  
  // Code block
  {
    mode: 'block',
    type: ELEMENT_CODE_BLOCK,
    match: '```',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_CODE_BLOCK }, { at: entry[1] });
    },
  },
  
  // Divider
  {
    mode: 'block',
    type: ELEMENT_HR,
    match: ['---', '***'],
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_HR }, { at: entry[1] });
    },
  },

  // Callout (>! for info callout)
  {
    mode: 'block',
    type: 'callout',
    match: '>! ',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: 'callout', variant: 'info', icon: '💡' }, { at: entry[1] });
    },
  },

  // Toggle (>> for toggle block)
  {
    mode: 'block',
    type: 'toggle',
    match: '>> ',
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: 'toggle', open: true }, { at: entry[1] });
    },
  },
];

/**
 * List autoformat rules
 */
export const autoformatLists: AutoformatBlockRule[] = [
  // Bullet list
  {
    mode: 'block',
    type: ELEMENT_UL,
    match: ['- ', '* '],
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_UL }, { at: entry[1] });
    },
  },

  // Numbered list
  {
    mode: 'block',
    type: ELEMENT_OL,
    match: ['1. ', '1) '],
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: ELEMENT_OL }, { at: entry[1] });
    },
  },

  // Todo unchecked
  {
    mode: 'block',
    type: 'action_item',
    match: ['[] ', '[ ] '],
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: 'action_item', checked: false }, { at: entry[1] });
    },
  },

  // Todo checked
  {
    mode: 'block',
    type: 'action_item',
    match: ['[x] ', '[X] '],
    format: (editor: SlateEditor) => {
      const entry = getFocusedBlockEntry(editor);
      if (!entry || !isParagraph(entry[0])) return;
      editor.tf.setNodes({ type: 'action_item', checked: true }, { at: entry[1] });
    },
  },
];

/**
 * Mark autoformat rules (inline)
 */
export const autoformatMarks: AutoformatMarkRule[] = [
  // Bold: **text** or __text__
  { mode: 'mark', type: 'bold', match: ['**', '__'] },
  
  // Italic: *text* or _text_
  { mode: 'mark', type: 'italic', match: ['*', '_'] },
  
  // Strikethrough: ~~text~~
  { mode: 'mark', type: 'strikethrough', match: '~~' },
  
  // Inline code: `text`
  { mode: 'mark', type: 'code', match: '`' },
];

/**
 * All autoformat rules combined
 */
export const autoformatRules = [
  ...autoformatBlocks,
  ...autoformatLists,
  ...autoformatMarks,
];

export default autoformatRules;
