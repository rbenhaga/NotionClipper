/**
 * Custom Horizontal Rule Plugin for Plate
 * 
 * Renders a proper <hr> element without children (void element).
 * Slate requires children array for selection, but we hide them.
 */

import React from 'react';
import { createPlatePlugin } from 'platejs/react';

// Plugin key
export const ELEMENT_HR = 'hr';

/**
 * HR Element Component
 * Renders a void element properly - children are hidden but present for Slate
 */
export function HrElement({ 
  attributes, 
  children,
  element,
}: {
  attributes: React.HTMLAttributes<HTMLDivElement> & { 'data-slate-node': string };
  children: React.ReactNode;
  element: { id?: string };
}) {
  return (
    <div 
      {...attributes} 
      contentEditable={false}
      className="plate-hr-wrapper"
      style={{ 
        padding: '12px 0',
        userSelect: 'none',
      }}
    >
      <hr 
        style={{
          border: 'none',
          borderTop: '1px solid #e5e5e5',
          margin: 0,
        }}
      />
      {/* Slate needs children for selection - hide them */}
      <span style={{ display: 'none' }}>{children}</span>
    </div>
  );
}

/**
 * Horizontal Rule Plugin
 * Configures the HR element type and renderer
 */
export const HorizontalRulePlugin = createPlatePlugin({
  key: ELEMENT_HR,
  node: {
    isElement: true,
    isVoid: true,
    type: ELEMENT_HR,
  },
  render: {
    node: HrElement,
  },
});

export default HorizontalRulePlugin;
