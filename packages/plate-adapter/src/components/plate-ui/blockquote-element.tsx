/**
 * Blockquote Element - Plate v52 component
 * 
 * Style Notion-like avec bordure gauche.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function BlockquoteElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="blockquote"
      className="slate-selectable"
      style={{
        margin: '0.5em 0',
        paddingLeft: '1em',
        borderLeft: '3px solid rgba(55, 53, 47, 0.16)',
        color: 'rgba(55, 53, 47, 0.65)',
      }}
    />
  );
}

export default BlockquoteElement;
