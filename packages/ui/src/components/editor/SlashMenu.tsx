/**
 * SlashMenu - Menu de commandes slash (/) style Notion
 * 
 * S'affiche lorsque l'utilisateur tape '/' et permet d'insérer
 * différents types de blocs, d'exécuter des actions ou de changer les couleurs.
 * 
 * Requirements: 18.1-18.6
 * - 18.1: Display searchable menu of block types when user types '/'
 * - 18.2: Filter menu to matching options based on typed text
 * - 18.3: Insert corresponding block type on selection
 * - 18.4: Execute actions (delete, duplicate) on current block
 * - 18.5: Change color of current block
 * - 18.6: Close menu on Escape key
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  ChevronRight, Quote, Minus, AlertCircle,
  Trash2, Copy, Move,
  Palette
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type SlashCommandType = 'block' | 'action' | 'color';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: SlashCommandType;
  keywords: string[];
  color?: string;
}

export interface SlashMenuProps {
  show: boolean;
  position: { x: number; y: number };
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

// ============================================================================
// Command Definitions
// ============================================================================

/**
 * Block type commands (Requirements: 18.3)
 * Text, Heading 1/2/3, Bullet list, Numbered list, Todo, Toggle, Quote, Divider, Callout
 */
export const BLOCK_COMMANDS: SlashCommand[] = [
  {
    id: 'text',
    name: 'Text',
    description: 'Just start writing with plain text.',
    icon: <Type size={18} />,
    type: 'block',
    keywords: ['text', 'paragraph', 'plain', 'texte', 'paragraphe'],
  },
  {
    id: 'heading_1',
    name: 'Heading 1',
    description: 'Big section heading.',
    icon: <Heading1 size={18} />,
    type: 'block',
    keywords: ['heading', 'h1', 'title', 'titre', 'heading1', 'header'],
  },
  {
    id: 'heading_2',
    name: 'Heading 2',
    description: 'Medium section heading.',
    icon: <Heading2 size={18} />,
    type: 'block',
    keywords: ['heading', 'h2', 'subtitle', 'sous-titre', 'heading2', 'header'],
  },
  {
    id: 'heading_3',
    name: 'Heading 3',
    description: 'Small section heading.',
    icon: <Heading3 size={18} />,
    type: 'block',
    keywords: ['heading', 'h3', 'heading3', 'header', 'small'],
  },
  {
    id: 'bulleted_list',
    name: 'Bulleted list',
    description: 'Create a simple bulleted list.',
    icon: <List size={18} />,
    type: 'block',
    keywords: ['bullet', 'list', 'unordered', 'ul', 'liste', 'puces'],
  },
  {
    id: 'numbered_list',
    name: 'Numbered list',
    description: 'Create a list with numbering.',
    icon: <ListOrdered size={18} />,
    type: 'block',
    keywords: ['number', 'list', 'ordered', 'ol', 'numérotée', 'numbered'],
  },
  {
    id: 'todo',
    name: 'To-do list',
    description: 'Track tasks with a to-do list.',
    icon: <CheckSquare size={18} />,
    type: 'block',
    keywords: ['todo', 'task', 'checkbox', 'check', 'tâche', 'todo list'],
  },
  {
    id: 'toggle',
    name: 'Toggle list',
    description: 'Toggles can hide and show content.',
    icon: <ChevronRight size={18} />,
    type: 'block',
    keywords: ['toggle', 'collapse', 'expand', 'dropdown', 'déroulant'],
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Capture a quote.',
    icon: <Quote size={18} />,
    type: 'block',
    keywords: ['quote', 'blockquote', 'citation'],
  },
  {
    id: 'divider',
    name: 'Divider',
    description: 'Visually divide blocks.',
    icon: <Minus size={18} />,
    type: 'block',
    keywords: ['divider', 'separator', 'hr', 'line', 'séparateur'],
  },
  {
    id: 'callout',
    name: 'Callout',
    description: 'Make writing stand out.',
    icon: <AlertCircle size={18} />,
    type: 'block',
    keywords: ['callout', 'alert', 'note', 'warning', 'info', 'encadré'],
  },
];

/**
 * Action commands (Requirements: 18.4)
 * Delete, Duplicate, Move to
 */
export const ACTION_COMMANDS: SlashCommand[] = [
  {
    id: 'delete',
    name: 'Delete',
    description: 'Delete the current block.',
    icon: <Trash2 size={18} />,
    type: 'action',
    keywords: ['delete', 'remove', 'supprimer', 'effacer'],
  },
  {
    id: 'duplicate',
    name: 'Duplicate',
    description: 'Create a copy of the current block.',
    icon: <Copy size={18} />,
    type: 'action',
    keywords: ['duplicate', 'copy', 'clone', 'dupliquer', 'copier'],
  },
  {
    id: 'move_to',
    name: 'Move to',
    description: 'Move block to another location.',
    icon: <Move size={18} />,
    type: 'action',
    keywords: ['move', 'déplacer', 'relocate'],
  },
];

/**
 * Color commands (Requirements: 18.5)
 * Red, Blue, Green, Yellow, Orange, Purple, Gray
 */
export const COLOR_COMMANDS: SlashCommand[] = [
  {
    id: 'color_red',
    name: 'Red',
    description: 'Change text color to red.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['red', 'rouge', 'color', 'couleur'],
    color: '#e03e3e',
  },
  {
    id: 'color_blue',
    name: 'Blue',
    description: 'Change text color to blue.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['blue', 'bleu', 'color', 'couleur'],
    color: '#0b6bcb',
  },
  {
    id: 'color_green',
    name: 'Green',
    description: 'Change text color to green.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['green', 'vert', 'color', 'couleur'],
    color: '#0f7b6c',
  },
  {
    id: 'color_yellow',
    name: 'Yellow',
    description: 'Change text color to yellow.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['yellow', 'jaune', 'color', 'couleur'],
    color: '#c29343',
  },
  {
    id: 'color_orange',
    name: 'Orange',
    description: 'Change text color to orange.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['orange', 'color', 'couleur'],
    color: '#d9730d',
  },
  {
    id: 'color_purple',
    name: 'Purple',
    description: 'Change text color to purple.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['purple', 'violet', 'color', 'couleur'],
    color: '#6940a5',
  },
  {
    id: 'color_gray',
    name: 'Gray',
    description: 'Change text color to gray.',
    icon: <Palette size={18} />,
    type: 'color',
    keywords: ['gray', 'grey', 'gris', 'color', 'couleur'],
    color: '#787774',
  },
];

/** All commands combined */
export const ALL_COMMANDS: SlashCommand[] = [
  ...BLOCK_COMMANDS,
  ...ACTION_COMMANDS,
  ...COLOR_COMMANDS,
];

// ============================================================================
// Filter Function (Property 39: Slash menu filter)
// ============================================================================

/**
 * Filter commands by search string (case-insensitive)
 * Requirements: 18.2 - Filter by name/keywords on input
 * 
 * @param commands - Array of commands to filter
 * @param filter - Search string to match against name and keywords
 * @returns Filtered array of commands
 */
export function filterCommands(commands: SlashCommand[], filter: string): SlashCommand[] {
  if (!filter || filter.trim() === '') {
    return commands;
  }

  const normalizedFilter = filter.toLowerCase().trim();

  return commands.filter((command) => {
    // Check if name contains the filter
    if (command.name.toLowerCase().includes(normalizedFilter)) {
      return true;
    }

    // Check if any keyword contains the filter
    return command.keywords.some((keyword) =>
      keyword.toLowerCase().includes(normalizedFilter)
    );
  });
}

// ============================================================================
// SlashMenu Component
// ============================================================================

export function SlashMenu({
  show,
  position,
  filter,
  onSelect,
  onClose,
}: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Filter commands based on input (Requirements: 18.2)
  const filteredCommands = useMemo(() => {
    return filterCommands(ALL_COMMANDS, filter);
  }, [filter]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Calculate menu position to stay within viewport
  useEffect(() => {
    if (!show) return;

    const menuWidth = 320;
    const menuHeight = Math.min(filteredCommands.length * 56 + 16, 400);

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (x < 10) {
      x = 10;
    }

    // Adjust vertical position - prefer showing below cursor
    if (y + menuHeight > window.innerHeight) {
      // Show above cursor if not enough space below
      y = Math.max(10, y - menuHeight - 20);
    }

    setMenuStyle({
      left: `${x}px`,
      top: `${y + 20}px`, // Offset below cursor
    });
  }, [show, position, filteredCommands.length]);

  // Handle keyboard navigation (Requirements: 18.1, 18.6)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!show) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          // Requirements: 18.6 - Close menu on Escape key
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredCommands.length - 1
            );
          } else {
            setSelectedIndex((prev) =>
              prev < filteredCommands.length - 1 ? prev + 1 : 0
            );
          }
          break;
      }
    },
    [show, filteredCommands, selectedIndex, onSelect, onClose]
  );

  // Add keyboard event listener
  useEffect(() => {
    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show, handleKeyDown]);

  // Handle click outside to close
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const selectedElement = menuRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!show) return null;

  // Group commands by type for display
  const blockCommands = filteredCommands.filter((c) => c.type === 'block');
  const actionCommands = filteredCommands.filter((c) => c.type === 'action');
  const colorCommands = filteredCommands.filter((c) => c.type === 'color');

  // Calculate global index for each command
  let globalIndex = 0;
  const getGlobalIndex = () => globalIndex++;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-[#2d2d2d] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-80"
      style={menuStyle}
      role="listbox"
      aria-label="Slash commands"
    >
      <div className="max-h-96 overflow-y-auto py-2">
        {filteredCommands.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            No results found
          </div>
        ) : (
          <>
            {/* Block commands section */}
            {blockCommands.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Basic blocks
                </div>
                {blockCommands.map((command) => {
                  const index = getGlobalIndex();
                  return (
                    <CommandItem
                      key={command.id}
                      command={command}
                      isSelected={selectedIndex === index}
                      dataIndex={index}
                      onSelect={() => onSelect(command)}
                      onHover={() => setSelectedIndex(index)}
                    />
                  );
                })}
              </div>
            )}

            {/* Action commands section */}
            {actionCommands.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
                  Actions
                </div>
                {actionCommands.map((command) => {
                  const index = getGlobalIndex();
                  return (
                    <CommandItem
                      key={command.id}
                      command={command}
                      isSelected={selectedIndex === index}
                      dataIndex={index}
                      onSelect={() => onSelect(command)}
                      onHover={() => setSelectedIndex(index)}
                    />
                  );
                })}
              </div>
            )}

            {/* Color commands section */}
            {colorCommands.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
                  Colors
                </div>
                {colorCommands.map((command) => {
                  const index = getGlobalIndex();
                  return (
                    <CommandItem
                      key={command.id}
                      command={command}
                      isSelected={selectedIndex === index}
                      dataIndex={index}
                      onSelect={() => onSelect(command)}
                      onHover={() => setSelectedIndex(index)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CommandItem Component
// ============================================================================

interface CommandItemProps {
  command: SlashCommand;
  isSelected: boolean;
  dataIndex: number;
  onSelect: () => void;
  onHover: () => void;
}

function CommandItem({
  command,
  isSelected,
  dataIndex,
  onSelect,
  onHover,
}: CommandItemProps) {
  return (
    <button
      data-index={dataIndex}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
        isSelected
          ? 'bg-gray-100 dark:bg-gray-700'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      role="option"
      aria-selected={isSelected}
    >
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
        style={command.color ? { color: command.color } : undefined}
      >
        {command.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {command.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {command.description}
        </div>
      </div>
    </button>
  );
}

export default SlashMenu;
