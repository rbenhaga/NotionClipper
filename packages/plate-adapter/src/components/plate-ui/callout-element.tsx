/**
 * Callout Element - Plate v52 component
 * 
 * Callout style Notion avec icône et fond coloré.
 */

import React from 'react';
import { PlateElement } from 'platejs/react';
import type { PlateElementProps } from 'platejs/react';

interface CalloutElementNode {
  type: string;
  icon?: string;
  variant?: 'info' | 'warning' | 'error' | 'success' | 'default';
  children: unknown[];
  [key: string]: unknown;
}

const VARIANT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  info: {
    bg: 'rgba(35, 131, 226, 0.1)',
    border: 'rgba(35, 131, 226, 0.4)',
    icon: '💡',
  },
  warning: {
    bg: 'rgba(255, 193, 7, 0.1)',
    border: 'rgba(255, 193, 7, 0.4)',
    icon: '⚠️',
  },
  error: {
    bg: 'rgba(235, 87, 87, 0.1)',
    border: 'rgba(235, 87, 87, 0.4)',
    icon: '❌',
  },
  success: {
    bg: 'rgba(38, 203, 124, 0.1)',
    border: 'rgba(38, 203, 124, 0.4)',
    icon: '✅',
  },
  default: {
    bg: 'rgba(55, 53, 47, 0.04)',
    border: 'rgba(55, 53, 47, 0.16)',
    icon: '💬',
  },
};

export function CalloutElement(props: PlateElementProps) {
  const calloutElement = props.element as CalloutElementNode;
  const variant = calloutElement.variant || 'default';
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const icon = calloutElement.icon || styles.icon;

  return (
    <PlateElement {...props} as="div">
      <div
        className="slate-selectable"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          margin: '8px 0',
          backgroundColor: styles.bg,
          borderRadius: '4px',
          borderLeft: `3px solid ${styles.border}`,
        }}
      >
        <span
          contentEditable={false}
          style={{
            fontSize: '1.2em',
            lineHeight: 1,
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>{props.children}</div>
      </div>
    </PlateElement>
  );
}

export default CalloutElement;
