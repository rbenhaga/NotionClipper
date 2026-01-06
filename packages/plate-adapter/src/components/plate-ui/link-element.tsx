/**
 * Link Element - Plate v52 component
 * 
 * Lien inline avec style Notion.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

interface LinkElementNode {
  type: string;
  url?: string;
  children: unknown[];
  [key: string]: unknown;
}

export function LinkElement(props: PlateElementProps) {
  const linkElement = props.element as LinkElementNode;

  return (
    <PlateElement {...props} as="a">
      <a
        href={linkElement.url || '#'}
        className="slate-link"
        style={{
          color: 'inherit',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(55, 53, 47, 0.4)',
          textUnderlineOffset: '2px',
        }}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e: React.MouseEvent) => {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
          }
        }}
      >
        {props.children}
      </a>
    </PlateElement>
  );
}

export default LinkElement;
