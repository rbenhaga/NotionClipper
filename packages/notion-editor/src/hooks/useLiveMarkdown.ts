/**
 * useLiveMarkdown - Real-time Markdown formatting hook
 * 
 * Converts Markdown syntax to HTML as the user types, providing
 * a Notion-like editing experience.
 * 
 * Supported patterns:
 * - Bold: **text** → <strong>text</strong>
 * - Italic: *text* → <em>text</em>
 * - Code: `text` → <code>text</code>
 * - Strikethrough: ~~text~~ → <s>text</s>
 * - Link: [text](url) → <a href="url">text</a>
 * 
 * Requirements: 16.1-16.5
 */

import { useCallback, useRef } from 'react';

/** Result of processing inline formatting */
interface FormattingResult {
  applied: boolean;
  patternName?: string;
}

/** Pattern definition for inline Markdown */
interface InlinePattern {
  name: string;
  /** Regex to match the pattern - must end with $ to match at cursor */
  regex: RegExp;
  /** Function to create the replacement HTML */
  createReplacement: (match: RegExpMatchArray) => string;
  /** Length of the opening marker (e.g., 2 for **) */
  openingLength: number;
  /** Length of the closing marker (e.g., 2 for **) */
  closingLength: number;
}

/**
 * Inline patterns ordered by priority
 * Bold must come before italic to handle ** vs *
 */
const INLINE_PATTERNS: InlinePattern[] = [
  // Bold: **text**
  {
    name: 'bold',
    regex: /\*\*([^*]+)\*\*$/,
    createReplacement: (match) => `<strong>${match[1]}</strong>`,
    openingLength: 2,
    closingLength: 2,
  },
  // Italic: *text* (not preceded by *)
  {
    name: 'italic',
    regex: /(?<!\*)\*([^*]+)\*$/,
    createReplacement: (match) => `<em>${match[1]}</em>`,
    openingLength: 1,
    closingLength: 1,
  },
  // Code: `text`
  {
    name: 'code',
    regex: /`([^`]+)`$/,
    createReplacement: (match) => `<code class="notion-inline-code">${match[1]}</code>`,
    openingLength: 1,
    closingLength: 1,
  },
  // Strikethrough: ~~text~~
  {
    name: 'strikethrough',
    regex: /~~([^~]+)~~$/,
    createReplacement: (match) => `<s>${match[1]}</s>`,
    openingLength: 2,
    closingLength: 2,
  },
  // Link: [text](url)
  {
    name: 'link',
    regex: /\[([^\]]+)\]\(([^)]+)\)$/,
    createReplacement: (match) => `<a href="${match[2]}" class="notion-link">${match[1]}</a>`,
    openingLength: 1, // [
    closingLength: 1, // )
  },
];

export interface UseLiveMarkdownProps {
  /** Reference to the editor element */
  editorRef: React.RefObject<HTMLElement>;
  /** Whether live markdown is enabled */
  enabled?: boolean;
  /** Callback when content changes after formatting */
  onContentChange?: () => void;
}

export interface UseLiveMarkdownReturn {
  /** Process input for live markdown formatting */
  processInput: () => FormattingResult;
}

/**
 * Hook for real-time Markdown to HTML conversion
 * 
 * Detects Markdown patterns at cursor position and converts them to HTML.
 * Preserves cursor position after conversion.
 */
export function useLiveMarkdown({
  editorRef,
  enabled = true,
  onContentChange,
}: UseLiveMarkdownProps): UseLiveMarkdownReturn {
  // Track if we're currently processing to avoid recursion
  const isProcessingRef = useRef(false);

  /**
   * Get text content before cursor in the current text node
   */
  const getTextBeforeCursor = useCallback((): { text: string; node: Text; offset: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null; // Only process when cursor, not selection

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;

    return {
      text: node.textContent?.substring(0, range.startOffset) || '',
      node: node as Text,
      offset: range.startOffset,
    };
  }, []);

  /**
   * Apply formatting by replacing matched text with HTML
   */
  const applyFormatting = useCallback((
    textNode: Text,
    match: RegExpMatchArray,
    pattern: InlinePattern,
    cursorOffset: number
  ): boolean => {
    try {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;
      const textAfterCursor = textNode.textContent?.substring(cursorOffset) || '';

      // Create the replacement HTML
      const replacement = pattern.createReplacement(match);

      // Split the text node and insert HTML
      const beforeText = textNode.textContent?.substring(0, matchStart) || '';
      
      // Create a temporary container to parse the HTML
      const temp = document.createElement('span');
      temp.innerHTML = replacement;
      
      // Get the formatted element
      const formattedElement = temp.firstChild;
      if (!formattedElement) return false;

      // Create text nodes for before and after
      const beforeNode = document.createTextNode(beforeText);
      const afterNode = document.createTextNode(textAfterCursor);
      // Add a zero-width space after to ensure cursor can be placed after the element
      const spacerNode = document.createTextNode('\u200B');

      // Replace the text node with our new nodes
      const parent = textNode.parentNode;
      if (!parent) return false;

      parent.insertBefore(beforeNode, textNode);
      parent.insertBefore(formattedElement, textNode);
      parent.insertBefore(spacerNode, textNode);
      if (textAfterCursor) {
        parent.insertBefore(afterNode, textNode);
      }
      parent.removeChild(textNode);

      // Set cursor after the formatted element (on the spacer)
      const selection = window.getSelection();
      if (selection) {
        const newRange = document.createRange();
        newRange.setStart(spacerNode, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      return true;
    } catch (error) {
      console.error('[useLiveMarkdown] Error applying formatting:', error);
      return false;
    }
  }, []);

  /**
   * Process input for live markdown formatting
   * Called on each input event
   */
  const processInput = useCallback((): FormattingResult => {
    if (!enabled || isProcessingRef.current) {
      return { applied: false };
    }

    if (!editorRef.current) {
      return { applied: false };
    }

    const textInfo = getTextBeforeCursor();
    if (!textInfo) {
      return { applied: false };
    }

    const { text, node, offset } = textInfo;

    // Try each pattern in order
    for (const pattern of INLINE_PATTERNS) {
      const match = text.match(pattern.regex);
      
      if (match && match.index !== undefined) {
        isProcessingRef.current = true;
        
        const success = applyFormatting(node, match, pattern, offset);
        
        if (success) {
          // Notify content change
          onContentChange?.();
          isProcessingRef.current = false;
          
          return {
            applied: true,
            patternName: pattern.name,
          };
        }
        
        isProcessingRef.current = false;
      }
    }

    return { applied: false };
  }, [enabled, editorRef, getTextBeforeCursor, applyFormatting, onContentChange]);

  return {
    processInput,
  };
}

export default useLiveMarkdown;
