/**
 * Todo/Action Item Element - Plate v52 component
 * 
 * Checkbox avec style Notion.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

interface TodoElementNode {
  type: string;
  checked?: boolean;
  children: unknown[];
  id?: string;
  [key: string]: unknown;
}

export function TodoElement(props: PlateElementProps) {
  const todoElement = props.element as TodoElementNode;
  const checked = !!todoElement.checked;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editorAny = props.editor as any;
      if (editorAny?.tf?.setNodes && editorAny?.api?.findPath) {
        const path = editorAny.api.findPath(props.element);
        if (path) {
          editorAny.tf.setNodes({ checked: !checked }, { at: path });
        }
      }
    } catch (err) {
      console.warn('[TodoElement] Failed to toggle checkbox:', err);
    }
  };

  return (
    <PlateElement {...props} as="div">
      <div
        className="slate-selectable"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          margin: '2px 0',
        }}
      >
        <button
          type="button"
          contentEditable={false}
          onMouseDown={handleToggle}
          style={{
            marginTop: '4px',
            width: '16px',
            height: '16px',
            border: '1px solid rgba(55, 53, 47, 0.16)',
            borderRadius: '3px',
            background: checked ? 'rgb(35, 131, 226)' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'white',
            padding: 0,
          }}
          aria-label={checked ? 'Uncheck' : 'Check'}
        >
          {checked && (
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <span style={checked ? { opacity: 0.6, textDecoration: 'line-through' } : undefined}>
          {props.children}
        </span>
      </div>
    </PlateElement>
  );
}

export default TodoElement;
