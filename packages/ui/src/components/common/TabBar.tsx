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

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
    return (
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100 bg-white/95">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    <TabIcon name={tab.icon} size={12} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}