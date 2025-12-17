/**
 * useEditorState - Editor state management hook with useReducer
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * - 6.1: Convert initial content to HTML on initialization
 * - 6.2: Sync state if not dirty when content changes externally
 * - 6.3: Mark state as dirty and notify onChange when user edits
 * - 6.4: Update content and maintain cursor position when inserting text
 * - 6.5: Return current Markdown content via getContent
 */

import { useReducer, useRef, useCallback, useEffect } from 'react';
import { markdownToHtml, htmlToMarkdown } from '@notion-clipper/core-shared';
import type { EditorState, EditorAction, UseEditorStateReturn } from '../types';

// Cursor position interface for save/restore
interface CursorPosition {
  node: Node;
  offset: number;
  endNode?: Node;
  endOffset?: number;
}

// Initial state factory
function createInitialState(content: string): EditorState {
  return {
    content,
    html: markdownToHtml(content),
    isDirty: false,
    isFocused: false,
  };
}

// Reducer for editor state management
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_CONTENT':
      return {
        ...state,
        content: action.payload,
        html: markdownToHtml(action.payload),
      };
    case 'SET_HTML':
      return {
        ...state,
        html: action.payload,
        content: htmlToMarkdown(action.payload),
      };
    case 'MARK_DIRTY':
      return { ...state, isDirty: true };
    case 'MARK_CLEAN':
      return { ...state, isDirty: false };
    case 'FOCUS':
      return { ...state, isFocused: action.payload };
    default:
      return state;
  }
}

export interface UseEditorStateProps {
  content: string;
  onChange: (content: string) => void;
}

export function useEditorState({ content, onChange }: UseEditorStateProps): UseEditorStateReturn {
  const ref = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(editorReducer, content, createInitialState);
  const lastContentRef = useRef(content);
  // Use a ref to track dirty state synchronously (dispatch is async)
  const isDirtyRef = useRef(false);

  // Requirement 6.2: Sync state if not dirty when content changes externally
  // IMPORTANT: Only sync when the editor is NOT dirty (user hasn't edited)
  // This prevents the content from being overwritten while the user is typing
  useEffect(() => {
    // Skip if user has edited (check ref for synchronous state)
    if (isDirtyRef.current || state.isDirty) {
      lastContentRef.current = content;
      return;
    }

    // Only update if content actually changed from external source
    if (content !== lastContentRef.current) {
      dispatch({ type: 'SET_CONTENT', payload: content });
    }
    lastContentRef.current = content;
  }, [content, state.isDirty]);

  // Requirement 6.4: Save cursor position
  const saveCursorPosition = useCallback((): CursorPosition | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    return {
      node: range.startContainer,
      offset: range.startOffset,
      endNode: range.endContainer,
      endOffset: range.endOffset,
    };
  }, []);

  // Requirement 6.4: Restore cursor position
  const restoreCursorPosition = useCallback((position: CursorPosition | null) => {
    if (!position) return;

    try {
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();
      
      // Check if nodes are still in the document
      if (!document.contains(position.node)) return;
      
      range.setStart(position.node, Math.min(position.offset, position.node.textContent?.length || 0));
      
      if (position.endNode && document.contains(position.endNode)) {
        range.setEnd(position.endNode, Math.min(position.endOffset || 0, position.endNode.textContent?.length || 0));
      } else {
        range.collapse(true);
      }

      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.error('[useEditorState] Error restoring cursor:', error);
    }
  }, []);

  // Requirement 6.4: Insert text at cursor position
  const insertAtCursor = useCallback((text: string) => {
    if (!ref.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // If no selection, append to end
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const range = selection?.getRangeAt(0);
    if (!range) return;

    // Delete any selected content
    range.deleteContents();

    // Create text node and insert
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Trigger change
    handleChange();
  }, []);

  // Focus the editor
  const focus = useCallback(() => {
    ref.current?.focus();
    dispatch({ type: 'FOCUS', payload: true });
  }, []);

  // Get current selection
  const getSelection = useCallback((): Selection | null => {
    return window.getSelection();
  }, []);

  // Requirement 6.5: Get current Markdown content
  const getContent = useCallback((): string => {
    if (!ref.current) return state.content;
    return htmlToMarkdown(ref.current.innerHTML);
  }, [state.content]);

  // Requirement 6.3: Handle content changes
  // IMPORTANT: We don't dispatch SET_HTML here to avoid re-rendering
  // which would destroy the cursor position. We only update the markdown content.
  const handleChange = useCallback(() => {
    if (!ref.current) return;

    const newHtml = ref.current.innerHTML;
    const newContent = htmlToMarkdown(newHtml);

    // Mark as dirty SYNCHRONOUSLY to prevent external sync race condition
    isDirtyRef.current = true;
    dispatch({ type: 'MARK_DIRTY' });

    // Notify parent of content change
    onChange(newContent);
  }, [onChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
    }
  }, [insertAtCursor]);

  // Handle paste events (including images)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    
    // Check for images first
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Convert image to base64 and insert as markdown image
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const imgMarkdown = `![image](${base64})`;
            insertAtCursor(imgMarkdown);
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }

    e.preventDefault();
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    let contentToInsert: string;

    if (html) {
      // Convert HTML to Markdown, then back to HTML for consistency
      const markdown = htmlToMarkdown(html);
      contentToInsert = markdown;
    } else {
      contentToInsert = text;
    }

    insertAtCursor(contentToInsert);
  }, [insertAtCursor]);

  // Handle focus/blur events
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => dispatch({ type: 'FOCUS', payload: true });
    const handleBlur = () => dispatch({ type: 'FOCUS', payload: false });

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    ref,
    html: state.html,
    isFocused: state.isFocused,
    insertAtCursor,
    focus,
    getSelection,
    getContent,
    handleChange,
    handleKeyDown,
    handlePaste,
  };
}

export default useEditorState;
