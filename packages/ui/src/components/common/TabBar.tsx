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
}

/**
 * Barre d'onglets en grille 2x2 pour filtrer les pages
 * Fidèle au design de l'app Electron
 */
export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="px-4 py-2 border-b border-gray-100 bg-white/50">
      <div className="grid grid-cols-2 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <TabIcon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}