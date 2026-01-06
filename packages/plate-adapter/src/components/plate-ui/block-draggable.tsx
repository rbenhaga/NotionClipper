/**
 * BlockDraggable - Drag handle wrapper for blocks
 * 
 * This component wraps each block and provides:
 * - Drag handle (⋮⋮) on hover
 * - Add button (+) on hover
 * - Drop line indicator
 * 
 * IMPORTANT: This is rendered via DndPlugin's render.aboveNodes,
 * NOT as a wrapper inside the element component.
 */

import React, { useState } from 'react';
import { useEditorRef } from 'platejs/react';
import { useDraggable, useDropLine } from '@platejs/dnd';
import type { TElement } from 'platejs';

interface BlockDraggableProps {
  element: TElement;
  children: React.ReactNode;
}

/**
 * BlockDraggable - Wraps a block with drag handles
 */
export function BlockDraggable({ element, children }: BlockDraggableProps) {
  const editor = useEditorRef();
  const [isHovered, setIsHovered] = useState(false);
  
  // Get element ID for DnD
  const elementId = (element as { id?: string }).id;
  
  // DnD hooks - only use if element has an ID
  const { isDragging, previewRef, handleRef } = useDraggable({
    element,
  });
  
  const { dropLine } = useDropLine({
    id: elementId || '',
  });

  // Handle add block
  const handleAddBlock = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editorAny = editor as any;
      const path = editorAny.api?.findPath?.(element);
      
      if (path) {
        // Insert new paragraph after this block
        const newBlock = {
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'p',
          children: [{ text: '' }],
        };
        
        editorAny.tf?.insertNodes?.(newBlock, { at: [path[0] + 1] });
        
        // Focus the new block
        setTimeout(() => {
          editorAny.tf?.select?.({ path: [path[0] + 1, 0], offset: 0 });
        }, 10);
      }
    } catch (err) {
      console.warn('[BlockDraggable] Failed to add block:', err);
    }
  };

  const showDropLine = dropLine === 'top' || dropLine === 'bottom';

  return (
    <div
      ref={previewRef as React.Ref<HTMLDivElement>}
      className={`nc-block-draggable ${isDragging ? 'is-dragging' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Gutter with + and drag handle */}
      <div
        className="nc-gutter"
        contentEditable={false}
        style={{
          position: 'absolute',
          left: '-44px',
          top: '2px',
          display: 'flex',
          gap: '2px',
          alignItems: 'center',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 120ms ease',
          userSelect: 'none',
        }}
      >
        {/* Add button (+) */}
        <button
          type="button"
          onClick={handleAddBlock}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Add block"
          tabIndex={-1}
          style={{
            width: '18px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'rgba(55, 53, 47, 0.4)',
            fontSize: '18px',
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          +
        </button>
        
        {/* Drag handle (⋮⋮) */}
        <div
          ref={handleRef as React.Ref<HTMLDivElement>}
          data-drag-handle
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Drag block"
          style={{
            width: '14px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'grab',
            color: 'rgba(55, 53, 47, 0.4)',
          }}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="7" r="1.5" />
            <circle cx="8" cy="7" r="1.5" />
            <circle cx="2" cy="12" r="1.5" />
            <circle cx="8" cy="12" r="1.5" />
          </svg>
        </div>
      </div>

      {/* Drop line indicator */}
      {showDropLine && (
        <div
          className={`nc-drop-line nc-drop-line-${dropLine}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'rgb(35, 131, 226)',
            pointerEvents: 'none',
            zIndex: 20,
            ...(dropLine === 'top' ? { top: '-1px' } : { bottom: '-1px' }),
          }}
        />
      )}

      {/* Block content */}
      {children}
    </div>
  );
}

export default BlockDraggable;
