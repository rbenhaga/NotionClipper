// packages/ui/src/components/layout/Header.tsx - VERSION DÉFINITIVE
import React from 'react';
import { Sparkles, Settings, PanelLeftClose, PanelLeftOpen, Minus, Square, X } from 'lucide-react';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenConfig?: () => void;
  sidebarCollapsed?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isConnected?: boolean;
}

export function Header({
  onToggleSidebar,
  onOpenConfig,
  sidebarCollapsed,
  onMinimize,
  onMaximize,
  onClose,
  isConnected = false
}: HeaderProps) {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 drag-region">
      {/* 🎯 GAUCHE - Logo + Status */}
      <div className="flex items-center gap-4">
        {/* Logo avec Sparkles */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800 select-none">
            Notion Clipper Pro
          </span>
        </div>

        {/* Séparateur */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Status de connexion - CLAIR et VISIBLE */}
        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">Connecté</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span className="text-xs font-medium text-gray-600">Déconnecté</span>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 DROITE - Actions + Window Controls */}
      <div className="flex items-center gap-1">
        {/* Toggle Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="no-drag w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            title={sidebarCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} className="text-gray-600" />
            ) : (
              <PanelLeftClose size={16} className="text-gray-600" />
            )}
          </button>
        )}

        {/* Settings */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="no-drag w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            title="Paramètres"
          >
            <Settings size={16} className="text-gray-600" />
          </button>
        )}

        {/* Window Controls (Electron uniquement) */}
        {onMinimize && onMaximize && onClose && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            
            <div className="flex items-center">
              {/* Minimize */}
              <button
                onClick={onMinimize}
                className="no-drag w-9 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                title="Réduire"
              >
                <svg width="10" height="1" viewBox="0 0 10 1">
                  <rect width="10" height="1" fill="#6B7280" />
                </svg>
              </button>

              {/* Maximize */}
              <button
                onClick={onMaximize}
                className="no-drag w-9 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                title="Agrandir"
              >
                <svg width="9" height="9" viewBox="0 0 9 9">
                  <rect x="0.5" y="0.5" width="8" height="8" 
                        stroke="#6B7280" strokeWidth="1" fill="none" />
                </svg>
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="no-drag w-9 h-8 flex items-center justify-center hover:bg-red-50 transition-colors group"
                title="Fermer"
              >
                <svg width="9" height="9" viewBox="0 0 9 9">
                  <path d="M1 1L8 8M8 1L1 8" 
                        stroke="#6B7280" 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                        className="group-hover:stroke-red-500" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}