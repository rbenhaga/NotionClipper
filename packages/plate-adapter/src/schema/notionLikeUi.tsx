/**
 * Notion-like UI Components for Plate
 * 
 * Custom UI components for Notion-like editing experience:
 * - BlockAddButton: + button on hover
 * - BlockDragHandle: ⋮⋮ drag handle on hover
 * - SlashMenu: / command menu
 */

import React, { useState, useCallback } from 'react';
import { SLASH_MENU_ITEMS } from './platePlugins';

/**
 * Block Add Button (+)
 * Appears on hover to the left of blocks
 */
export interface BlockAddButtonProps {
  onClick: () => void;
  className?: string;
}

export function BlockAddButton({ onClick, className = '' }: BlockAddButtonProps) {
  return (
    <button
      className={`block-add-button ${className}`}
      onClick={onClick}
      title="Click to add a block below"
      aria-label="Add block"
    >
      +
    </button>
  );
}

/**
 * Block Drag Handle (⋮⋮)
 * Appears on hover for drag-and-drop reordering
 */
export interface BlockDragHandleProps {
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
}

export function BlockDragHandle({ 
  onDragStart, 
  onDragEnd, 
  className = '' 
}: BlockDragHandleProps) {
  return (
    <div
      className={`block-drag-handle ${className}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title="Drag to move"
      aria-label="Drag handle"
    >
      ⋮⋮
    </div>
  );
}

/**
 * Slash Menu
 * Opens when typing / to insert blocks
 * 
 * Keyboard navigation is handled by parent (ClipperPlateEditor)
 * via selectedIndex prop and onSelect callback.
 */
export interface SlashMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onSelect: (type: string) => void;
  onClose: () => void;
  filter?: string;
  enableAi?: boolean;
  /** Controlled selected index from parent */
  selectedIndex?: number;
  /** Ref for custom event handling */
  menuRef?: React.RefObject<HTMLDivElement>;
}

export function SlashMenu({ 
  isOpen, 
  position, 
  onSelect, 
  onClose,
  filter = '',
  enableAi = false,
  selectedIndex: controlledIndex,
  menuRef,
}: SlashMenuProps) {
  // Use controlled index if provided, otherwise internal state
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;
  const containerRef = menuRef || React.useRef<HTMLDivElement>(null);

  // Filter items based on search
  const filteredItems = SLASH_MENU_ITEMS.filter(item => {
    // Filter out AI items if AI is disabled
    if (!enableAi && item.key.startsWith('ai')) {
      return false;
    }
    
    // Filter by search term
    if (filter) {
      const searchLower = filter.toLowerCase();
      return (
        item.label.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.key.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Clamp selected index to valid range
  const clampedIndex = Math.min(Math.max(0, selectedIndex), filteredItems.length - 1);

  // Listen for custom slash-select event from parent
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const handleSlashSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ index: number }>;
      const idx = customEvent.detail?.index ?? clampedIndex;
      const item = filteredItems[Math.min(idx, filteredItems.length - 1)];
      if (item) {
        onSelect(item.type);
      }
    };

    container.addEventListener('slash-select', handleSlashSelect);
    return () => container.removeEventListener('slash-select', handleSlashSelect);
  }, [isOpen, filteredItems, clampedIndex, onSelect, containerRef]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;
    
    const selectedEl = container.querySelector('.plate-slash-menu-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [clampedIndex, isOpen, containerRef]);

  if (!isOpen || filteredItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="plate-slash-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      role="listbox"
      aria-label="Block type menu"
    >
      {/* Search indicator */}
      {filter && (
        <div className="plate-slash-menu-filter">
          <span className="plate-slash-menu-filter-icon">/</span>
          <span className="plate-slash-menu-filter-text">{filter}</span>
        </div>
      )}
      
      {/* Menu items */}
      {filteredItems.map((item, index) => (
        <div
          key={item.key}
          className={`plate-slash-menu-item ${index === clampedIndex ? 'selected' : ''}`}
          onMouseDown={(e) => {
            // ✅ Use onMouseDown + preventDefault to prevent selection moving before delete
            e.preventDefault();
            onSelect(item.type);
          }}
          onMouseEnter={() => setInternalIndex(index)}
          role="option"
          aria-selected={index === clampedIndex}
        >
          <div className="plate-slash-menu-item-icon">
            {item.icon}
          </div>
          <div className="plate-slash-menu-item-content">
            <div className="plate-slash-menu-item-label">
              {item.label}
            </div>
            <div className="plate-slash-menu-item-description">
              {item.description}
            </div>
          </div>
          <div className="plate-slash-menu-item-shortcut">
            /{item.key.slice(0, 3)}
          </div>
        </div>
      ))}
      
      {/* Keyboard hint */}
      <div className="plate-slash-menu-hint">
        <span>↑↓</span> navigate
        <span>↵</span> select
        <span>esc</span> close
      </div>
    </div>
  );
}

/**
 * Block Wrapper
 * Wraps each block with hover affordances
 */
export interface BlockWrapperProps {
  children: React.ReactNode;
  blockId: string;
  onAddBlock: (afterId: string) => void;
  onDragStart?: (blockId: string, e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function BlockWrapper({
  children,
  blockId,
  onAddBlock,
  onDragStart,
  onDragEnd,
}: BlockWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="block-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <BlockAddButton onClick={() => onAddBlock(blockId)} />
          <BlockDragHandle
            onDragStart={(e) => onDragStart?.(blockId, e)}
            onDragEnd={onDragEnd}
          />
        </>
      )}
      {children}
    </div>
  );
}

export default {
  BlockAddButton,
  BlockDragHandle,
  SlashMenu,
  BlockWrapper,
};
