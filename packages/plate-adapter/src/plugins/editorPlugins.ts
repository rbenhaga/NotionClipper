/**
 * Editor Plugins Configuration - Plate v49
 * 
 * CRITICAL: Plugin order matters!
 * 
 * Order:
 * 1. Core plugins (paragraph, heading, list, etc.)
 * 2. Mark plugins (bold, italic, etc.)
 * 3. Autoformat (markdown shortcuts)
 * 4. Break plugins (soft break, exit break)
 * 5. Reset node (on backspace at start)
 * 6. Trailing block (ensure paragraph at end)
 * 7. Node ID (stable IDs) - REQUIRED for BlockSelection & DnD
 * 8. Block Selection (Ctrl+A Notion-like)
 * 9. DnD (drag & drop blocks)
 * 
 * DO NOT reorder without understanding the implications!
 * 
 * IMPORTS: Use /react for React-specific plugins
 */

import {
  BaseParagraphPlugin,
  NodeIdPlugin,
  TrailingBlockPlugin,
} from '@udecode/plate';
import { BaseHeadingPlugin } from '@udecode/plate-heading';
import { BaseListPlugin } from '@udecode/plate-list';
import { BaseBlockquotePlugin } from '@udecode/plate-block-quote';
import { BaseCodeBlockPlugin } from '@udecode/plate-code-block';
import { BaseLinkPlugin } from '@udecode/plate-link';
import {
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
} from '@udecode/plate-basic-marks';
import { AutoformatPlugin } from '@udecode/plate-autoformat';
import { BaseSoftBreakPlugin, BaseExitBreakPlugin } from '@udecode/plate-break';
import { BaseResetNodePlugin } from '@udecode/plate-reset-node';
import { DndPlugin } from '@udecode/plate-dnd';
import type { SlateEditor } from '@udecode/plate';

import { HorizontalRulePlugin } from './HorizontalRulePlugin';
import { autoformatRules } from './autoformatRules';
import {
  ELEMENT_PARAGRAPH,
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_BLOCKQUOTE,
  ELEMENT_CODE_BLOCK,
} from '../schema/platePlugins';

// Type for Slate node (minimal)
interface SlateNode {
  type?: string;
  children?: SlateNode[];
  [key: string]: unknown;
}

/**
 * Create the full plugin list for ClipperPlateEditor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlugin = any;

export function createEditorPlugins(options: {
  enableAutoformat?: boolean;
  enableSoftBreak?: boolean;
  enableExitBreak?: boolean;
  enableResetNode?: boolean;
  enableTrailingBlock?: boolean;
  enableBlockSelection?: boolean;
  enableDnd?: boolean;
} = {}): AnyPlugin[] {
  const {
    enableAutoformat = true,
    enableSoftBreak = true,
    enableExitBreak = true,
    enableResetNode = true,
    enableTrailingBlock = true,
    enableBlockSelection = true,
    enableDnd = true,
  } = options;

  const plugins: AnyPlugin[] = [
    // ═══════════════════════════════════════════════════════════════
    // 1. CORE BLOCK PLUGINS
    // ═══════════════════════════════════════════════════════════════
    BaseParagraphPlugin,
    BaseHeadingPlugin,
    
    // Lists - BaseListPlugin handles ul, ol, li
    BaseListPlugin,
    
    BaseBlockquotePlugin,
    BaseCodeBlockPlugin,
    HorizontalRulePlugin,
    BaseLinkPlugin,

    // ═══════════════════════════════════════════════════════════════
    // 2. MARK PLUGINS (inline formatting)
    // ═══════════════════════════════════════════════════════════════
    BaseBoldPlugin,
    BaseItalicPlugin,
    BaseUnderlinePlugin,
    BaseStrikethroughPlugin,
    BaseCodePlugin,

    // ═══════════════════════════════════════════════════════════════
    // 3. AUTOFORMAT (markdown shortcuts: # → H1, - → list, etc.)
    // Must come AFTER block plugins so types are registered
    // ═══════════════════════════════════════════════════════════════
    ...(enableAutoformat ? [
      AutoformatPlugin.configure({
        options: {
          rules: autoformatRules,
          enableUndoOnDelete: true,
        },
      }),
    ] : []),

    // ═══════════════════════════════════════════════════════════════
    // 4. BREAK PLUGINS (Enter behavior)
    // ═══════════════════════════════════════════════════════════════
    
    // Soft break: Shift+Enter inserts line break (not new block)
    ...(enableSoftBreak ? [
      BaseSoftBreakPlugin.configure({
        options: {
          rules: [
            { hotkey: 'shift+enter' },
            // In code blocks, Enter is soft break (no new block)
            {
              hotkey: 'enter',
              query: {
                allow: [ELEMENT_CODE_BLOCK],
              },
            },
          ],
        },
      }),
    ] : []),

    // Exit break: Mod+Enter exits current block to new paragraph
    ...(enableExitBreak ? [
      BaseExitBreakPlugin.configure({
        options: {
          rules: [
            // Mod+Enter: exit to new paragraph
            {
              hotkey: 'mod+enter',
            },
            // Enter at end of heading: exit to paragraph
            {
              hotkey: 'enter',
              query: {
                allow: [ELEMENT_H1, ELEMENT_H2, ELEMENT_H3],
                end: true,
              },
              level: 0,
              relative: true,
            },
            // Enter at end of quote: exit to paragraph
            {
              hotkey: 'enter',
              query: {
                allow: [ELEMENT_BLOCKQUOTE],
                end: true,
              },
              before: false,
            },
          ],
        },
      }),
    ] : []),

    // ═══════════════════════════════════════════════════════════════
    // 5. RESET NODE (backspace at start resets to paragraph)
    // ═══════════════════════════════════════════════════════════════
    ...(enableResetNode ? [
      BaseResetNodePlugin.configure({
        options: {
          rules: [
            {
              types: [ELEMENT_H1, ELEMENT_H2, ELEMENT_H3, ELEMENT_BLOCKQUOTE],
              defaultType: ELEMENT_PARAGRAPH,
              hotkey: 'backspace',
              predicate: (editor: SlateEditor) => {
                // Only reset if cursor is at the very start of block
                const { selection } = editor;
                if (!selection) return false;
                
                const [match] = editor.api.nodes({
                  match: (n: SlateNode) => editor.api.isBlock(n),
                  mode: 'lowest',
                });
                
                if (!match) return false;
                
                const [, path] = match;
                
                // Check if cursor is at the very start
                return editor.api.isStart(selection.anchor, path);
              },
            },
          ],
        },
      }),
    ] : []),

    // ═══════════════════════════════════════════════════════════════
    // 6. TRAILING BLOCK (ensure document ends with paragraph)
    // ═══════════════════════════════════════════════════════════════
    ...(enableTrailingBlock ? [
      TrailingBlockPlugin.configure({
        options: {
          type: ELEMENT_PARAGRAPH,
        },
      }),
    ] : []),

    // ═══════════════════════════════════════════════════════════════
    // 7. NODE ID (stable IDs for ClipperDoc sync)
    // REQUIRED for BlockSelection and DnD to work properly
    // ═══════════════════════════════════════════════════════════════
    NodeIdPlugin,

    // ═══════════════════════════════════════════════════════════════
    // 8. BLOCK SELECTION - DISABLED for now
    // TODO: Re-enable when we find the correct pattern
    // ═══════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════
    // 9. DRAG & DROP (reorder blocks by dragging)
    // DnD is handled via withDraggables HOC on components
    // The HOC uses useDraggable/useDropLine INSIDE the component context
    // ═══════════════════════════════════════════════════════════════
    ...(enableDnd ? [
      DndPlugin.configure({
        options: {
          enableScroller: true,
        },
      }),
    ] : []),
  ];

  return plugins;
}

/**
 * Default plugins for ClipperPlateEditor
 */
export const defaultEditorPlugins = createEditorPlugins();

export default createEditorPlugins;
