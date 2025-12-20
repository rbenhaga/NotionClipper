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
 * 
 * Reference: https://platejs.org/docs/autoformat
 */

import type { SlateEditor } from '@udecode/plate';
import type { AutoformatBlockRule, AutoformatMarkRule } from '@udecode/plate-autoformat';
import {
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_UL,
  ELEMENT_OL,
  ELEMENT_LI,
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

/**
 * Block autoformat rules
 * Triggered at the start of a line
 */
export const autoformatBlocks: AutoformatBlockRule[] = [
  // Headings
  {
    mode: 'block',
    type: ELEMENT_H1,
    match: '# ',
  },
  {
    mode: 'block',
    type: ELEMENT_H2,
    match: '## ',
  },
  {
    mode: 'block',
    type: ELEMENT_H3,
    match: '### ',
  },
  
  // Quote
  {
    mode: 'block',
    type: ELEMENT_BLOCKQUOTE,
    match: '> ',
  },
  
  // Code block (triple backtick)
  {
    mode: 'block',
    type: ELEMENT_CODE_BLOCK,
    match: '```',
  },
  
  // Divider
  {
    mode: 'block',
    type: ELEMENT_HR,
    match: ['---', '***'],
  },
];

/**
 * List autoformat rules
 * These need special handling for list structure
 */
export const autoformatLists: AutoformatBlockRule[] = [
  // Bullet list
  {
    mode: 'block',
    type: ELEMENT_LI,
    match: ['- ', '* '],
    preFormat: (editor: SlateEditor) => {
      // Wrap in ul if not already
      editor.tf.wrapNodes(
        { type: ELEMENT_UL, children: [] },
        {
          match: (n: SlateNode) => n.type === ELEMENT_LI,
          split: true,
        }
      );
    },
  },
  
  // Numbered list
  {
    mode: 'block',
    type: ELEMENT_LI,
    match: ['1. ', '1) '],
    preFormat: (editor: SlateEditor) => {
      // Wrap in ol if not already
      editor.tf.wrapNodes(
        { type: ELEMENT_OL, children: [] },
        {
          match: (n: SlateNode) => n.type === ELEMENT_LI,
          split: true,
        }
      );
    },
  },
  
  // Todo
  {
    mode: 'block',
    type: 'action_item',
    match: ['[] ', '[ ] '],
    format: (editor: SlateEditor) => {
      editor.tf.setNodes(
        { type: 'action_item', checked: false },
        { match: (n: SlateNode) => editor.api.isBlock(n) }
      );
    },
  },
];

/**
 * Mark autoformat rules (inline)
 * Bold, italic, code, strikethrough
 */
export const autoformatMarks: AutoformatMarkRule[] = [
  // Bold: **text** or __text__
  {
    mode: 'mark',
    type: 'bold',
    match: ['**', '__'],
  },
  
  // Italic: *text* or _text_
  {
    mode: 'mark',
    type: 'italic',
    match: ['*', '_'],
  },
  
  // Strikethrough: ~~text~~
  {
    mode: 'mark',
    type: 'strikethrough',
    match: '~~',
  },
  
  // Inline code: `text`
  {
    mode: 'mark',
    type: 'code',
    match: '`',
  },
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
