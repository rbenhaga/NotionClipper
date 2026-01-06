/**
 * Table Elements - Plate v52 components
 * 
 * Table style Notion: table > tr > td/th
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

/**
 * Table Container
 */
export function TableElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="div">
      <div className="slate-selectable" style={{ margin: '8px 0', overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <tbody>{props.children}</tbody>
        </table>
      </div>
    </PlateElement>
  );
}

/**
 * Table Row
 */
export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="tr"
      style={{ borderBottom: '1px solid rgba(55, 53, 47, 0.16)' }}
    />
  );
}

/**
 * Table Cell
 */
export function TableCellElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="td"
      className="slate-selectable"
      style={{
        padding: '8px 12px',
        border: '1px solid rgba(55, 53, 47, 0.16)',
        verticalAlign: 'top',
        minWidth: '100px',
      }}
    />
  );
}

/**
 * Table Header Cell
 */
export function TableCellHeaderElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="th"
      className="slate-selectable"
      style={{
        padding: '8px 12px',
        border: '1px solid rgba(55, 53, 47, 0.16)',
        verticalAlign: 'top',
        minWidth: '100px',
        fontWeight: 600,
        backgroundColor: 'rgba(55, 53, 47, 0.04)',
        textAlign: 'left',
      }}
    />
  );
}

export default {
  TableElement,
  TableRowElement,
  TableCellElement,
  TableCellHeaderElement,
};
