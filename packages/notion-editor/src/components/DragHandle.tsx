/**
 * DragHandle - Block drag handle component
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * - 14.1: Display a drag icon (⋮⋮)
 * - 14.2: Appear at specified coordinates
 * - 14.3: Call onDragStart with block element when drag starts
 * - 14.4: Show block action menu when clicked
 */

import React, { useCallback, useState } from 'react';
import type { DragHandleProps } from '../types';

/**
 * DragHandle - Draggable handle for block reordering
 * 
 * Displays ⋮⋮ icon positioned 20px to the left of the block.
 * Triggers drag start when dragged.
 */
export function DragHandle({ position, onDragStart }: DragHandleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e);
  }, [onDragStart]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className="notion-drag-handle"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      aria-label="Drag to reorder block"
      tabIndex={0}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: '24px',
        height: '24px',
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isHovered ? '#37352f' : '#9b9a97',
        fontSize: '14px',
        userSelect: 'none',
        borderRadius: '3px',
        backgroundColor: isHovered ? 'rgba(55, 53, 47, 0.08)' : 'transparent',
        transition: 'color 0.15s ease, background-color 0.15s ease',
        opacity: isDragging ? 0.5 : 1,
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      ⋮⋮
    </div>
  );
}

export default DragHandle;
