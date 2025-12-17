/**
 * useSlashCommands - Slash command detection and filtering hook
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * - 8.1: Show menu when "/" is typed at line start or after whitespace
 * - 8.2: Filter commands by typed text after "/"
 * - 8.3: Execute command and close menu on selection
 * - 8.4: Close menu on Escape
 * - 8.5: Close menu when space is typed after "/"
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Position, UseSlashCommandsReturn } from '../types';

export interface UseSlashCommandsProps {
  /** Reference to the editor container element */
  editorRef: React.RefObject<HTMLElement>;
  /** Whether slash commands should be enabled */
  enabled?: boolean;
  /** Callback when a command should be executed */
  onCommandExecute?: () => void;
}

interface SlashStartPosition {
  node: Node;
  offset: number;
}

/**
 * Hook for managing slash command menu visibility, positioning, and filtering
 * 
 * Detects "/" at line start or after whitespace and tracks filter text.
 * Filtering is case-insensitive against command name and keywords.
 */
export function useSlashCommands({
  editorRef,
  enabled = true,
  onCommandExecute,
}: UseSlashCommandsProps): UseSlashCommandsReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Track where the slash was typed
  const slashStartPositionRef = useRef<SlashStartPosition | null>(null);

  // Requirement 8.4: Hide menu immediately (also used for 8.3, 8.5)
  const hide = useCallback(() => {
    setIsVisible(false);
    setFilter('');
    setSelectedIndex(0);
    slashStartPositionRef.current = null;
  }, []);

  // Get cursor position for menu placement
  const getCursorPosition = useCallback((): Position => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { x: 0, y: 0 };
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    return {
      x: rect.left,
      y: rect.bottom,
    };
  }, []);

  // Check if character before cursor is whitespace or start of line
  const isValidSlashPosition = useCallback((text: string, cursorPos: number): boolean => {
    // "/" at position 0 is valid (start of content)
    if (cursorPos <= 1) return true;
    
    // Check character before the "/"
    const charBefore = text[cursorPos - 2];
    
    // Valid if preceded by whitespace or newline
    return charBefore === ' ' || charBefore === '\n' || charBefore === '\t';
  }, []);

  // Handle input changes to detect "/" and update filter
  const handleInput = useCallback(() => {
    if (!enabled || !editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    // Only handle text nodes
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent || '';
    const cursorPos = range.startOffset;

    // Requirement 8.1: Detect "/" at line start or after whitespace
    if (!isVisible && cursorPos > 0 && text[cursorPos - 1] === '/') {
      if (isValidSlashPosition(text, cursorPos)) {
        // Store the position where "/" was typed
        slashStartPositionRef.current = {
          node,
          offset: cursorPos - 1, // Position of the "/"
        };
        
        setPosition(getCursorPosition());
        setFilter('');
        setSelectedIndex(0);
        setIsVisible(true);
      }
    } 
    // Requirement 8.2: Update filter if menu is open
    else if (isVisible && slashStartPositionRef.current) {
      const { node: startNode, offset: startOffset } = slashStartPositionRef.current;
      
      // Check if we're still in the same text node
      if (node === startNode) {
        // Get text after the "/"
        const filterText = text.substring(startOffset + 1, cursorPos);
        
        // Requirement 8.5: Close menu if space is typed
        if (filterText.includes(' ')) {
          hide();
          return;
        }
        
        // Close if cursor moved before the slash
        if (cursorPos <= startOffset) {
          hide();
          return;
        }
        
        setFilter(filterText);
      } else {
        // Cursor moved to different node, close menu
        hide();
      }
    }
  }, [enabled, editorRef, isVisible, isValidSlashPosition, getCursorPosition, hide]);

  // Listen to input events on the editor
  useEffect(() => {
    if (!enabled) return;

    const element = editorRef.current;
    if (!element) return;

    element.addEventListener('input', handleInput);

    return () => {
      element.removeEventListener('input', handleInput);
    };
  }, [enabled, editorRef, handleInput]);

  // Requirement 8.4: Handle Escape key to close menu
  useEffect(() => {
    if (!enabled || !isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        hide();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, isVisible, hide]);

  // Handle click outside to close menu
  useEffect(() => {
    if (!enabled || !isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Don't close if clicking inside the editor
      if (editorRef.current?.contains(target)) return;
      
      // Don't close if clicking on the slash menu itself
      const slashMenu = document.querySelector('[data-slash-menu]');
      if (slashMenu?.contains(target)) return;

      hide();
    };

    // Delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [enabled, isVisible, editorRef, hide]);

  // Reset filter when menu closes
  useEffect(() => {
    if (!isVisible) {
      setFilter('');
      setSelectedIndex(0);
    }
  }, [isVisible]);

  return {
    isVisible,
    position,
    filter,
    selectedIndex,
    hide,
  };
}

export default useSlashCommands;
