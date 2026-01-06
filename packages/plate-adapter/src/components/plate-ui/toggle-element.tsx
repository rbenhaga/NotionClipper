/**
 * Toggle Element - Plate v52 component
 * 
 * Bloc toggle pliable style Notion.
 */

import React, { useState } from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

interface ToggleElementNode {
  type: string;
  open?: boolean;
  children: unknown[];
  [key: string]: unknown;
}

export function ToggleElement(props: PlateElementProps) {
  const toggleElement = props.element as ToggleElementNode;
  const [isOpen, setIsOpen] = useState(toggleElement.open ?? true);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newOpen = !isOpen;
    setIsOpen(newOpen);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editorAny = props.editor as any;
      if (editorAny?.tf?.setNodes && editorAny?.api?.findPath) {
        const path = editorAny.api.findPath(props.element);
        if (path) {
          editorAny.tf.setNodes({ open: newOpen }, { at: path });
        }
      }
    } catch (err) {
      console.warn('[ToggleElement] Failed to update toggle state:', err);
    }
  };

  return (
    <PlateElement {...props} as="div">
      <div
        className="slate-selectable"
        style={{ margin: '4px 0' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
          <button
            type="button"
            contentEditable={false}
            onMouseDown={handleToggle}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'rgba(55, 53, 47, 0.5)',
              transition: 'transform 0.15s ease',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 2l4 4-4 4V2z" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {React.Children.toArray(props.children)[0]}
          </div>
        </div>
        
        {isOpen && React.Children.count(props.children) > 1 && (
          <div
            style={{
              marginLeft: '28px',
              paddingLeft: '12px',
              borderLeft: '2px solid rgba(55, 53, 47, 0.1)',
            }}
          >
            {React.Children.toArray(props.children).slice(1)}
          </div>
        )}
      </div>
    </PlateElement>
  );
}

export default ToggleElement;
