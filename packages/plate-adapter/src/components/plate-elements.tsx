/**
 * Plate Element Components - Notion-like rendering
 * 
 * These components render Plate nodes as React elements.
 * Each block gets the `slate-selectable` class for BlockSelection.
 * 
 * IMPORTANT: No wrapper divs around elements!
 * - Slate/Plate requires direct element rendering
 * - DnD handles are rendered via Plate's render.aboveNodes (not wrappers)
 * - Extra wrappers break selection, caret, IME, and DnD
 */

import React from 'react';
import type { PlateElementProps } from 'platejs/react';

// ============================================
// PARAGRAPH
// ============================================

export function ParagraphElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <p {...attributes} className="slate-selectable my-1">
      {children}
    </p>
  );
}

// ============================================
// HEADINGS
// ============================================

export function Heading1Element(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <h1 {...attributes} className="slate-selectable text-3xl font-bold mt-8 mb-2">
      {children}
    </h1>
  );
}

export function Heading2Element(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <h2 {...attributes} className="slate-selectable text-2xl font-semibold mt-6 mb-2">
      {children}
    </h2>
  );
}

export function Heading3Element(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <h3 {...attributes} className="slate-selectable text-xl font-semibold mt-4 mb-2">
      {children}
    </h3>
  );
}

// ============================================
// LISTS (Canonical Plate: ul > li > lic structure)
// ============================================

/**
 * Bulleted List Element - Container for bullet list items
 * Renders as a real <ul> with proper list styling
 */
export function BulletedListElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <ul
      {...attributes}
      className="slate-selectable notion-ul list-disc pl-6 my-1"
      style={{ listStyleType: 'disc' }}
    >
      {children}
    </ul>
  );
}

/**
 * Numbered List Element - Container for numbered list items
 * Renders as a real <ol> with proper list styling
 */
export function NumberedListElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <ol
      {...attributes}
      className="slate-selectable notion-ol list-decimal pl-6 my-1"
      style={{ listStyleType: 'decimal' }}
    >
      {children}
    </ol>
  );
}

/**
 * List Item Element - Individual list item
 * Renders as a real <li> - the marker comes from parent ul/ol
 */
export function ListItemElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <li
      {...attributes}
      className="slate-selectable notion-li my-0.5"
      style={{ display: 'list-item' }}
    >
      {children}
    </li>
  );
}

/**
 * List Item Content (lic) - wrapper for text inside list items
 * Plate uses ul > li > lic structure for proper list handling
 */
export function ListItemContentElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <span {...attributes} className="slate-list-item-content">
      {children}
    </span>
  );
}

// ============================================
// TODO / CHECKBOX
// ============================================

interface TodoElement {
  type: string;
  checked?: boolean;
  children: unknown[];
  [key: string]: unknown;
}

export function TodoListElement(props: PlateElementProps) {
  const { attributes, children, element, editor } = props;
  const todoElement = element as TodoElement;
  const checked = !!todoElement.checked;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find path and toggle checked using Plate's API
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editorAny = editor as any;
      if (editorAny?.tf?.setNodes && editorAny?.api?.findPath) {
        const path = editorAny.api.findPath(element);
        if (path) {
          editorAny.tf.setNodes({ checked: !checked }, { at: path });
        }
      }
    } catch (err) {
      console.warn('[TodoListElement] Failed to toggle checkbox:', err);
    }
  };

  return (
    <div {...attributes} className="slate-selectable flex items-start gap-2 my-1">
      <button
        type="button"
        contentEditable={false}
        onMouseDown={handleToggle}
        className={`
          mt-1 h-4 w-4 rounded border flex-shrink-0
          flex items-center justify-center cursor-pointer
          transition-colors
          ${checked 
            ? 'bg-blue-500 border-blue-500 text-white' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        aria-label={checked ? 'Uncheck' : 'Check'}
      >
        {checked && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={checked ? 'opacity-60 line-through' : ''}>
        {children}
      </span>
    </div>
  );
}

// ============================================
// BLOCKQUOTE
// ============================================

export function BlockquoteElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <blockquote 
      {...attributes} 
      className="slate-selectable border-l-4 border-gray-300 pl-4 my-2 text-gray-600 dark:text-gray-400"
    >
      {children}
    </blockquote>
  );
}

// ============================================
// CODE BLOCK
// ============================================

export function CodeBlockElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <pre 
      {...attributes} 
      className="slate-selectable bg-gray-100 dark:bg-gray-800 rounded-md p-4 my-2 font-mono text-sm overflow-x-auto"
    >
      <code>{children}</code>
    </pre>
  );
}

// ============================================
// HORIZONTAL RULE
// ============================================

export function HorizontalRuleElement(props: PlateElementProps) {
  const { attributes, children } = props;
  return (
    <div {...attributes} contentEditable={false} className="slate-selectable my-4">
      <hr className="border-t border-gray-200 dark:border-gray-700" />
      {children}
    </div>
  );
}

// ============================================
// LINK
// ============================================

interface LinkElement {
  type: string;
  url?: string;
  children: unknown[];
  [key: string]: unknown;
}

export function LinkElement(props: PlateElementProps) {
  const { attributes, children, element } = props;
  const linkElement = element as LinkElement;
  
  return (
    <a 
      {...attributes} 
      href={linkElement.url || '#'}
      className="text-blue-500 underline hover:text-blue-600"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

// ============================================
// COMPONENT MAP
// ============================================

/**
 * Map of element types to React components
 * Used by Plate to render nodes
 */
export const plateComponents = {
  p: ParagraphElement,
  h1: Heading1Element,
  h2: Heading2Element,
  h3: Heading3Element,
  ul: BulletedListElement,
  ol: NumberedListElement,
  li: ListItemElement,
  lic: ListItemContentElement, // List item content (Plate structure: ul > li > lic)
  action_item: TodoListElement,
  blockquote: BlockquoteElement,
  code_block: CodeBlockElement,
  hr: HorizontalRuleElement,
  a: LinkElement,
};

export default plateComponents;
