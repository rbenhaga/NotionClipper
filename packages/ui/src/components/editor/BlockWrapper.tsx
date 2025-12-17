/**
 * BlockWrapper Component - Wraps editor blocks with drag handle and drop indicators
 * 
 * Requirements:
 * - 22.1: Display drag handle (⋮⋮) in left margin on hover
 * - 22.2: Show visual guides during drag
 * - 22.3: Move block on drop
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { DragHandle, BlockType, dragHandleStyles } from './DragHandle';

export interface BlockWrapperProps {
  children: React.ReactNode;
  blockId: string;
  blockElement: HTMLElement | null;
  onTurnInto: (blockId: string, blockType: BlockType) => void;
  onColorChange: (blockId: string, textColor?: string, backgroundColor?: string) => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onMove: (fromId: string, toId: string, position: 'before' | 'after') => void;
  onMoveTo?: (blockId: string) => void;
  onComment?: (blockId: string) => void;
  isDragging?: boolean;
  dragOverPosition?: 'before' | 'after' | null;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  children,
  blockId,
  blockElement,
  onTurnInto,
  onColorChange,
  onDuplicate,
  onDelete,
  onMove,
  onMoveTo,
  onComment,
  isDragging = false,
  dragOverPosition = null,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle drag start - Requirements: 22.2
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    e.dataTransfer.setData('application/x-block-id', blockId);
    setIsBeingDragged(true);
    
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      if (wrapperRef.current) {
        wrapperRef.current.classList.add('dragging');
      }
    }, 0);
  }, [blockId]);

  // Handle drag end
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsBeingDragged(false);
    setDropPosition(null);
    if (wrapperRef.current) {
      wrapperRef.current.classList.remove('dragging');
    }
  }, []);

  // Handle drag over - Requirements: 22.2
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlockId = e.dataTransfer.getData('application/x-block-id') || 
                           e.dataTransfer.types.includes('application/x-block-id');
    
    if (!draggedBlockId || isBeingDragged) return;

    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDropPosition(position);
    
    e.dataTransfer.dropEffect = 'move';
  }, [isBeingDragged]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're actually leaving the wrapper
    const relatedTarget = e.relatedTarget as Node;
    if (wrapperRef.current && !wrapperRef.current.contains(relatedTarget)) {
      setDropPosition(null);
    }
  }, []);

  // Handle drop - Requirements: 22.3
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedBlockId = e.dataTransfer.getData('application/x-block-id') || 
                           e.dataTransfer.getData('text/plain');
    
    if (draggedBlockId && draggedBlockId !== blockId && dropPosition) {
      onMove(draggedBlockId, blockId, dropPosition);
    }
    
    setDropPosition(null);
  }, [blockId, dropPosition, onMove]);

  // Action handlers
  const handleTurnInto = useCallback((blockType: BlockType) => {
    onTurnInto(blockId, blockType);
  }, [blockId, onTurnInto]);

  const handleColorChange = useCallback((textColor?: string, backgroundColor?: string) => {
    onColorChange(blockId, textColor, backgroundColor);
  }, [blockId, onColorChange]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(blockId);
  }, [blockId, onDuplicate]);

  const handleDelete = useCallback(() => {
    onDelete(blockId);
  }, [blockId, onDelete]);

  const handleMoveTo = useCallback(() => {
    onMoveTo?.(blockId);
  }, [blockId, onMoveTo]);

  const handleComment = useCallback(() => {
    onComment?.(blockId);
  }, [blockId, onComment]);

  return (
    <div
      ref={wrapperRef}
      className={`block-wrapper ${isHovered ? 'hovered' : ''} ${isBeingDragged ? 'dragging' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-block-id={blockId}
    >
      {/* Drop indicator - before - Requirements: 22.2 */}
      {dropPosition === 'before' && (
        <div className="drop-indicator drop-indicator-before" />
      )}

      {/* Drag handle - Requirements: 22.1 */}
      <div className={`block-handle-area ${isHovered ? 'visible' : ''}`}>
        <DragHandle
          blockElement={blockElement}
          onTurnInto={handleTurnInto}
          onColorChange={handleColorChange}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onMoveTo={onMoveTo ? handleMoveTo : undefined}
          onComment={onComment ? handleComment : undefined}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Block content */}
      <div className="block-content">
        {children}
      </div>

      {/* Drop indicator - after - Requirements: 22.2 */}
      {dropPosition === 'after' && (
        <div className="drop-indicator drop-indicator-after" />
      )}
    </div>
  );
};

// Styles for BlockWrapper component
export const blockWrapperStyles = `
  /* Block Wrapper */
  .block-wrapper {
    position: relative;
    display: flex;
    align-items: flex-start;
    margin-left: -32px;
    padding-left: 32px;
    transition: opacity 0.2s ease;
  }

  .block-wrapper.dragging {
    opacity: 0.4;
  }

  /* Handle Area - Requirements: 22.1 */
  .block-handle-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 28px;
    height: 100%;
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .block-handle-area.visible {
    opacity: 1;
  }

  .block-wrapper:hover .block-handle-area {
    opacity: 1;
  }

  /* Block Content */
  .block-content {
    flex: 1;
    min-width: 0;
  }

  /* Drop Indicators - Requirements: 22.2 */
  .drop-indicator {
    position: absolute;
    left: 32px;
    right: 0;
    height: 3px;
    background: #2383e2;
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
    animation: dropIndicatorPulse 1s ease infinite;
  }

  .drop-indicator-before {
    top: -2px;
  }

  .drop-indicator-after {
    bottom: -2px;
  }

  @keyframes dropIndicatorPulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* Drop indicator with circle marker */
  .drop-indicator::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background: #2383e2;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .dark .drop-indicator::before {
    border-color: #2f2f2f;
  }
`;

// Combined styles export
export const allBlockStyles = `
  ${dragHandleStyles}
  ${blockWrapperStyles}
`;

export default BlockWrapper;
