/**
 * SlashMenu - Notion-style slash command menu
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 * - 13.1: Display a searchable list of commands
 * - 13.2: Show only matching commands when filter is provided
 * - 13.3: Call onSelect with command when selected
 * - 13.4: Highlight selected item with keyboard navigation
 * - 13.5: Call onClose when Escape is pressed
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SlashMenuProps, SlashCommand } from '../types';

// Notion-style icons
const TextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
);

const H1Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 5v14h2v-6h4v6h2V5h-2v6H6V5H4zm14 0v14h2V5h-2zm-2 0h-2v6h-2v2h2v6h2V5z" />
  </svg>
);

const H2Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 5v14h2v-6h4v6h2V5h-2v6H6V5H4zm10 0v2h4v3h-4v2h4v5h-4v2h6V5h-6z" />
  </svg>
);

const H3Icon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 5v14h2v-6h4v6h2V5h-2v6H6V5H4zm10 0v2h4v2h-3v2h3v2h-4v2h4v2h-4v2h6V5h-6z" />
  </svg>
);

const BulletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="6" cy="8" r="2" />
    <circle cx="6" cy="16" r="2" />
    <rect x="10" y="7" width="10" height="2" rx="1" />
    <rect x="10" y="15" width="10" height="2" rx="1" />
  </svg>
);

const NumberedIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <text x="4" y="10" fontSize="8" fontWeight="600">1.</text>
    <text x="4" y="18" fontSize="8" fontWeight="600">2.</text>
    <rect x="12" y="7" width="8" height="2" rx="1" />
    <rect x="12" y="15" width="8" height="2" rx="1" />
  </svg>
);

const TodoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="6" width="12" height="12" rx="2" />
    <path d="M7 12l2 2 4-4" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
  </svg>
);

const DividerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="11" width="16" height="2" rx="1" />
  </svg>
);

const CodeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
  </svg>
);

// Default slash commands with descriptions
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { name: 'Text', keywords: ['text', 'paragraph', 'plain'], action: () => {}, icon: 'text' },
  { name: 'Heading 1', keywords: ['h1', 'heading', 'title', 'big'], action: () => {}, icon: 'h1' },
  { name: 'Heading 2', keywords: ['h2', 'heading', 'subtitle'], action: () => {}, icon: 'h2' },
  { name: 'Heading 3', keywords: ['h3', 'heading', 'small'], action: () => {}, icon: 'h3' },
  { name: 'Bullet List', keywords: ['ul', 'list', 'bullet', 'unordered'], action: () => {}, icon: 'bullet' },
  { name: 'Numbered List', keywords: ['ol', 'list', 'numbered', 'ordered'], action: () => {}, icon: 'numbered' },
  { name: 'To-do List', keywords: ['todo', 'checkbox', 'task', 'check'], action: () => {}, icon: 'todo' },
  { name: 'Quote', keywords: ['quote', 'blockquote', 'citation'], action: () => {}, icon: 'quote' },
  { name: 'Divider', keywords: ['divider', 'separator', 'hr', 'line'], action: () => {}, icon: 'divider' },
  { name: 'Code', keywords: ['code', 'snippet', 'programming'], action: () => {}, icon: 'code' },
];

// Command descriptions
const COMMAND_DESCRIPTIONS: Record<string, string> = {
  Text: 'Just start writing with plain text.',
  'Heading 1': 'Big section heading.',
  'Heading 2': 'Medium section heading.',
  'Heading 3': 'Small section heading.',
  'Bullet List': 'Create a simple bulleted list.',
  'Numbered List': 'Create a list with numbering.',
  'To-do List': 'Track tasks with a to-do list.',
  Quote: 'Capture a quote.',
  Divider: 'Visually divide blocks.',
  Code: 'Capture a code snippet.',
};

// Icon mapping
const ICON_MAP: Record<string, React.FC> = {
  text: TextIcon,
  h1: H1Icon,
  h2: H2Icon,
  h3: H3Icon,
  bullet: BulletIcon,
  numbered: NumberedIcon,
  todo: TodoIcon,
  quote: QuoteIcon,
  divider: DividerIcon,
  code: CodeIcon,
};

interface SlashMenuExtendedProps extends SlashMenuProps {
  commands?: SlashCommand[];
  selectedIndex?: number;
}

export function SlashMenu({
  position,
  filter,
  onSelect,
  onClose,
  commands = DEFAULT_SLASH_COMMANDS,
  selectedIndex: externalSelectedIndex,
}: SlashMenuExtendedProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);

  const selectedIndex = externalSelectedIndex ?? internalSelectedIndex;

  // Filter commands
  const filteredCommands = commands.filter((cmd) => {
    if (!filter) return true;
    const searchLower = filter.toLowerCase();
    return (
      cmd.name.toLowerCase().includes(searchLower) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    if (externalSelectedIndex === undefined) {
      setInternalSelectedIndex(0);
    }
  }, [filter, externalSelectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          if (externalSelectedIndex === undefined) {
            setInternalSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredCommands.length - 1
            );
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          if (externalSelectedIndex === undefined) {
            setInternalSelectedIndex((prev) =>
              prev < filteredCommands.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredCommands, selectedIndex, onSelect, onClose, externalSelectedIndex]);

  useEffect(() => {
    const selectedElement = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleCommandClick = useCallback(
    (command: SlashCommand) => {
      onSelect(command);
    },
    [onSelect]
  );

  const renderIcon = (iconName: string | undefined) => {
    if (!iconName) return null;
    const IconComponent = ICON_MAP[iconName];
    return IconComponent ? <IconComponent /> : null;
  };

  if (filteredCommands.length === 0) {
    return (
      <div
        data-slash-menu
        className="notion-slash-menu"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: '320px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px',
          padding: '6px 0',
          zIndex: 1000,
        }}
      >
        <div style={{ padding: '8px 14px', color: 'rgba(55, 53, 47, 0.5)', fontSize: '14px' }}>
          No results
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      data-slash-menu
      role="listbox"
      aria-label="Slash commands"
      className="notion-slash-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '320px',
        maxHeight: '360px',
        overflowY: 'auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px',
        padding: '4px 0',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 14px 8px',
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(55, 53, 47, 0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Basic blocks
      </div>

      {/* Commands */}
      {filteredCommands.map((cmd, index) => (
        <div
          key={cmd.name}
          data-index={index}
          role="option"
          aria-selected={index === selectedIndex}
          onClick={() => handleCommandClick(cmd)}
          style={{
            padding: '6px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: index === selectedIndex ? 'rgba(55, 53, 47, 0.08)' : 'transparent',
            borderRadius: '4px',
            margin: '0 4px',
            transition: 'background-color 0.08s ease',
          }}
          onMouseEnter={() => {
            if (externalSelectedIndex === undefined) {
              setInternalSelectedIndex(index);
            }
          }}
        >
          {/* Icon container */}
          <div
            style={{
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              border: '1px solid rgba(55, 53, 47, 0.12)',
              borderRadius: '4px',
              color: 'rgb(55, 53, 47)',
              flexShrink: 0,
            }}
          >
            {renderIcon(cmd.icon)}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgb(55, 53, 47)',
                lineHeight: '20px',
              }}
            >
              {cmd.name}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(55, 53, 47, 0.5)',
                lineHeight: '16px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {COMMAND_DESCRIPTIONS[cmd.name] || 'Insert a block'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SlashMenu;
