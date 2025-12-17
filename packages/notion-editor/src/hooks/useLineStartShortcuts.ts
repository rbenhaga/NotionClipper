/**
 * useLineStartShortcuts - Line-start Markdown shortcuts hook
 * 
 * Detects and converts Markdown shortcuts at the beginning of lines
 * to their corresponding block types, providing a Notion-like editing experience.
 * 
 * Supported shortcuts (triggered by Space):
 * - Heading 1: # + space → <h1>
 * - Heading 2: ## + space → <h2>
 * - Heading 3: ### + space → <h3>
 * - Bullet list: -, *, + + space → <ul><li>
 * - Numbered list: 1., a., i. + space → <ol><li>
 * - Todo: [] or [ ] + space → checkbox
 * - Quote: > + space → <blockquote>
 * - Divider: --- + Enter → <hr>
 * 
 * Requirements: 17.1-17.9
 */

import { useCallback, useRef } from 'react';

/** Block types that can be created */
export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'todo'
  | 'quote'
  | 'divider';

/** Result of processing a line-start shortcut */
interface ShortcutResult {
  applied: boolean;
  blockType?: BlockType;
}

/** Pattern definition for line-start shortcuts */
interface LineStartPattern {
  name: string;
  blockType: BlockType;
  /** Regex to match the shortcut at line start */
  regex: RegExp;
  /** Create the HTML replacement */
  createBlock: (content: string, metadata?: Record<string, unknown>) => string;
  /** Extract content after the shortcut */
  extractContent: (match: RegExpMatchArray) => string;
  /** Extract metadata (e.g., checked state for todo) */
  extractMetadata?: (match: RegExpMatchArray) => Record<string, unknown>;
}

/**
 * Line-start patterns ordered by specificity
 * More specific patterns (###) must come before less specific (#)
 */
const LINE_START_PATTERNS: LineStartPattern[] = [
  // Heading 3: ###
  {
    name: 'heading3',
    blockType: 'heading_3',
    regex: /^###\s$/,
    createBlock: (content) => `<h3 class="notion-heading-3" style="font-size: 1.25em; font-weight: 600; line-height: 1.3; margin: 0;">${content || '<br>'}</h3>`,
    extractContent: () => '',
  },
  // Heading 2: ##
  {
    name: 'heading2',
    blockType: 'heading_2',
    regex: /^##\s$/,
    createBlock: (content) => `<h2 class="notion-heading-2" style="font-size: 1.5em; font-weight: 600; line-height: 1.3; margin: 0;">${content || '<br>'}</h2>`,
    extractContent: () => '',
  },
  // Heading 1: #
  {
    name: 'heading1',
    blockType: 'heading_1',
    regex: /^#\s$/,
    createBlock: (content) => `<h1 class="notion-heading-1" style="font-size: 1.875em; font-weight: 700; line-height: 1.3; margin: 0;">${content || '<br>'}</h1>`,
    extractContent: () => '',
  },
  // Divider: ---
  {
    name: 'divider',
    blockType: 'divider',
    regex: /^---$/,
    createBlock: () => '<hr class="notion-divider"><p><br></p>',
    extractContent: () => '',
  },
  // Todo checked: [x]
  {
    name: 'todoChecked',
    blockType: 'todo',
    regex: /^\[x\]\s$/i,
    createBlock: (content, metadata) => {
      const checked = metadata?.checked ? 'checked' : '';
      return `<div class="notion-todo" data-checked="${checked ? 'true' : 'false'}">
        <input type="checkbox" ${checked} class="notion-todo-checkbox">
        <span class="notion-todo-content">${content || '<br>'}</span>
      </div>`;
    },
    extractContent: () => '',
    extractMetadata: () => ({ checked: true }),
  },
  // Todo unchecked: [] or [ ]
  {
    name: 'todoUnchecked',
    blockType: 'todo',
    regex: /^\[\s?\]\s$/,
    createBlock: (content) => `<div class="notion-todo" data-checked="false">
      <input type="checkbox" class="notion-todo-checkbox">
      <span class="notion-todo-content">${content || '<br>'}</span>
    </div>`,
    extractContent: () => '',
    extractMetadata: () => ({ checked: false }),
  },
  // Numbered list: 1., a., i.
  {
    name: 'numberedList',
    blockType: 'numbered_list',
    regex: /^(\d+|[a-z]|[ivxlcdm]+)\.\s$/i,
    createBlock: (content) => `<ol class="notion-numbered-list"><li>${content || '<br>'}</li></ol>`,
    extractContent: () => '',
  },
  // Bullet list: -, *, +
  {
    name: 'bulletList',
    blockType: 'bulleted_list',
    regex: /^[-*+]\s$/,
    createBlock: (content) => `<ul class="notion-bulleted-list"><li>${content || '<br>'}</li></ul>`,
    extractContent: () => '',
  },
  // Quote: >
  {
    name: 'quote',
    blockType: 'quote',
    regex: /^>\s$/,
    createBlock: (content) => `<blockquote class="notion-quote">${content || '<br>'}</blockquote>`,
    extractContent: () => '',
  },
];

export interface UseLineStartShortcutsProps {
  /** Reference to the editor element */
  editorRef: React.RefObject<HTMLElement>;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback when content changes after conversion */
  onContentChange?: () => void;
}

export interface UseLineStartShortcutsReturn {
  /** Handle keydown events to detect shortcuts */
  handleKeyDown: (e: React.KeyboardEvent) => ShortcutResult;
}

/**
 * Hook for line-start Markdown shortcuts
 * 
 * Detects shortcuts when Space or Enter is pressed and converts
 * the current line to the appropriate block type.
 */
export function useLineStartShortcuts({
  editorRef,
  enabled = true,
  onContentChange,
}: UseLineStartShortcutsProps): UseLineStartShortcutsReturn {
  const isProcessingRef = useRef(false);

  /**
   * Get the current line's text content and its containing element
   */
  const getCurrentLineInfo = useCallback((): {
    text: string;
    element: HTMLElement;
    textNode: Text;
    offset: number;
  } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null;

    let node = range.startContainer;
    const offset = range.startOffset;

    // Find the text node
    if (node.nodeType !== Node.TEXT_NODE) {
      // If we're in an element, try to find a text node
      if (node.childNodes.length > 0 && offset < node.childNodes.length) {
        const child = node.childNodes[offset];
        if (child.nodeType === Node.TEXT_NODE) {
          node = child;
        }
      }
      if (node.nodeType !== Node.TEXT_NODE) return null;
    }

    // Find the block-level parent element
    let element = node.parentElement;
    while (element && !isBlockElement(element)) {
      // If we reach the editor container, wrap the text in a <p> first
      if (element.classList.contains('notion-editor-area') || element.contentEditable === 'true') {
        // The text is directly in the editor, we need to wrap it
        const wrapper = document.createElement('p');
        
        // Move all direct text nodes and inline elements into the wrapper
        const nodesToMove: Node[] = [];
        element.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE || 
              (child.nodeType === Node.ELEMENT_NODE && !isBlockElement(child as HTMLElement))) {
            nodesToMove.push(child);
          }
        });
        
        if (nodesToMove.length > 0) {
          nodesToMove.forEach(n => wrapper.appendChild(n));
          element.insertBefore(wrapper, element.firstChild);
          element = wrapper;
          break;
        }
        return null;
      }
      element = element.parentElement;
    }

    if (!element) return null;

    // Get text content up to cursor
    const text = node.textContent?.substring(0, offset) || '';

    return {
      text,
      element,
      textNode: node as Text,
      offset,
    };
  }, []);

  /**
   * Check if an element is a block-level element
   */
  const isBlockElement = (element: HTMLElement): boolean => {
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
    return blockTags.includes(element.tagName);
  };

  /**
   * Apply the block conversion
   */
  const applyBlockConversion = useCallback((
    element: HTMLElement,
    pattern: LineStartPattern,
    remainingContent: string
  ): boolean => {
    try {
      const metadata = pattern.extractMetadata?.([] as unknown as RegExpMatchArray);
      const newBlockHtml = pattern.createBlock(remainingContent, metadata);

      // Create temporary container to parse HTML
      const temp = document.createElement('div');
      temp.innerHTML = newBlockHtml;
      const newBlock = temp.firstElementChild as HTMLElement;

      if (!newBlock) return false;

      // Replace the current element with the new block
      const parent = element.parentNode;
      if (!parent) return false;

      parent.replaceChild(newBlock, element);

      // Set cursor inside the new block - use requestAnimationFrame for DOM stability
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        
        // Find the content area to place cursor
        let targetNode: Node = newBlock;
        
        // For todo, place cursor in the content span
        if (pattern.blockType === 'todo') {
          const contentSpan = newBlock.querySelector('.notion-todo-content');
          if (contentSpan) targetNode = contentSpan;
        }
        // For lists, place cursor in the li
        else if (pattern.blockType === 'bulleted_list' || pattern.blockType === 'numbered_list') {
          const li = newBlock.querySelector('li');
          if (li) targetNode = li;
        }

        // Remove any <br> and ensure we have a text node
        if (targetNode instanceof Element) {
          const br = targetNode.querySelector('br');
          if (br) {
            br.remove();
          }
        }

        // Find or create a text node to place cursor
        let textNode: Text | null = null;
        for (const child of Array.from(targetNode.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            textNode = child as Text;
            break;
          }
        }

        if (!textNode) {
          textNode = document.createTextNode('');
          targetNode.appendChild(textNode);
        }

        range.setStart(textNode, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        // Focus the editor to ensure typing works
        const editor = newBlock.closest('[contenteditable="true"]');
        if (editor instanceof HTMLElement) {
          editor.focus();
        }
      });

      return true;
    } catch (error) {
      console.error('[useLineStartShortcuts] Error applying conversion:', error);
      return false;
    }
  }, []);

  /**
   * Handle keydown events to detect and apply shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent): ShortcutResult => {
    if (!enabled || isProcessingRef.current) {
      return { applied: false };
    }

    // Only process Space key (and Enter for divider)
    if (e.key !== ' ' && e.key !== 'Enter') {
      return { applied: false };
    }

    if (!editorRef.current) {
      return { applied: false };
    }

    const lineInfo = getCurrentLineInfo();
    if (!lineInfo) {
      return { applied: false };
    }

    const { text, element, textNode, offset } = lineInfo;
    
    // Add the triggering character to check the pattern
    const textWithTrigger = e.key === ' ' ? text + ' ' : text;

    // Try each pattern
    for (const pattern of LINE_START_PATTERNS) {
      // Divider only triggers on Enter
      if (pattern.blockType === 'divider' && e.key !== 'Enter') {
        continue;
      }
      // Other patterns only trigger on Space
      if (pattern.blockType !== 'divider' && e.key !== ' ') {
        continue;
      }

      const match = textWithTrigger.match(pattern.regex);
      
      if (match) {
        e.preventDefault();
        isProcessingRef.current = true;

        // Get any content after the shortcut (for divider, there's none)
        const remainingContent = textNode.textContent?.substring(offset) || '';

        const success = applyBlockConversion(element, pattern, remainingContent);

        if (success) {
          onContentChange?.();
          isProcessingRef.current = false;
          
          return {
            applied: true,
            blockType: pattern.blockType,
          };
        }

        isProcessingRef.current = false;
      }
    }

    return { applied: false };
  }, [enabled, editorRef, getCurrentLineInfo, applyBlockConversion, onContentChange]);

  return {
    handleKeyDown,
  };
}

export default useLineStartShortcuts;
