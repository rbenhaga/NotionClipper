/**
 * DragHandle Component - Block manipulation handle with action menu
 * 
 * Requirements:
 * - 22.1: Display drag handle (⋮⋮) in left margin on hover
 * - 22.2: Show visual guides during drag
 * - 22.3: Move block on drop
 * - 22.4: Display action menu on click (Turn into, Color, Duplicate, Delete, Move to, Comment)
 * - 22.5: Turn into action - transform block to selected type
 * - 22.6: Color action - change text or background color
 * - 22.7: Duplicate action - create exact copy
 * - 22.8: Delete action - remove block
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GripVertical, 
  Type, 
  Palette, 
  Copy, 
  Trash2, 
  MoveRight, 
  MessageSquare,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  ChevronRight,
  Quote,
  Minus,
  AlertCircle,
  X
} from 'lucide-react';

// Block types for "Turn into" action
export type BlockType = 
  | 'paragraph' 
  | 'heading_1' 
  | 'heading_2' 
  | 'heading_3'
  | 'bulleted_list' 
  | 'numbered_list' 
  | 'todo'
  | 'toggle' 
  | 'quote' 
  | 'divider' 
  | 'callout';

// Color options for "Color" action
export interface ColorOption {
  id: string;
  name: string;
  textColor?: string;
  backgroundColor?: string;
}

export const TEXT_COLORS: ColorOption[] = [
  { id: 'default', name: 'Default', textColor: 'inherit' },
  { id: 'gray', name: 'Gray', textColor: '#9b9a97' },
  { id: 'brown', name: 'Brown', textColor: '#64473a' },
  { id: 'orange', name: 'Orange', textColor: '#d9730d' },
  { id: 'yellow', name: 'Yellow', textColor: '#dfab01' },
  { id: 'green', name: 'Green', textColor: '#0f7b6c' },
  { id: 'blue', name: 'Blue', textColor: '#0b6e99' },
  { id: 'purple', name: 'Purple', textColor: '#6940a5' },
  { id: 'pink', name: 'Pink', textColor: '#ad1a72' },
  { id: 'red', name: 'Red', textColor: '#e03e3e' },
];

export const BACKGROUND_COLORS: ColorOption[] = [
  { id: 'default_bg', name: 'Default', backgroundColor: 'transparent' },
  { id: 'gray_bg', name: 'Gray', backgroundColor: 'rgba(241, 241, 239, 0.6)' },
  { id: 'brown_bg', name: 'Brown', backgroundColor: 'rgba(244, 238, 238, 0.8)' },
  { id: 'orange_bg', name: 'Orange', backgroundColor: 'rgba(251, 236, 221, 0.8)' },
  { id: 'yellow_bg', name: 'Yellow', backgroundColor: 'rgba(251, 243, 219, 0.8)' },
  { id: 'green_bg', name: 'Green', backgroundColor: 'rgba(237, 243, 236, 0.8)' },
  { id: 'blue_bg', name: 'Blue', backgroundColor: 'rgba(231, 243, 248, 0.8)' },
  { id: 'purple_bg', name: 'Purple', backgroundColor: 'rgba(244, 240, 247, 0.8)' },
  { id: 'pink_bg', name: 'Pink', backgroundColor: 'rgba(249, 238, 243, 0.8)' },
  { id: 'red_bg', name: 'Red', backgroundColor: 'rgba(253, 235, 236, 0.8)' },
];

// Block type options for "Turn into" submenu
export const BLOCK_TYPE_OPTIONS: { id: BlockType; name: string; icon: React.ReactNode }[] = [
  { id: 'paragraph', name: 'Text', icon: <Type size={16} /> },
  { id: 'heading_1', name: 'Heading 1', icon: <Heading1 size={16} /> },
  { id: 'heading_2', name: 'Heading 2', icon: <Heading2 size={16} /> },
  { id: 'heading_3', name: 'Heading 3', icon: <Heading3 size={16} /> },
  { id: 'bulleted_list', name: 'Bulleted list', icon: <List size={16} /> },
  { id: 'numbered_list', name: 'Numbered list', icon: <ListOrdered size={16} /> },
  { id: 'todo', name: 'To-do list', icon: <CheckSquare size={16} /> },
  { id: 'toggle', name: 'Toggle list', icon: <ChevronRight size={16} /> },
  { id: 'quote', name: 'Quote', icon: <Quote size={16} /> },
  { id: 'divider', name: 'Divider', icon: <Minus size={16} /> },
  { id: 'callout', name: 'Callout', icon: <AlertCircle size={16} /> },
];

export interface DragHandleProps {
  blockElement: HTMLElement | null;
  onTurnInto: (blockType: BlockType) => void;
  onColorChange: (textColor?: string, backgroundColor?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveTo?: () => void;
  onComment?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({
  blockElement,
  onTurnInto,
  onColorChange,
  onDuplicate,
  onDelete,
  onMoveTo,
  onComment,
  onDragStart,
  onDragEnd,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'turnInto' | 'color' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          handleRef.current && !handleRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setActiveSubmenu(null);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
    setActiveSubmenu(null);
  }, [showMenu]);

  const handleTurnInto = useCallback((blockType: BlockType) => {
    onTurnInto(blockType);
    setShowMenu(false);
    setActiveSubmenu(null);
  }, [onTurnInto]);

  const handleColorSelect = useCallback((textColor?: string, backgroundColor?: string) => {
    onColorChange(textColor, backgroundColor);
    setShowMenu(false);
    setActiveSubmenu(null);
  }, [onColorChange]);

  const handleDuplicate = useCallback(() => {
    onDuplicate();
    setShowMenu(false);
  }, [onDuplicate]);

  const handleDelete = useCallback(() => {
    onDelete();
    setShowMenu(false);
  }, [onDelete]);

  const handleMoveTo = useCallback(() => {
    onMoveTo?.();
    setShowMenu(false);
  }, [onMoveTo]);

  const handleComment = useCallback(() => {
    onComment?.();
    setShowMenu(false);
  }, [onComment]);

  return (
    <div className="drag-handle-container" ref={handleRef}>
      {/* Drag Handle Button - Requirements: 22.1 */}
      <div
        className="drag-handle"
        draggable
        onClick={handleClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title="Drag to move • Click for options"
      >
        <GripVertical size={14} />
      </div>

      {/* Action Menu - Requirements: 22.4 */}
      {showMenu && (
        <div className="drag-handle-menu" ref={menuRef}>
          {/* Turn into - Requirements: 22.5 */}
          <div 
            className="menu-item has-submenu"
            onMouseEnter={() => setActiveSubmenu('turnInto')}
          >
            <Type size={14} />
            <span>Turn into</span>
            <ChevronRight size={12} className="submenu-arrow" />
            
            {activeSubmenu === 'turnInto' && (
              <div className="submenu turn-into-submenu">
                {BLOCK_TYPE_OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className="submenu-item"
                    onClick={() => handleTurnInto(option.id)}
                  >
                    {option.icon}
                    <span>{option.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color - Requirements: 22.6 */}
          <div 
            className="menu-item has-submenu"
            onMouseEnter={() => setActiveSubmenu('color')}
          >
            <Palette size={14} />
            <span>Color</span>
            <ChevronRight size={12} className="submenu-arrow" />
            
            {activeSubmenu === 'color' && (
              <div className="submenu color-submenu">
                <div className="color-section">
                  <div className="color-section-title">Text color</div>
                  <div className="color-grid">
                    {TEXT_COLORS.map((color) => (
                      <div
                        key={color.id}
                        className="color-option"
                        style={{ color: color.textColor }}
                        onClick={() => handleColorSelect(color.textColor, undefined)}
                        title={color.name}
                      >
                        A
                      </div>
                    ))}
                  </div>
                </div>
                <div className="color-section">
                  <div className="color-section-title">Background</div>
                  <div className="color-grid">
                    {BACKGROUND_COLORS.map((color) => (
                      <div
                        key={color.id}
                        className="color-option bg-option"
                        style={{ backgroundColor: color.backgroundColor }}
                        onClick={() => handleColorSelect(undefined, color.backgroundColor)}
                        title={color.name}
                      >
                        <span style={{ opacity: color.id === 'default_bg' ? 0.5 : 1 }}>A</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="menu-divider" />

          {/* Duplicate - Requirements: 22.7 */}
          <div className="menu-item" onClick={handleDuplicate}>
            <Copy size={14} />
            <span>Duplicate</span>
          </div>

          {/* Delete - Requirements: 22.8 */}
          <div className="menu-item delete-item" onClick={handleDelete}>
            <Trash2 size={14} />
            <span>Delete</span>
          </div>

          {onMoveTo && (
            <>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleMoveTo}>
                <MoveRight size={14} />
                <span>Move to</span>
              </div>
            </>
          )}

          {onComment && (
            <div className="menu-item" onClick={handleComment}>
              <MessageSquare size={14} />
              <span>Comment</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Styles for DragHandle component
export const dragHandleStyles = `
  /* Drag Handle Container */
  .drag-handle-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  /* Drag Handle Button - Requirements: 22.1 */
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: grab;
    color: #9b9a97;
    transition: all 0.15s ease;
    user-select: none;
  }

  .drag-handle:hover {
    background: rgba(55, 53, 47, 0.08);
    color: #37352f;
  }

  .dark .drag-handle:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #e3e3e3;
  }

  .drag-handle:active {
    cursor: grabbing;
    background: rgba(55, 53, 47, 0.16);
  }

  .dark .drag-handle:active {
    background: rgba(255, 255, 255, 0.16);
  }

  /* Action Menu - Requirements: 22.4 */
  .drag-handle-menu {
    position: absolute;
    top: 0;
    left: 28px;
    min-width: 200px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    padding: 6px 0;
    z-index: 1000;
    animation: menuFadeIn 0.15s ease;
  }

  .dark .drag-handle-menu {
    background: #2f2f2f;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  @keyframes menuFadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    color: #37352f;
    position: relative;
    transition: background 0.1s ease;
  }

  .dark .menu-item {
    color: #e3e3e3;
  }

  .menu-item:hover {
    background: rgba(55, 53, 47, 0.08);
  }

  .dark .menu-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .menu-item.delete-item:hover {
    background: rgba(235, 87, 87, 0.1);
    color: #eb5757;
  }

  .menu-item.has-submenu {
    padding-right: 28px;
  }

  .submenu-arrow {
    position: absolute;
    right: 10px;
    color: #9b9a97;
  }

  .menu-divider {
    height: 1px;
    background: rgba(55, 53, 47, 0.09);
    margin: 6px 0;
  }

  .dark .menu-divider {
    background: rgba(255, 255, 255, 0.09);
  }

  /* Submenus */
  .submenu {
    position: absolute;
    left: 100%;
    top: -6px;
    min-width: 180px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
    padding: 6px 0;
    z-index: 1001;
    animation: submenuFadeIn 0.1s ease;
  }

  .dark .submenu {
    background: #2f2f2f;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  @keyframes submenuFadeIn {
    from {
      opacity: 0;
      transform: translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .submenu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    color: #37352f;
    transition: background 0.1s ease;
  }

  .dark .submenu-item {
    color: #e3e3e3;
  }

  .submenu-item:hover {
    background: rgba(55, 53, 47, 0.08);
  }

  .dark .submenu-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  /* Color Submenu */
  .color-submenu {
    min-width: 220px;
    padding: 8px;
  }

  .color-section {
    margin-bottom: 12px;
  }

  .color-section:last-child {
    margin-bottom: 0;
  }

  .color-section-title {
    font-size: 11px;
    font-weight: 500;
    color: #9b9a97;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    padding: 0 4px;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }

  .color-option {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }

  .color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .color-option.bg-option {
    border: 1px solid rgba(55, 53, 47, 0.1);
    color: #37352f;
  }

  .dark .color-option.bg-option {
    border-color: rgba(255, 255, 255, 0.1);
    color: #e3e3e3;
  }
`;

export default DragHandle;
