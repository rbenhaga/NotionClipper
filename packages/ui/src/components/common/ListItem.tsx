/**
 * 🎨 UNIFIED LIST ITEM COMPONENT
 * Design System V2 - Notion-style selection
 * 
 * RÈGLES:
 * - Sélection = fond léger + indicateur gauche (pas de bordure épaisse)
 * - Densité ajustable via CSS vars
 * - États: default/hover/selected/focus/disabled
 */

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ListItemProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  disabled?: boolean;
  /** Contenu à gauche (icône, avatar, etc.) */
  leading?: ReactNode;
  /** Contenu à droite (badge, action, etc.) */
  trailing?: ReactNode;
  /** Titre principal */
  title: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Métadonnées (date, etc.) */
  meta?: string;
  children?: ReactNode;
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  (
    {
      selected = false,
      disabled = false,
      leading,
      trailing,
      title,
      subtitle,
      meta,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          'ds-list-item group',
          selected && 'ds-list-item-selected',
          disabled && 'ds-list-item-disabled',
          className
        )}
        {...props}
      >
        {/* Leading content */}
        {leading && (
          <div className="flex-shrink-0">
            {leading}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="ds-truncate text-[13px] font-medium text-[var(--ds-fg)]">
              {title}
            </span>
            {meta && (
              <span className="flex-shrink-0 text-[11px] text-[var(--ds-fg-subtle)]">
                {meta}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="ds-truncate text-[12px] text-[var(--ds-fg-muted)] mt-0.5 block">
              {subtitle}
            </span>
          )}
          {children}
        </div>

        {/* Trailing content */}
        {trailing && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {trailing}
          </div>
        )}
      </div>
    );
  }
);

ListItem.displayName = 'ListItem';

/**
 * List Item Icon Container
 * Pour uniformiser les icônes dans les list items
 */
export interface ListItemIconProps {
  children: ReactNode;
  selected?: boolean;
  className?: string;
}

export function ListItemIcon({ children, selected, className }: ListItemIconProps) {
  return (
    <div
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors',
        selected
          ? 'bg-[var(--ds-primary-subtle)] border-[var(--ds-primary)]/20'
          : 'bg-[var(--ds-bg-muted)] border-[var(--ds-border-subtle)] group-hover:bg-[var(--ds-primary-subtle)] group-hover:border-[var(--ds-primary)]/10',
        className
      )}
    >
      {children}
    </div>
  );
}

export default ListItem;
