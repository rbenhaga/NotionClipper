import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Settings, CheckSquare, Minus, Square, X,
  PanelLeftOpen, PanelLeftClose, RefreshCw, Wifi, WifiOff, Bell
} from 'lucide-react';
import ConfigPanel from '../panels/ConfigPanel'; 

export default function Layout({
  children,
  loading,
  onWindowControl,
  onToggleSidebar,
  onToggleMultiSelect,
  onOpenConfig,
  multiSelectMode,
  sidebarCollapsed,
  isOnline,
  isBackendConnected,
  hasNewPages,
  loadingProgress,
  showOnboardingTest,
  // Props nécessaires pour ConfigPanel
  config,
  onUpdateConfig,
  validateNotionToken,
  showNotification
}) {
  const [showConfig, setShowConfig] = useState(false);
  
  if (loading) {
    return (
      <div className="h-screen bg-notion-gray-50 font-sans">
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="h-screen bg-notion-gray-50 font-sans flex flex-col">
        {/* Titlebar Notion style */}
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

            {/* Indicateur de nouveautés */}
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

            {/* Progress de chargement amélioré */}
            {loadingProgress && loadingProgress.total > 0 && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-notion-gray-500">
                  {loadingProgress.message}
                </div>
                <div className="w-20 h-1.5 bg-notion-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    animate={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 no-drag">

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
              onClick={() => setShowConfig(true)}
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

            {/* Window controls */}
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
            
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => { showOnboardingTest(); }}
                className="w-8 h-8 flex items-center justify-center hover:bg-notion-gray-100 rounded transition-colors"
                title="Test Onboarding"
              >
                <Sparkles size={14} className="text-purple-600" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {children}
        </div>

        {/* Panneau de configuration comme overlay */}
        {showConfig && (
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfig(false)} // Fermer en cliquant à l'extérieur
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} // Empêcher la fermeture en cliquant sur le panneau
            >
              <ConfigPanel
                config={config}
                onUpdateConfig={onUpdateConfig}
                validateNotionToken={validateNotionToken}
                showNotification={showNotification}
                onClose={() => setShowConfig(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </div>

      <style>{`
        .drag-region {
          -webkit-app-region: drag;
        }
        .no-drag {
          -webkit-app-region: no-drag;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}