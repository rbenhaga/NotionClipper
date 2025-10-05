import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  Square, Minus, X, 
  Sparkles, Settings, Eye, 
  PanelLeftOpen, PanelLeftClose,
  Wifi, WifiOff, Bell
} from 'lucide-react';

interface LoadingProgress {
  current: number;
  total: number;
  message: string;
}

interface LayoutProps {
  children: ReactNode;
  loading?: boolean;
  
  // Connexion
  isOnline?: boolean;
  isBackendConnected?: boolean;
  
  // Sidebar
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  
  // Config
  config?: any;
  onOpenConfig?: () => void;
  
  // Preview
  showPreview?: boolean;
  onTogglePreview?: () => void;
  
  // Notifications
  hasNewPages?: boolean;
  
  // Loading
  loadingProgress?: LoadingProgress;
  
  // Window controls (pour Electron uniquement)
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/**
 * Layout principal 100% fidèle à l'app Electron Layout.jsx
 * Contient TOUS les boutons et indicateurs
 */
export function Layout({
  children,
  loading = false,
  isOnline = true,
  isBackendConnected = true,
  sidebarCollapsed = false,
  onToggleSidebar,
  config,
  onOpenConfig,
  showPreview = false,
  onTogglePreview,
  hasNewPages = false,
  loadingProgress,
  onMinimize,
  onMaximize,
  onClose
}: LayoutProps) {
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 font-sans flex flex-col">
      {/* Titlebar - 100% fidèle à Layout.jsx de l'app Electron */}
      <motion.div
        className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 drag-region"
        style={{ position: 'relative', zIndex: 9999 }}
        initial={{ y: -44, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-sm font-medium text-gray-700">
              Notion Clipper Pro
            </span>
          </div>

          {/* Connectivity indicator */}
          <div className="flex items-center gap-2">
            {isOnline && isBackendConnected ? (
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

          {/* New pages indicator */}
          {hasNewPages && (
            <motion.div
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
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
                  animate={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-1 no-drag">
          {/* Toggle Sidebar - BOUTON IMPORTANT */}
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

          {/* Settings - BOUTON IMPORTANT */}
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Configuration"
            >
              <Settings size={14} className="text-gray-600" />
            </button>
          )}

          {/* Preview toggle */}
          {config?.previewPageId && onTogglePreview && (
            <button
              onClick={onTogglePreview}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                showPreview
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Afficher/Masquer la preview"
            >
              <Eye size={14} />
            </button>
          )}

          {/* Window controls (Electron only) */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Réduire"
            >
              <Minus size={14} className="text-gray-600" />
            </button>
          )}

          {onMaximize && (
            <button
              onClick={onMaximize}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Agrandir"
            >
              <Square size={12} className="text-gray-600" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-red-100 rounded transition-colors"
              title="Fermer"
            >
              <X size={14} className="text-gray-600 hover:text-red-600" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}