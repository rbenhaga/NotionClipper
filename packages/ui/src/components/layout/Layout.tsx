import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Square, Minus, X, Settings as SettingsIcon, Eye } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  loading?: boolean;
  onSettingsClick?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  onTogglePreview?: () => void;
  showPreview?: boolean;
}

/**
 * Layout principal de l'application
 * Contient le header avec drag region et window controls
 */
export function Layout({
  children,
  loading = false,
  onSettingsClick,
  onMinimize,
  onMaximize,
  onClose,
  onTogglePreview,
  showPreview = false
}: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header avec zone de drag */}
      <header className="flex items-center justify-between h-11 px-4 bg-white border-b border-gray-200 drag-region flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
              <path d="M4 4h16v16H4z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-gray-800">Notion Clipper Pro</h1>
        </div>

        <div className="flex items-center gap-1 no-drag">
          {onTogglePreview && (
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

          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Paramètres"
            >
              <SettingsIcon size={14} className="text-gray-600" />
            </button>
          )}

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
              className="w-8 h-8 flex items-center justify-center hover:bg-red-100 hover:text-red-600 rounded transition-colors"
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