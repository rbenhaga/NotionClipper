/**
 * Heading Elements - Plate v52 components
 * 
 * H1, H2, H3 avec style Notion-like.
 * Utilise PlateElement comme base.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function Heading1Element(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="h1"
      className="slate-selectable"
      style={{
        fontSize: '1.875em',
        fontWeight: 700,
        margin: '1em 0 0.25em 0',
        lineHeight: 1.3,
      }}
    />
  );
}

export function Heading2Element(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="h2"
      className="slate-selectable"
      style={{
        fontSize: '1.5em',
        fontWeight: 600,
        margin: '0.75em 0 0.25em 0',
        lineHeight: 1.3,
      }}
    />
  );
}

export function Heading3Element(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="h3"
      className="slate-selectable"
      style={{
        fontSize: '1.25em',
        fontWeight: 600,
        margin: '0.5em 0 0.25em 0',
        lineHeight: 1.3,
      }}
    />
  );
}

export default { Heading1Element, Heading2Element, Heading3Element };
