/**
 * List Elements - Plate v52 components
 * 
 * STRUCTURE PLATE CANONIQUE: ul > li > lic (list item content)
 * Utilise PlateElement comme base.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

/**
 * Bulleted List Container (ul)
 */
export function BulletedListElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="ul"
      className="slate-selectable"
      style={{
        listStyleType: 'disc',
        listStylePosition: 'outside',
        margin: '4px 0',
        paddingLeft: '1.5rem',
      }}
    />
  );
}

/**
 * Numbered List Container (ol)
 */
export function NumberedListElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="ol"
      className="slate-selectable"
      style={{
        listStyleType: 'decimal',
        listStylePosition: 'outside',
        margin: '4px 0',
        paddingLeft: '1.5rem',
      }}
    />
  );
}

/**
 * List Item (li)
 */
export function ListItemElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="li"
      className="slate-selectable"
      style={{
        display: 'list-item',
        margin: '2px 0',
      }}
    />
  );
}

/**
 * List Item Content (lic) - wrapper pour le texte dans les list items
 */
export function ListItemContentElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="span"
      className="slate-list-item-content"
    />
  );
}

export default {
  BulletedListElement,
  NumberedListElement,
  ListItemElement,
  ListItemContentElement,
};
