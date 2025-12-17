/**
 * useFormattingMenu - Formatting menu visibility and positioning hook
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * - 7.1: Show menu positioned above selection when text is selected
 * - 7.2: Hide menu when selection is collapsed
 * - 7.3: Apply formatting and update content when action triggered
 * - 7.4: Close menu immediately when hide() is called
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Position, UseFormattingMenuReturn } from '../types';

export interface UseFormattingMenuProps {
  /** Reference to the editor container element */
  editorRef: React.RefObject<HTMLElement>;
  /** Whether the menu should be enabled */
  enabled?: boolean;
}

/**
 * Hook for managing formatting menu visibility and positioning
 * 
 * Listens to selectionchange events and calculates menu position
 * 40px above the selection center.
 */
export function useFormattingMenu({
  editorRef,
  enabled = true,
}: UseFormattingMenuProps): UseFormattingMenuReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const isHiddenManuallyRef = useRef(false);

  // Requirement 7.4: Hide menu immediately
  const hide = useCallback(() => {
    setIsVisible(false);
    isHiddenManuallyRef.current = true;
    // Reset manual hide flag after a short delay to allow new selections
    setTimeout(() => {
      isHiddenManuallyRef.current = false;
    }, 100);
  }, []);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (!enabled || !editorRef.current) {
      return;
    }

    // Don't show if manually hidden recently
    if (isHiddenManuallyRef.current) {
      return;
    }

    const selection = window.getSelection();
    
    // Requirement 7.2: Hide menu when selection is collapsed
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setIsVisible(false);
      return;
    }

    // Check if selection is within the editor
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setIsVisible(false);
      return;
    }

    // Get selection bounding rect
    const rect = range.getBoundingClientRect();
    
    // Skip if rect has no dimensions (empty selection)
    if (rect.width === 0 && rect.height === 0) {
      setIsVisible(false);
      return;
    }

    // Requirement 7.1: Position menu 40px above selection center
    const x = rect.left + rect.width / 2;
    const y = rect.top - 40;

    setPosition({ x, y });
    setIsVisible(true);
  }, [enabled, editorRef]);

  // Listen to selectionchange event
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Use document selectionchange event
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [enabled, handleSelectionChange]);

  // Hide menu when clicking outside editor
  useEffect(() => {
    if (!enabled || !isVisible) {
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Don't hide if clicking inside the editor
      if (editorRef.current?.contains(target)) {
        return;
      }

      // Don't hide if clicking on the formatting menu itself
      // (The menu component should handle its own click events)
      const formattingMenu = document.querySelector('[data-formatting-menu]');
      if (formattingMenu?.contains(target)) {
        return;
      }

      hide();
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [enabled, isVisible, editorRef, hide]);

  // Hide menu on scroll (selection position changes)
  useEffect(() => {
    if (!enabled || !isVisible) {
      return;
    }

    const handleScroll = () => {
      // Recalculate position on scroll instead of hiding
      handleSelectionChange();
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [enabled, isVisible, handleSelectionChange]);

  return {
    isVisible,
    position,
    hide,
  };
}

export default useFormattingMenu;
