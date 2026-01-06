/**
 * Block Commands - Command Bus for Plate Editor
 * 
 * ✅ P0-4: Unified command bus for block transformations
 * Used by: slash menu, + button, keyboard shortcuts
 * 
 * Ensures:
 * - Block IDs remain stable after transforms
 * - Proper handling of different block types (lists, todos, etc.)
 * - Single source of truth for all block operations
 * 
 * ✅ FIX: Uses Plate v49 transforms properly
 * ✅ P0.6: Logs gated behind DEBUG_PLATE env var
 */

import type { PlateEditor } from 'platejs/react';
import {
  ELEMENT_PARAGRAPH,
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
  id?: string;
  children?: SlateNode[];
  checked?: boolean;
  [key: string]: unknown;
}

// ✅ P0.6: Debug logging helper - only logs when DEBUG_PLATE=1
const DEBUG = typeof process !== 'undefined' && process.env?.DEBUG_PLATE === '1';
const debugLog = (...args: unknown[]) => { if (DEBUG) console.log(...args); };
const debugWarn = (...args: unknown[]) => { if (DEBUG) console.warn(...args); };
const debugError = (...args: unknown[]) => { console.error(...args); }; // Errors always logged

/**
 * Block type mapping from slash menu types to Plate types
 */
export const BLOCK_TYPE_MAP: Record<string, string> = {
  // Headings
  'h1': ELEMENT_H1,
  'h2': ELEMENT_H2,
  'h3': ELEMENT_H3,
  'heading_1': ELEMENT_H1,
  'heading_2': ELEMENT_H2,
  'heading_3': ELEMENT_H3,
  
  // Paragraphs
  'p': ELEMENT_PARAGRAPH,
  'paragraph': ELEMENT_PARAGRAPH,
  
  // Lists
  'ul': ELEMENT_UL,
  'ol': ELEMENT_OL,
  'bulleted_list': ELEMENT_UL,
  'numbered_list': ELEMENT_OL,
  
  // Other blocks
  'blockquote': ELEMENT_BLOCKQUOTE,
  'quote': ELEMENT_BLOCKQUOTE,
  'code_block': ELEMENT_CODE_BLOCK,
  'code': ELEMENT_CODE_BLOCK,
  'hr': ELEMENT_HR,
  'divider': ELEMENT_HR,
  
  // Todo (special handling)
  'action_item': 'action_item',
  'todo': 'action_item',
  'to_do': 'action_item',
};

/**
 * Types that require special list handling
 */
const LIST_TYPES = new Set([ELEMENT_UL, ELEMENT_OL]);

/**
 * Types that are void elements (no text content)
 */
const VOID_TYPES = new Set([ELEMENT_HR]);

/**
 * Transform the current block to a new type
 * Preserves block ID and content where possible
 */
export function setBlockType(editor: PlateEditor, type: string): boolean {
  const mappedType = BLOCK_TYPE_MAP[type] || type;
  
  debugLog(`[blockCommands] setBlockType: ${type} → ${mappedType}`);
  
  try {
    // Handle void elements (divider)
    if (VOID_TYPES.has(mappedType)) {
      return insertVoidBlock(editor, mappedType);
    }
    
    // Handle list types
    if (LIST_TYPES.has(mappedType)) {
      return toggleList(editor, mappedType);
    }
    
    // Handle todo
    if (mappedType === 'action_item') {
      return toggleTodo(editor);
    }
    
    // Standard block type change (heading, paragraph, quote, code)
    return setSimpleBlockType(editor, mappedType);
  } catch (error) {
    debugError('[blockCommands] setBlockType error:', error);
    return false;
  }
}

/**
 * Set a simple block type (heading, paragraph, quote, code)
 * Uses Plate's setNodes to preserve ID
 */
function setSimpleBlockType(editor: PlateEditor, type: string): boolean {
  try {
    // Use Plate's transform API
    editor.tf.setNodes({ type }, { 
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    debugLog(`[blockCommands] Block type set to: ${type}`);
    return true;
  } catch (error) {
    debugError('[blockCommands] setSimpleBlockType error:', error);
    return false;
  }
}

/**
 * Toggle list type (bulleted or numbered)
 * Handles conversion between list types and from/to paragraph
 * 
 * ✅ FIX: Uses Plate v49 list transforms properly
 * - Wraps block in list structure (ul/ol > li)
 * - Preserves block ID on the content node
 * - Properly unwraps when toggling off
 */
function toggleList(editor: PlateEditor, listType: string): boolean {
  try {
    // Get current block and its path
    const [match] = editor.api.nodes({
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    if (!match) {
      debugWarn('[blockCommands] No block found for list toggle');
      return false;
    }
    
    const [node, path] = match;
    const typedNode = node as SlateNode;
    const currentType = typedNode.type;
    const nodeId = typedNode.id;
    
    // Check if already in a list
    const isInList = currentType === ELEMENT_LI || currentType === ELEMENT_UL || currentType === ELEMENT_OL;
    
    // If already this list type, unwrap to paragraph
    if (isInList) {
      // Check parent to see if it's the same list type
      const [parentMatch] = editor.api.nodes({
        match: (n: SlateNode) => n.type === ELEMENT_UL || n.type === ELEMENT_OL,
        mode: 'lowest'
      });
      
      if (parentMatch) {
        const [parentNode] = parentMatch;
        const parentType = (parentNode as SlateNode).type;
        
        // If same list type, convert to paragraph (toggle off)
        if (parentType === listType) {
          // Unwrap from list structure
          editor.tf.unwrapNodes({
            match: (n: SlateNode) => n.type === ELEMENT_LI,
            split: true
          });
          editor.tf.unwrapNodes({
            match: (n: SlateNode) => n.type === ELEMENT_UL || n.type === ELEMENT_OL,
            split: true
          });
          // Set to paragraph
          editor.tf.setNodes({ type: ELEMENT_PARAGRAPH }, {
            match: (n: SlateNode) => editor.api.isBlock(n),
            mode: 'lowest'
          });
          debugLog('[blockCommands] List unwrapped to paragraph');
          return true;
        }
        
        // Different list type: just change the wrapper type
        editor.tf.setNodes({ type: listType }, {
          match: (n: SlateNode) => n.type === ELEMENT_UL || n.type === ELEMENT_OL,
          mode: 'lowest'
        });
        debugLog(`[blockCommands] List type changed to: ${listType}`);
        return true;
      }
    }
    
    // Not in a list: wrap in list structure
    // First, convert current block to list item content
    editor.tf.setNodes({ type: ELEMENT_PARAGRAPH }, {
      at: path,
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    // Wrap in li
    editor.tf.wrapNodes(
      { type: ELEMENT_LI, children: [] },
      { at: path }
    );
    
    // Wrap in ul/ol
    editor.tf.wrapNodes(
      { type: listType, children: [] },
      { at: path }
    );
    
    debugLog(`[blockCommands] Block wrapped in ${listType} list (ID preserved: ${nodeId})`);
    return true;
  } catch (error) {
    debugError('[blockCommands] toggleList error:', error);
    // Fallback: try simple type change (less ideal but works)
    return setSimpleBlockType(editor, listType);
  }
}

/**
 * Toggle todo/action item
 */
function toggleTodo(editor: PlateEditor): boolean {
  try {
    // Get current block
    const [match] = editor.api.nodes({
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    if (!match) {
      return false;
    }
    
    const [node] = match;
    const currentType = (node as SlateNode).type;
    
    // If already todo, convert to paragraph
    if (currentType === 'action_item') {
      return setSimpleBlockType(editor, ELEMENT_PARAGRAPH);
    }
    
    // Convert to todo
    editor.tf.setNodes({ type: 'action_item', checked: false }, {
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    debugLog('[blockCommands] Todo toggled');
    return true;
  } catch (error) {
    debugError('[blockCommands] toggleTodo error:', error);
    return false;
  }
}

/**
 * Insert a void block (divider)
 */
function insertVoidBlock(editor: PlateEditor, type: string): boolean {
  try {
    // Insert the void element
    editor.tf.insertNodes({
      type,
      children: [{ text: '' }],
    });
    
    // Insert a paragraph after for continued editing
    editor.tf.insertNodes({
      type: ELEMENT_PARAGRAPH,
      children: [{ text: '' }],
    });
    
    debugLog(`[blockCommands] Void block inserted: ${type}`);
    return true;
  } catch (error) {
    debugError('[blockCommands] insertVoidBlock error:', error);
    return false;
  }
}

/**
 * Insert a new block after the current one
 */
export function insertBlockAfter(editor: PlateEditor, type: string): boolean {
  const mappedType = BLOCK_TYPE_MAP[type] || type;
  
  try {
    // Move to end of current block
    editor.tf.collapse({ edge: 'end' });
    
    // Insert new block
    editor.tf.insertNodes({
      type: mappedType,
      children: [{ text: '' }],
    });
    
    debugLog(`[blockCommands] Block inserted: ${mappedType}`);
    return true;
  } catch (error) {
    debugError('[blockCommands] insertBlockAfter error:', error);
    return false;
  }
}

/**
 * Delete the current block
 */
export function deleteBlock(editor: PlateEditor): boolean {
  try {
    editor.tf.removeNodes({
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    debugLog('[blockCommands] Block deleted');
    return true;
  } catch (error) {
    debugError('[blockCommands] deleteBlock error:', error);
    return false;
  }
}

/**
 * Get the current block type
 */
export function getCurrentBlockType(editor: PlateEditor): string | null {
  try {
    const [match] = editor.api.nodes({
      match: (n: SlateNode) => editor.api.isBlock(n),
      mode: 'lowest'
    });
    
    if (match) {
      const [node] = match;
      return (node as SlateNode).type || null;
    }
    
    return null;
  } catch (error) {
    debugError('[blockCommands] getCurrentBlockType error:', error);
    return null;
  }
}
