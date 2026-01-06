/**
 * FloatingToolbar - Notion-like formatting toolbar on text selection
 * 
 * Appears when text is selected, provides:
 * - Bold, Italic, Underline, Strikethrough, Code
 * - Link insertion
 * - Text color (future)
 * - Comment (future)
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useEditorRef, useEditorSelector } from 'platejs/react';

// Note: Mark plugins are imported from @platejs/basic-nodes/react
// but we don't need to import them here - we just use the mark keys directly

interface FloatingToolbarProps {
  className?: string;
}

/**
 * Check if editor has a mark active
 */
function useMarkActive(markType: string): boolean {
  return useEditorSelector(
    (editor) => {
      try {
        const marks = editor.api.marks();
        return marks ? !!marks[markType] : false;
      } catch {
        return false;
      }
    },
    [markType]
  );
}

/**
 * FloatingToolbar - Appears on text selection
 */
export function FloatingToolbar({ className = '' }: FloatingToolbarProps) {
  const editor = useEditorRef();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Track active marks
  const isBold = useMarkActive('bold');
  const isItalic = useMarkActive('italic');
  const isUnderline = useMarkActive('underline');
  const isStrikethrough = useMarkActive('strikethrough');
  const isCode = useMarkActive('code');

  // Update position based on selection
  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setIsVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    if (rect.width === 0) {
      setIsVisible(false);
      return;
    }

    // Position above the selection
    const toolbarHeight = 40;
    const top = rect.top + window.scrollY - toolbarHeight - 8;
    const left = rect.left + window.scrollX + rect.width / 2;

    setPosition({ top, left });
    setIsVisible(true);
  }, []);

  // Listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      // Small delay to let selection settle
      requestAnimationFrame(updatePosition);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updatePosition]);

  // Toggle mark handler
  const toggleMark = useCallback((markType: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editorAny = editor as any;
      const marks = editorAny.api?.marks?.();
      
      if (marks?.[markType]) {
        editorAny.tf?.removeMark?.(markType);
      } else {
        editorAny.tf?.addMark?.(markType, true);
      }
    } catch (err) {
      console.warn('[FloatingToolbar] Failed to toggle mark:', err);
    }
  }, [editor]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={`nc-floating-toolbar ${className}`}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px 8px',
        backgroundColor: 'white',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1)',
        userSelect: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Bold */}
      <ToolbarButton
        active={isBold}
        onClick={() => toggleMark('bold')}
        title="Bold (Ctrl+B)"
      >
        <BoldIcon />
      </ToolbarButton>

      {/* Italic */}
      <ToolbarButton
        active={isItalic}
        onClick={() => toggleMark('italic')}
        title="Italic (Ctrl+I)"
      >
        <ItalicIcon />
      </ToolbarButton>

      {/* Underline */}
      <ToolbarButton
        active={isUnderline}
        onClick={() => toggleMark('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon />
      </ToolbarButton>

      {/* Strikethrough */}
      <ToolbarButton
        active={isStrikethrough}
        onClick={() => toggleMark('strikethrough')}
        title="Strikethrough"
      >
        <StrikethroughIcon />
      </ToolbarButton>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#e0e0e0', margin: '0 4px' }} />

      {/* Code */}
      <ToolbarButton
        active={isCode}
        onClick={() => toggleMark('code')}
        title="Code (Ctrl+E)"
      >
        <CodeIcon />
      </ToolbarButton>

      {/* Link - TODO: implement link insertion */}
      <ToolbarButton
        active={false}
        onClick={() => {
          // TODO: Open link dialog
          console.log('[FloatingToolbar] Link insertion not yet implemented');
        }}
        title="Link (Ctrl+K)"
      >
        <LinkIcon />
      </ToolbarButton>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOOLBAR BUTTON
// ═══════════════════════════════════════════════════════════════

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: active ? 'rgba(35, 131, 226, 0.1)' : 'transparent',
        color: active ? 'rgb(35, 131, 226)' : 'rgba(55, 53, 47, 0.65)',
        cursor: 'pointer',
        transition: 'background-color 100ms ease',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(55, 53, 47, 0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// ICONS (inline SVG for simplicity)
// ═══════════════════════════════════════════════════════════════

function BoldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2h5a3 3 0 0 1 2.12 5.12A3.5 3.5 0 0 1 9.5 14H4V2zm2 5h3a1 1 0 1 0 0-2H6v2zm0 2v3h3.5a1.5 1.5 0 0 0 0-3H6z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2h6v2h-2.2l-2.6 8H10v2H4v-2h2.2l2.6-8H6V2z" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2v6a4 4 0 0 0 8 0V2h2v6a6 6 0 0 1-12 0V2h2zM2 15h12v1H2v-1z" />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 8h12v1H2V8zm6-6c2.21 0 4 1.34 4 3h-2c0-.55-.9-1-2-1s-2 .45-2 1c0 .36.36.68 1 .9V4.1C5.17 3.5 4 2.9 4 2c0-1.66 1.79-3 4-3zm0 14c-2.21 0-4-1.34-4-3h2c0 .55.9 1 2 1s2-.45 2-1c0-.36-.36-.68-1-.9v1.8c1.83.6 3 1.2 3 2.1 0 1.66-1.79 3-4 3z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.854 4.146a.5.5 0 0 1 0 .708L2.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm4.292 0a.5.5 0 0 0 0 .708L13.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9a2 2 0 0 1 0 2H4a1 1 0 1 1 0-2h2.354a4.002 4.002 0 0 1 0-2zm3.292 5H12a3 3 0 1 0 0-6H9a3 3 0 0 0-2.83 4H7a2 2 0 0 1 0-2h3a1 1 0 1 1 0 2H7.646a4.002 4.002 0 0 1 0 2z" />
    </svg>
  );
}

export default FloatingToolbar;
