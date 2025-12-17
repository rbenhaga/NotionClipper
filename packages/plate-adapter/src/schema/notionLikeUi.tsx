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
 */
export interface SlashMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onSelect: (type: string) => void;
  onClose: () => void;
  filter?: string;
  enableAi?: boolean;
}

export function SlashMenu({ 
  isOpen, 
  position, 
  onSelect, 
  onClose,
  filter = '',
  enableAi = false,
}: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

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
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex].type);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  if (!isOpen || filteredItems.length === 0) {
    return null;
  }

  return (
    <div
      className="plate-slash-menu"
      style={{
        top: position.top,
        left: position.left,
      }}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Block type menu"
    >
      {filteredItems.map((item, index) => (
        <div
          key={item.key}
          className={`plate-slash-menu-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(item.type)}
          onMouseEnter={() => setSelectedIndex(index)}
          role="option"
          aria-selected={index === selectedIndex}
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
        </div>
      ))}
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
