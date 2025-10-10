// packages/ui/src/components/layout/Header.tsx - VERSION CORRIGÉE
import React from 'react';
import { Settings, PanelLeftOpen, PanelLeftClose, Sparkles, Bell, Minus, Square, X } from 'lucide-react';
import { motion } from 'framer-motion';

export interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  isOnline?: boolean;
  isConnected?: boolean;
  onToggleSidebar?: () => void;
  onOpenConfig?: () => void;
  sidebarCollapsed?: boolean;
  hasNewPages?: boolean;
  loadingProgress?: {
    current: number;
    total: number;
    message: string;
  };
  children?: React.ReactNode;

  // Window controls pour Electron
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/**
 * Header unifié pour app Electron et extension web
 * Utilise l'icône Sparkles ✨ comme logo principal
 */
export function Header({
  title = 'Notion Clipper Pro',
  showLogo = true,
  isOnline = true,
  isConnected = false,
  onToggleSidebar,
  onOpenConfig,
  sidebarCollapsed = false,
  hasNewPages = false,
  loadingProgress,
  children,
  onMinimize,
  onMaximize,
  onClose
}: HeaderProps) {
  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 select-none drag-region">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {showLogo && (
          <div className="flex items-center gap-2">
            {/* ✨ Logo principal avec Sparkles */}
            <Sparkles
              size={16}
              className={`transition-colors ${isConnected ? 'text-purple-500' : 'text-gray-400'
                }`}
            />
            <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
          </div>
        )}

        {/* Connection status indicator */}
        {isOnline !== undefined && isConnected !== undefined && (
          <div className="flex items-center gap-1">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">Connecté</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                <span className="text-xs font-medium text-gray-600">Déconnecté</span>
              </div>
            )}
          </div>
        )}

        {/* Loading progress */}
        {loadingProgress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-md"
          >
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-700">
              {loadingProgress.message} ({loadingProgress.current}/{loadingProgress.total})
            </span>
          </motion.div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Custom children (additional buttons, etc.) */}
        {children}

        {/* Notifications bell */}
        {hasNewPages && (
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors group no-drag"
            title="Nouvelles pages disponibles"
            aria-label="Nouvelles pages"
          >
            <Bell size={16} className="text-gray-600 group-hover:text-gray-900" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </button>
        )}

        {/* Sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group no-drag"
            title={sidebarCollapsed ? 'Afficher la barre latérale' : 'Masquer la barre latérale'}
            aria-label={sidebarCollapsed ? 'Afficher sidebar' : 'Masquer sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} className="text-gray-600 group-hover:text-gray-900" />
            ) : (
              <PanelLeftClose size={16} className="text-gray-600 group-hover:text-gray-900" />
            )}
          </button>
        )}

        {/* Settings button */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group no-drag"
            title="Paramètres"
            aria-label="Ouvrir les paramètres"
          >
            <Settings size={16} className="text-gray-600 group-hover:text-gray-900" />
          </button>
        )}

        {/* Window controls pour Electron */}
        {(onMinimize || onMaximize || onClose) && (
          <div className="flex items-center gap-2 ml-3 no-drag">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="w-3 h-3 bg-yellow-400 rounded-full hover:bg-yellow-500 transition-colors flex items-center justify-center"
                title="Réduire"
                aria-label="Réduire la fenêtre"
              >
                <Minus size={8} className="text-yellow-800" />
              </button>
            )}
            {onMaximize && (
              <button
                onClick={onMaximize}
                className="w-3 h-3 bg-green-400 rounded-full hover:bg-green-500 transition-colors flex items-center justify-center"
                title="Agrandir"
                aria-label="Agrandir la fenêtre"
              >
                <Square size={6} className="text-green-800" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-400 rounded-full hover:bg-red-500 transition-colors flex items-center justify-center"
                title="Fermer"
                aria-label="Fermer la fenêtre"
              >
                <X size={8} className="text-red-800" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}