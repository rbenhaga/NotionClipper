import React from 'react';
import { Settings, PanelLeftOpen, PanelLeftClose, Zap, Wifi, WifiOff, Bell } from 'lucide-react';
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

/**
 * Header component for the top bar
 * Displays logo, connection status, and controls
 */
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
            <Zap 
              size={16} 
              className={isConnected ? 'text-blue-500' : 'text-gray-400'}
              fill={isConnected ? 'currentColor' : 'none'}
            />
            <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
          </div>
        )}
        
        {/* Connection status indicator */}
        {isOnline !== undefined && isConnected !== undefined && (
          <div className="flex items-center gap-1">
            {isConnected ? (
              <div className="flex items-center gap-1">
                <Wifi size={12} className="text-green-500" />
                <span className="text-xs text-green-600">Connecté</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <WifiOff size={12} className="text-red-500" />
                <span className="text-xs text-red-600">Déconnecté</span>
              </div>
            )}
          </div>
        )}
        
        {/* New pages indicator */}
        {hasNewPages && (
          <motion.div
            className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Bell size={12} className="text-blue-600" />
            <span className="text-xs text-blue-600">Nouvelles pages</span>
          </motion.div>
        )}
        
        {/* Loading progress */}
        {loadingProgress && loadingProgress.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {loadingProgress.message}
            </div>
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                animate={{ 
                  width: `${(loadingProgress.current / loadingProgress.total) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
        
        {/* Custom content */}
        {children}
      </div>
      
      {/* Right side - Controls */}
      <div className="flex items-center gap-1">
        {/* Toggle Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            title={sidebarCollapsed ? "Ouvrir panneau" : "Fermer panneau"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={14} className="text-gray-600" />
            ) : (
              <PanelLeftClose size={14} className="text-gray-600" />
            )}
          </button>
        )}
        
        {/* Settings/Config */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            title="Configuration"
          >
            <Settings size={14} className="text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}