import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Settings, CheckSquare, Minus, Square, X,
  PanelLeftOpen, PanelLeftClose, RefreshCw
} from 'lucide-react';

export default function Layout({
  children,
  loading,
  onWindowControl,
  onToggleSidebar,
  onToggleMultiSelect,
  onOpenConfig,
  multiSelectMode,
  sidebarCollapsed,
  autoRefresh,
  onToggleAutoRefresh,
  isOnline,
  isBackendConnected
}) {
  if (loading) {
    return (
      <div className="h-screen bg-notion-gray-50 font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="h-screen bg-notion-gray-50 font-sans flex flex-col">
      {/* Titlebar */}
      <motion.div
        className="h-11 bg-white border-b border-notion-gray-200 flex items-center justify-between px-4 flex-shrink-0 drag-region"
        initial={{ y: -44, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-sm font-medium text-notion-gray-700">
              Notion Clipper Pro
            </span>
          </div>

          {/* Indicateur de connectivité */}
          <div className="flex items-center gap-2">
            {isOnline && isBackendConnected ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-notion-gray-500">Connecté</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs text-notion-gray-500">
                  {!isOnline ? 'Hors ligne' : 'Serveur déconnecté'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 no-drag">
          {/* Bouton auto-refresh */}
          <button
            onClick={onToggleAutoRefresh}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              autoRefresh ? 'bg-blue-100 text-blue-600' : 'hover:bg-notion-gray-100 text-notion-gray-600'
            }`}
            title={autoRefresh ? "Auto-refresh activé" : "Auto-refresh désactivé"}
          >
            <RefreshCw size={14} className={autoRefresh ? 'animate-spin-slow' : ''} />
          </button>

          {/* Bouton toggle sidebar */}
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
            title={sidebarCollapsed ? "Ouvrir panneau" : "Fermer panneau"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>

          {/* Bouton config */}
          <button
            onClick={onOpenConfig}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
            title="Configuration"
          >
            <Settings size={14} className="text-notion-gray-600" />
          </button>

          {/* Bouton sélection multiple */}
          <button
            onClick={onToggleMultiSelect}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              multiSelectMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-notion-gray-100 text-notion-gray-600'
            }`}
            title="Sélection multiple"
          >
            <CheckSquare size={14} />
          </button>

          <div className="w-px h-6 bg-notion-gray-200 mx-1" />

          <button
            onClick={() => onWindowControl('minimize')}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
          >
            <Minus size={14} className="text-notion-gray-600" />
          </button>
          <button
            onClick={() => onWindowControl('maximize')}
            className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
          >
            <Square size={12} className="text-notion-gray-600" />
          </button>
          <button
            onClick={() => onWindowControl('close')}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-100 hover:text-red-600 rounded transition-colors"
          >
            <X size={14} className="text-notion-gray-600" />
          </button>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>

      <style>{`
        .drag-region {
          -webkit-app-region: drag;
        }
        .no-drag {
          -webkit-app-region: no-drag;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
} 