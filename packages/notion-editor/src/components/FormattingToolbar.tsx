/**
 * FormattingToolbar - Notion-style text formatting toolbar
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * - 12.1: Display formatting buttons (bold, italic, code, etc.)
 * - 12.2: Call onAction with action type when button is clicked
 * - 12.3: Appear at specified coordinates
 * - 12.4: Call onClose when clicking outside
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FormattingToolbarProps, FormattingAction } from '../types';

interface ToolbarButton {
  action: FormattingAction;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

// Notion-style icons as SVG
const BoldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2.5h4.5a3 3 0 0 1 2.1 5.15A3.5 3.5 0 0 1 9 13.5H4V2.5zm2 4.5h2.5a1 1 0 1 0 0-2H6v2zm0 2v2.5h3a1.5 1.5 0 0 0 0-3H6z" />
  </svg>
);

const ItalicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 2.5h6v1.5H9.5l-2 8H10V13.5H4V12h2.5l2-8H6V2.5z" />
  </svg>
);

const UnderlineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2.5v5.5a4 4 0 0 0 8 0V2.5h-1.5v5.5a2.5 2.5 0 0 1-5 0V2.5H4zM3 13.5h10V12H3v1.5z" />
  </svg>
);

const StrikethroughIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 7.5h10v1H3v-1zM8 2.5c-2.2 0-3.5 1.1-3.5 2.5 0 .8.4 1.4 1 1.8h1.7c-.5-.3-.7-.6-.7-1 0-.6.6-1.1 1.5-1.1s1.5.5 1.5 1.1h2c0-1.4-1.3-2.5-3.5-2.5zm0 11c2.2 0 3.5-1.1 3.5-2.5 0-.8-.4-1.4-1-1.8H8.8c.5.3.7.6.7 1 0 .6-.6 1.1-1.5 1.1s-1.5-.5-1.5-1.1h-2c0 1.4 1.3 2.5 3.5 2.5z" />
  </svg>
);

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.5 4L2 8l3.5 4 1-1L4 8l2.5-3-1-1zm5 0l-1 1L12 8l-2.5 3 1 1L14 8l-3.5-4z" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.5 9.5a1 1 0 0 1 0-1.4l3-3a2.5 2.5 0 0 1 3.5 3.5l-1 1-.7-.7 1-1a1.5 1.5 0 0 0-2.1-2.1l-3 3a.5.5 0 0 0 0 .7l.7.7-.7.7-.7-.7zm3-3a1 1 0 0 1 0 1.4l-3 3a2.5 2.5 0 0 1-3.5-3.5l1-1 .7.7-1 1a1.5 1.5 0 0 0 2.1 2.1l3-3a.5.5 0 0 0 0-.7l-.7-.7.7-.7.7.7z" />
  </svg>
);

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { action: 'bold', icon: <BoldIcon />, label: 'Bold', shortcut: '⌘+B' },
  { action: 'italic', icon: <ItalicIcon />, label: 'Italic', shortcut: '⌘+I' },
  { action: 'underline', icon: <UnderlineIcon />, label: 'Underline', shortcut: '⌘+U' },
  { action: 'strikethrough', icon: <StrikethroughIcon />, label: 'Strikethrough', shortcut: '⌘+Shift+S' },
  { action: 'code', icon: <CodeIcon />, label: 'Code', shortcut: '⌘+E' },
  { action: 'link', icon: <LinkIcon />, label: 'Link', shortcut: '⌘+K' },
];

const BLOCK_BUTTONS: ToolbarButton[] = [
  { action: 'heading1', icon: <span style={{ fontWeight: 700, fontSize: '14px' }}>H1</span>, label: 'Heading 1' },
  { action: 'heading2', icon: <span style={{ fontWeight: 600, fontSize: '13px' }}>H2</span>, label: 'Heading 2' },
  { action: 'heading3', icon: <span style={{ fontWeight: 600, fontSize: '12px' }}>H3</span>, label: 'Heading 3' },
];

/**
 * FormattingToolbar - Notion-style floating toolbar for text formatting
 */
export function FormattingToolbar({ position, onAction, onClose }: FormattingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [hoveredAction, setHoveredAction] = useState<FormattingAction | null>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        onClose();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleButtonClick = useCallback(
    (action: FormattingAction) => {
      onAction(action);
    },
    [onAction]
  );

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    color: 'rgb(55, 53, 47)',
    transition: 'background-color 0.1s ease',
  };

  const getButtonStyle = (action: FormattingAction): React.CSSProperties => ({
    ...buttonStyle,
    backgroundColor: hoveredAction === action ? 'rgba(55, 53, 47, 0.08)' : 'transparent',
  });

  return (
    <div
      ref={toolbarRef}
      data-formatting-menu
      role="toolbar"
      aria-label="Text formatting"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        padding: '4px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow:
          'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px',
        zIndex: 1000,
      }}
    >
      {/* Inline formatting buttons */}
      {TOOLBAR_BUTTONS.map(({ action, icon, label, shortcut }) => (
        <button
          key={action}
          onClick={() => handleButtonClick(action)}
          onMouseEnter={() => setHoveredAction(action)}
          onMouseLeave={() => setHoveredAction(null)}
          title={shortcut ? `${label} (${shortcut})` : label}
          aria-label={label}
          style={getButtonStyle(action)}
        >
          {icon}
        </button>
      ))}

      {/* Separator */}
      <div
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'rgba(55, 53, 47, 0.16)',
          margin: '0 4px',
        }}
      />

      {/* Block formatting buttons */}
      {BLOCK_BUTTONS.map(({ action, icon, label }) => (
        <button
          key={action}
          onClick={() => handleButtonClick(action)}
          onMouseEnter={() => setHoveredAction(action)}
          onMouseLeave={() => setHoveredAction(null)}
          title={label}
          aria-label={label}
          style={getButtonStyle(action)}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

export default FormattingToolbar;
