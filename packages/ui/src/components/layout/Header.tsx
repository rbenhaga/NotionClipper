// packages/ui/src/components/layout/Header.tsx - FIXED ICON
import React from 'react';
import { Settings, PanelLeftOpen, PanelLeftClose, Sparkles, Wifi, WifiOff, Bell } from 'lucide-react';
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
}

export function Header({
  title = 'Notion Clipper Pro',
  showLogo = true,
  isOnline,
  isConnected,
  onToggleSidebar,
  onOpenConfig,
  sidebarCollapsed = false,
  hasNewPages = false,
  loadingProgress,
  children
}: HeaderProps) {
  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {showLogo && (
          <div className="flex items-center gap-2">
            {/* ✅ CORRIGÉ : Sparkles au lieu de Zap */}
            <Sparkles 
              size={16} 
              className={isConnected ? 'text-purple-500' : 'text-gray-400'}
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
        {children}
        
        {/* Notifications bell */}
        {hasNewPages && (
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            title="Nouvelles pages"
          >
            <Bell size={16} className="text-gray-600 group-hover:text-gray-900" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </button>
        )}

        {/* Sidebar toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            title={sidebarCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'}
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            title="Paramètres"
          >
            <Settings size={16} className="text-gray-600 group-hover:text-gray-900" />
          </button>
        )}
      </div>
    </div>
  );
}