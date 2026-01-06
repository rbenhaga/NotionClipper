/**
 * Code Block Element - Plate v52 component
 * 
 * Code block style Notion avec fond et police monospace.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function CodeBlockElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="pre">
      <pre
        className="slate-selectable"
        style={{
          backgroundColor: 'rgba(135, 131, 120, 0.15)',
          borderRadius: '4px',
          padding: '12px 16px',
          fontFamily: '"SFMono-Regular", Menlo, Consolas, monospace',
          fontSize: '0.875em',
          lineHeight: 1.5,
          overflowX: 'auto',
          margin: '4px 0',
        }}
      >
        <code>{props.children}</code>
      </pre>
    </PlateElement>
  );
}

export function CodeLineElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="div" style={{ minHeight: '1.5em' }} />
  );
}

export default { CodeBlockElement, CodeLineElement };
