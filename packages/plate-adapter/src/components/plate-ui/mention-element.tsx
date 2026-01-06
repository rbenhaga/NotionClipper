/**
 * Mention Element - Plate v52 component
 * 
 * @mention inline style Notion.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

interface MentionElementNode {
  type: string;
  value?: string;
  children: unknown[];
  [key: string]: unknown;
}

export function MentionElement(props: PlateElementProps) {
  const mentionElement = props.element as MentionElementNode;
  const value = mentionElement.value || '';

  return (
    <PlateElement {...props} as="span">
      <span
        contentEditable={false}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0 4px',
          margin: '0 1px',
          backgroundColor: 'rgba(35, 131, 226, 0.1)',
          borderRadius: '4px',
          color: 'rgb(35, 131, 226)',
          fontWeight: 500,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        @{value}
      </span>
      {props.children}
    </PlateElement>
  );
}

/**
 * Mention Input Element - Le combobox pendant la saisie @...
 */
export function MentionInputElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="span"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 2px',
        backgroundColor: 'rgba(35, 131, 226, 0.05)',
        borderRadius: '2px',
      }}
    />
  );
}

export default { MentionElement, MentionInputElement };
