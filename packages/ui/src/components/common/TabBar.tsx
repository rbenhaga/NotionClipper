/**
 * 🎯 TabBar - Design System Unifié
 * Distinction claire entre TABS (modes) et ACTIONS (boutons)
 * Style Notion/Apple épuré
 */

import React from 'react';
import { TabIcon } from './TabIcon';

export interface Tab {
  id: string;
  label: string;
  icon: 'TrendingUp' | 'Star' | 'Clock' | 'Folder';
}

export interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'grid' | 'inline';
}

/**
 * TabBar - Barre d'onglets pour filtrer/naviguer
 * Utilise le design system unifié
 */
export function TabBar({ 
  tabs, 
  activeTab, 
  onTabChange,
  variant = 'grid'
}: TabBarProps) {
  if (variant === 'inline') {
    return (
      <div className="px-4 py-2 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg)]">
        <div className="ds-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`ds-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            >
              <TabIcon 
                name={tab.icon} 
                size={14} 
                className={activeTab === tab.id ? 'text-[var(--ds-primary)]' : ''} 
              />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Grid variant (2x2) - default
  return (
    <div className="px-4 py-2 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-bg)]">
      <div className="grid grid-cols-2 gap-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium 
                transition-all duration-150
                ${isActive
                  ? 'bg-[var(--ds-primary-subtle)] text-[var(--ds-primary)] border border-[var(--ds-primary)]/20'
                  : 'text-[var(--ds-fg-muted)] hover:bg-[var(--ds-bg-muted)] border border-transparent'
                }
              `}
            >
              <TabIcon 
                name={tab.icon} 
                size={14} 
                className={isActive ? 'text-[var(--ds-primary)]' : ''} 
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ActionBar - Barre d'actions (distinct des tabs)
 * Pour Voice, Templates, Attach, etc.
 */
export interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

export interface ActionBarProps {
  actions: Action[];
}

export function ActionBar({ actions }: ActionBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {actions.map(action => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`
            ds-action-btn
            ${action.disabled ? 'is-disabled' : ''}
          `}
          data-tooltip={action.disabled ? action.disabledReason : undefined}
          title={action.disabled ? action.disabledReason : action.label}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
