import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Square, Minus, X, Zap, WifiOff } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  loading?: boolean;
  isOnline?: boolean;
  isBackendConnected?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/**
 * Layout principal de l'application - Fidèle à l'app Electron
 * Contient le header avec drag region et window controls
 */
export function Layout({
  children,
  loading = false,
  isOnline = true,
  isBackendConnected = true,
  onMinimize,
  onMaximize,
  onClose
}: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header avec zone de drag - Fidèle à Header.jsx de l'app Electron */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 drag-region flex-shrink-0">
        <div className="flex items-center gap-3 no-drag">
          <div className="relative">
            <Zap 
              size={20} 
              className={`${isOnline && isBackendConnected ? 'text-blue-500' : 'text-gray-400'}`}
              fill={isOnline && isBackendConnected ? 'currentColor' : 'none'}
            />
            {!isOnline && (
              <WifiOff size={12} className="absolute -bottom-1 -right-1 text-red-500" />
            )}
          </div>
          <h1 className="text-sm font-semibold text-gray-900">
            Notion Clipper Pro
          </h1>
        </div>

        <div className="flex items-center gap-1 no-drag">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Réduire"
            >
              <Minus size={14} className="text-gray-600" />
            </button>
          )}

          {onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Agrandir"
            >
              <Square size={12} className="text-gray-600" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-100 rounded transition-colors"
              title="Fermer"
            >
              <X size={14} className="text-gray-600 hover:text-red-600" />
            </button>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center bg-gray-50"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Chargement...</p>
            </div>
          </motion.div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}