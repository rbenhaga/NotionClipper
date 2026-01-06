/**
 * ✅ P0.5: Unit tests for blockCommands
 * 
 * Tests cover:
 * - setBlockType transforms (h1, h2, h3, paragraph, quote, code)
 * - toggleList (ul/ol) with proper wrap/unwrap
 * - toggleTodo
 * - insertVoidBlock (divider)
 * - ID stability after transforms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PlateEditor interface for testing
interface MockNode {
  id: string;
  type: string;
  children: Array<{ text: string }>;
  [key: string]: unknown;
}

interface MockEditor {
  children: MockNode[];
  selection: { anchor: { path: number[] }; focus: { path: number[] } } | null;
  tf: {
    setNodes: ReturnType<typeof vi.fn>;
    wrapNodes: ReturnType<typeof vi.fn>;
    unwrapNodes: ReturnType<typeof vi.fn>;
    insertNodes: ReturnType<typeof vi.fn>;
    removeNodes: ReturnType<typeof vi.fn>;
    collapse: ReturnType<typeof vi.fn>;
  };
  api: {
    nodes: ReturnType<typeof vi.fn>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isBlock: any;
  };
}

// Create mock editor factory
function createMockEditor(initialNode: MockNode): MockEditor {
  const editor: MockEditor = {
    children: [initialNode],
    selection: { anchor: { path: [0] }, focus: { path: [0] } },
    tf: {
      setNodes: vi.fn(),
      wrapNodes: vi.fn(),
      unwrapNodes: vi.fn(),
      insertNodes: vi.fn(),
      removeNodes: vi.fn(),
      collapse: vi.fn(),
    },
    api: {
      nodes: vi.fn(),
      isBlock: vi.fn((n: unknown) => typeof n === 'object' && n !== null && 'type' in n),
    },
  };

  // Default: return the initial node
  editor.api.nodes.mockReturnValue([[initialNode, [0]]]);

  return editor;
}

// Import after mocks are set up
import {
  setBlockType,
  insertBlockAfter,
  deleteBlock,
  getCurrentBlockType,
  BLOCK_TYPE_MAP,
} from '../commands/blockCommands';

describe('blockCommands', () => {
  // ============================================================================
  // 1. BLOCK TYPE MAP
  // ============================================================================
  describe('BLOCK_TYPE_MAP', () => {
    it('should map slash menu types to Plate types', () => {
      expect(BLOCK_TYPE_MAP['h1']).toBe('h1');
      expect(BLOCK_TYPE_MAP['h2']).toBe('h2');
      expect(BLOCK_TYPE_MAP['h3']).toBe('h3');
      expect(BLOCK_TYPE_MAP['paragraph']).toBe('p');
      expect(BLOCK_TYPE_MAP['ul']).toBe('ul');
      expect(BLOCK_TYPE_MAP['ol']).toBe('ol');
      expect(BLOCK_TYPE_MAP['quote']).toBe('blockquote');
      expect(BLOCK_TYPE_MAP['code']).toBe('code_block');
      expect(BLOCK_TYPE_MAP['divider']).toBe('hr');
      expect(BLOCK_TYPE_MAP['todo']).toBe('action_item');
    });
  });

  // ============================================================================
  // 2. SET BLOCK TYPE - HEADINGS
  // ============================================================================
  describe('setBlockType - headings', () => {
    it('should transform paragraph to h1 and preserve ID', () => {
      const node: MockNode = { id: 'block-123', type: 'p', children: [{ text: 'Hello' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'h1');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'h1' },
        expect.objectContaining({ mode: 'lowest' })
      );
      // ID should NOT be changed (setNodes preserves it)
    });

    it('should transform paragraph to h2', () => {
      const node: MockNode = { id: 'block-456', type: 'p', children: [{ text: 'World' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'h2');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'h2' },
        expect.objectContaining({ mode: 'lowest' })
      );
    });

    it('should transform h1 to paragraph', () => {
      const node: MockNode = { id: 'block-789', type: 'h1', children: [{ text: 'Title' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'paragraph');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'p' },
        expect.objectContaining({ mode: 'lowest' })
      );
    });
  });

  // ============================================================================
  // 3. SET BLOCK TYPE - QUOTE/CODE
  // ============================================================================
  describe('setBlockType - quote and code', () => {
    it('should transform to blockquote', () => {
      const node: MockNode = { id: 'block-quote', type: 'p', children: [{ text: 'Quote' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'quote');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'blockquote' },
        expect.objectContaining({ mode: 'lowest' })
      );
    });

    it('should transform to code_block', () => {
      const node: MockNode = { id: 'block-code', type: 'p', children: [{ text: 'const x = 1;' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'code');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'code_block' },
        expect.objectContaining({ mode: 'lowest' })
      );
    });
  });

  // ============================================================================
  // 4. TOGGLE LIST
  // ============================================================================
  describe('setBlockType - lists', () => {
    it('should wrap paragraph in ul list structure', () => {
      const node: MockNode = { id: 'block-list', type: 'p', children: [{ text: 'Item' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'ul');

      expect(result).toBe(true);
      // Should call wrapNodes for list structure
      expect(editor.tf.wrapNodes).toHaveBeenCalled();
    });

    it('should wrap paragraph in ol list structure', () => {
      const node: MockNode = { id: 'block-ol', type: 'p', children: [{ text: 'Item 1' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'ol');

      expect(result).toBe(true);
      expect(editor.tf.wrapNodes).toHaveBeenCalled();
    });

    it('should unwrap ul to paragraph when toggling off', () => {
      const node: MockNode = { id: 'block-li', type: 'li', children: [{ text: 'Item' }] };
      const editor = createMockEditor(node);
      
      // Mock parent as ul
      editor.api.nodes
        .mockReturnValueOnce([[node, [0]]]) // First call: current block
        .mockReturnValueOnce([[{ type: 'ul', children: [node] }, [0]]]); // Second call: parent

      const result = setBlockType(editor as any, 'ul');

      expect(result).toBe(true);
      // Should unwrap and set to paragraph
      expect(editor.tf.unwrapNodes).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 5. TOGGLE TODO
  // ============================================================================
  describe('setBlockType - todo', () => {
    it('should transform paragraph to action_item with checked=false', () => {
      const node: MockNode = { id: 'block-todo', type: 'p', children: [{ text: 'Task' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'todo');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'action_item', checked: false },
        expect.objectContaining({ mode: 'lowest' })
      );
    });

    it('should transform action_item back to paragraph', () => {
      const node: MockNode = { id: 'block-todo-off', type: 'action_item', checked: true, children: [{ text: 'Done' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'todo');

      expect(result).toBe(true);
      expect(editor.tf.setNodes).toHaveBeenCalledWith(
        { type: 'p' },
        expect.objectContaining({ mode: 'lowest' })
      );
    });
  });

  // ============================================================================
  // 6. DIVIDER (VOID BLOCK)
  // ============================================================================
  describe('setBlockType - divider', () => {
    it('should insert hr void block', () => {
      const node: MockNode = { id: 'block-div', type: 'p', children: [{ text: '' }] };
      const editor = createMockEditor(node);

      const result = setBlockType(editor as any, 'divider');

      expect(result).toBe(true);
      // Should insert hr node
      expect(editor.tf.insertNodes).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'hr' })
      );
      // Should also insert paragraph after for continued editing
      expect(editor.tf.insertNodes).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // 7. INSERT BLOCK AFTER
  // ============================================================================
  describe('insertBlockAfter', () => {
    it('should insert new block after current', () => {
      const node: MockNode = { id: 'block-current', type: 'p', children: [{ text: 'Current' }] };
      const editor = createMockEditor(node);

      const result = insertBlockAfter(editor as any, 'h2');

      expect(result).toBe(true);
      expect(editor.tf.collapse).toHaveBeenCalledWith({ edge: 'end' });
      expect(editor.tf.insertNodes).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'h2' })
      );
    });
  });

  // ============================================================================
  // 8. DELETE BLOCK
  // ============================================================================
  describe('deleteBlock', () => {
    it('should remove current block', () => {
      const node: MockNode = { id: 'block-delete', type: 'p', children: [{ text: 'Delete me' }] };
      const editor = createMockEditor(node);

      const result = deleteBlock(editor as any);

      expect(result).toBe(true);
      expect(editor.tf.removeNodes).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'lowest' })
      );
    });
  });

  // ============================================================================
  // 9. GET CURRENT BLOCK TYPE
  // ============================================================================
  describe('getCurrentBlockType', () => {
    it('should return current block type', () => {
      const node: MockNode = { id: 'block-get', type: 'h1', children: [{ text: 'Title' }] };
      const editor = createMockEditor(node);

      const result = getCurrentBlockType(editor as any);

      expect(result).toBe('h1');
    });

    it('should return null if no block found', () => {
      const editor = createMockEditor({ id: 'empty', type: 'p', children: [] });
      editor.api.nodes.mockReturnValue([]);

      const result = getCurrentBlockType(editor as any);

      expect(result).toBe(null);
    });
  });

  // ============================================================================
  // 10. ID STABILITY
  // ============================================================================
  describe('ID stability', () => {
    it('should NOT modify block ID during setBlockType', () => {
      const originalId = 'stable-id-12345';
      const node: MockNode = { id: originalId, type: 'p', children: [{ text: 'Content' }] };
      const editor = createMockEditor(node);

      setBlockType(editor as any, 'h2');

      // setNodes should NOT include id in the update
      const setNodesCall = editor.tf.setNodes.mock.calls[0];
      expect(setNodesCall[0]).not.toHaveProperty('id');
      expect(setNodesCall[0]).toEqual({ type: 'h2' });
    });

    it('should preserve ID through multiple transforms', () => {
      const originalId = 'multi-transform-id';
      const node: MockNode = { id: originalId, type: 'p', children: [{ text: 'Multi' }] };
      const editor = createMockEditor(node);

      // Transform p -> h1
      setBlockType(editor as any, 'h1');
      expect(editor.tf.setNodes.mock.calls[0][0]).not.toHaveProperty('id');

      // Update mock to reflect new type
      editor.api.nodes.mockReturnValue([[{ ...node, type: 'h1' }, [0]]]);

      // Transform h1 -> quote
      setBlockType(editor as any, 'quote');
      expect(editor.tf.setNodes.mock.calls[1][0]).not.toHaveProperty('id');
    });
  });

  // ============================================================================
  // 11. ERROR HANDLING
  // ============================================================================
  describe('error handling', () => {
    it('should return false and not throw on editor error', () => {
      const node: MockNode = { id: 'error-block', type: 'p', children: [{ text: 'Error' }] };
      const editor = createMockEditor(node);
      editor.tf.setNodes.mockImplementation(() => {
        throw new Error('Editor error');
      });

      // Silence expected console.error output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = setBlockType(editor as any, 'h1');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should handle missing block gracefully', () => {
      const editor = createMockEditor({ id: 'empty', type: 'p', children: [] });
      editor.api.nodes.mockReturnValue([]);

      const result = setBlockType(editor as any, 'ul');

      expect(result).toBe(false);
    });
  });
});
