/**
 * Horizontal Rule Element - Plate v52 component
 * 
 * Void element.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

export function HorizontalRuleElement(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <div contentEditable={false} style={{ margin: '8px 0' }}>
        <hr
          style={{
            border: 'none',
            borderTop: '1px solid rgba(55, 53, 47, 0.16)',
            margin: 0,
          }}
        />
      </div>
      <span style={{ display: 'none' }}>{props.children}</span>
    </PlateElement>
  );
}

export default HorizontalRuleElement;
