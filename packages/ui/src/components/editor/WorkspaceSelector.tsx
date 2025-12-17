/**
 * WorkspaceSelector Component
 * Permet de sélectionner et changer de workspace Notion
 * Design minimaliste style Notion
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import { ChevronDown, Check, Plus, Building2 } from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
}

export interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace) => void;
  onAddWorkspace?: () => void;
  className?: string;
}

export function WorkspaceSelector({
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onAddWorkspace,
  className = ''
}: WorkspaceSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
          {currentWorkspace?.icon || currentWorkspace?.name?.charAt(0) || 'W'}
        </div>
        <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {currentWorkspace?.name || 'Sélectionner un workspace'}
        </span>
        <ChevronDown 
          size={14} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            {/* Menu */}
            <MotionDiv
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
            >
              <div className="p-1 max-h-64 overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      onWorkspaceChange(workspace);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      currentWorkspace?.id === workspace.id
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {workspace.icon || workspace.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {workspace.name}
                    </span>
                    {currentWorkspace?.id === workspace.id && (
                      <Check size={16} className="text-purple-600 dark:text-purple-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Add Workspace */}
              {onAddWorkspace && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-1">
                  <button
                    onClick={() => {
                      onAddWorkspace();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <Plus size={14} />
                    </div>
                    <span className="text-sm font-medium">
                      Ajouter un workspace
                    </span>
                  </button>
                </div>
              )}
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
