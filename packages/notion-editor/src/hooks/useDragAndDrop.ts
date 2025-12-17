/**
 * useDragAndDrop - Block drag and drop handling hook
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * - 9.1: Show drag handle at correct position when hovering over a block
 * - 9.2: Track dragged block and show visual feedback when dragging starts
 * - 9.3: Show drop indicators when dragging over other blocks
 * - 9.4: Move block to new position when dropping
 * - 9.5: Restore original state when drag is cancelled
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BlockPosition, UseDragAndDropReturn } from '../types';

export interface UseDragAndDropProps {
  /** Reference to the editor container element */
  editorRef: React.RefObject<HTMLElement>;
  /** Whether drag and drop should be enabled */
  enabled?: boolean;
  /** Callback when content changes after a drop */
  onContentChange?: () => void;
}

/** Block selectors for detecting blocks */
const BLOCK_SELECTORS = 'p, h1, h2, h3, ul, ol, blockquote, pre, hr, details, .notion-todo, .notion-callout, .notion-image-block, .notion-file-block, .notion-video-block, .notion-audio-block, .notion-embed-block, .notion-bookmark-block, table, .notion-block, [data-block-id]';

/** Offset for positioning handle to the left of block (inside the padding area) */
const HANDLE_LEFT_OFFSET = 4;

/**
 * Hook for managing block drag and drop functionality
 * 
 * Detects blocks via .notion-block or [data-block-id] selectors.
 * Positions handle 20px to the left of the hovered block.
 */
export function useDragAndDrop({
  editorRef,
  enabled = true,
  onContentChange,
}: UseDragAndDropProps): UseDragAndDropReturn {
  // State for drag handle visibility and position
  const [showHandle, setShowHandle] = useState(false);
  const [handlePosition, setHandlePosition] = useState<BlockPosition>({ top: 0, left: 0 });
  
  // State for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<BlockPosition | null>(null);
  
  // Refs for tracking drag state
  const hoveredBlockRef = useRef<HTMLElement | null>(null);
  const draggedBlockRef = useRef<HTMLElement | null>(null);
  const dropTargetRef = useRef<{ element: HTMLElement; position: 'before' | 'after' } | null>(null);


  /**
   * Find block element at given coordinates
   * Requirement 9.1: Detect bloc survolé via .notion-block ou [data-block-id]
   */
  const findBlockAtPoint = useCallback((x: number, y: number): HTMLElement | null => {
    if (!editorRef.current) return null;

    // Look for blocks in the editor area (contenteditable div)
    const editorArea = editorRef.current.querySelector('.notion-editor-area') || editorRef.current;
    const blocks = editorArea.querySelectorAll(BLOCK_SELECTORS);
    
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        return block as HTMLElement;
      }
    }
    return null;
  }, [editorRef]);

  /**
   * Calculate handle position relative to editor
   * Requirement 9.1: Positionner handle: 20px à gauche du bloc
   */
  const calculateHandlePosition = useCallback((block: HTMLElement): BlockPosition => {
    if (!editorRef.current) return { top: 0, left: 0 };

    const containerRect = editorRef.current.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const scrollTop = editorRef.current.scrollTop || 0;

    // Position handle at the left edge of the container padding area
    // The container has paddingLeft: 32px, so we position at 4px from left
    return {
      top: blockRect.top - containerRect.top + scrollTop + 2, // +2 for vertical centering
      left: HANDLE_LEFT_OFFSET,
    };
  }, [editorRef]);

  /**
   * Calculate drop indicator position
   * Requirement 9.3: Show drop indicators when dragging over other blocks
   */
  const calculateDropIndicatorPosition = useCallback((
    block: HTMLElement,
    position: 'before' | 'after'
  ): BlockPosition => {
    if (!editorRef.current) return { top: 0, left: 0 };

    const containerRect = editorRef.current.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const scrollTop = editorRef.current.scrollTop || 0;

    return {
      top: position === 'before'
        ? blockRect.top - containerRect.top + scrollTop - 2
        : blockRect.bottom - containerRect.top + scrollTop - 1,
      left: 32, // Matches the container paddingLeft
    };
  }, [editorRef]);

  /**
   * Handle mouse move to show/hide drag handle
   * Requirement 9.1: Show drag handle at correct position when hovering
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || isDragging) return;

    const block = findBlockAtPoint(e.clientX, e.clientY);

    if (block && block !== hoveredBlockRef.current) {
      hoveredBlockRef.current = block;
      setHandlePosition(calculateHandlePosition(block));
      setShowHandle(true);
    } else if (!block) {
      hoveredBlockRef.current = null;
      setShowHandle(false);
    }
  }, [enabled, isDragging, findBlockAtPoint, calculateHandlePosition]);

  // Ref to track hide timeout
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle mouse leave from editor
   */
  const handleMouseLeave = useCallback(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    // Delay hiding significantly to allow moving to drag handle
    hideTimeoutRef.current = setTimeout(() => {
      if (!isDragging) {
        hoveredBlockRef.current = null;
        setShowHandle(false);
      }
    }, 500);
  }, [isDragging]);

  // Cancel hide when mouse enters the editor area again
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);


  /**
   * Start dragging a block
   * Requirement 9.2: Track dragged block and show visual feedback
   */
  const startDrag = useCallback((block: HTMLElement, e: React.DragEvent) => {
    if (!enabled) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'block');

    // Create a custom drag image (clone of the block)
    const dragImage = block.cloneNode(true) as HTMLElement;
    dragImage.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${block.offsetWidth}px;
      background: white;
      border-radius: 4px;
      box-shadow: rgba(15, 15, 15, 0.1) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 2px 4px;
      opacity: 0.9;
      padding: 4px 8px;
      pointer-events: none;
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    draggedBlockRef.current = block;
    setIsDragging(true);

    // Add visual feedback class
    block.classList.add('dragging-block');
  }, [enabled]);

  /**
   * Handle drag over to show drop indicator
   * Requirement 9.3: Show drop indicators when dragging over other blocks
   */
  const handleDragOver = useCallback((e: DragEvent) => {
    if (!isDragging || !draggedBlockRef.current) return;

    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const block = findBlockAtPoint(e.clientX, e.clientY);
    
    if (block && block !== draggedBlockRef.current) {
      const rect = block.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      dropTargetRef.current = { element: block, position };
      setDropIndicator(calculateDropIndicatorPosition(block, position));
    } else {
      dropTargetRef.current = null;
      setDropIndicator(null);
    }
  }, [isDragging, findBlockAtPoint, calculateDropIndicatorPosition]);

  /**
   * Handle drop to move block
   * Requirement 9.4: Move block to new position when dropping
   */
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();

    if (!isDragging || !draggedBlockRef.current || !dropTargetRef.current) {
      return;
    }

    const { element: targetBlock, position } = dropTargetRef.current;

    // Move the block to new position
    if (position === 'before') {
      targetBlock.before(draggedBlockRef.current);
    } else {
      targetBlock.after(draggedBlockRef.current);
    }

    // Clean up
    endDrag();

    // Notify content change
    onContentChange?.();
  }, [isDragging, onContentChange]);

  /**
   * End drag operation and clean up
   * Requirement 9.5: Restore original state when drag is cancelled
   */
  const endDrag = useCallback(() => {
    if (draggedBlockRef.current) {
      draggedBlockRef.current.classList.remove('dragging-block');
    }

    setIsDragging(false);
    setDropIndicator(null);
    draggedBlockRef.current = null;
    dropTargetRef.current = null;
  }, []);

  /**
   * Handle drag end (cancelled or completed)
   * Requirement 9.5: Restore original state when drag is cancelled
   */
  const handleDragEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);


  // Set up event listeners on the editor
  useEffect(() => {
    if (!enabled) return;

    const element = editorRef.current;
    if (!element) return;

    // Mouse events for showing drag handle
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseenter', handleMouseEnter);

    // Drag events for block reordering
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('drop', handleDrop);
    element.addEventListener('dragend', handleDragEnd);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('drop', handleDrop);
      element.removeEventListener('dragend', handleDragEnd);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [enabled, editorRef, handleMouseMove, handleMouseLeave, handleMouseEnter, handleDragOver, handleDrop, handleDragEnd]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (draggedBlockRef.current) {
        draggedBlockRef.current.classList.remove('dragging-block');
      }
    };
  }, []);

  /**
   * Get the currently hovered block (for external use)
   */
  const getHoveredBlock = useCallback((): HTMLElement | null => {
    return hoveredBlockRef.current;
  }, []);

  /**
   * Trigger drag start from external component (DragHandle)
   */
  const onDragStart = useCallback((e: React.DragEvent) => {
    const block = hoveredBlockRef.current;
    if (block) {
      startDrag(block, e);
    }
  }, [startDrag]);

  return {
    showHandle,
    handlePosition,
    isDragging,
    dropIndicator,
    // Additional utilities for external components
    getHoveredBlock,
    onDragStart,
  };
}

export default useDragAndDrop;
