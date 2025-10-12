import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Minus,
  Square,
  X,
  Pin,
  PinOff,
  Minimize
} from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenConfig?: () => void;
  sidebarCollapsed?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isConnected?: boolean;
  
  // Nouvelles props
  isPinned?: boolean;
  onTogglePin?: () => void;
  isMinimalist?: boolean;
  onToggleMinimalist?: () => void;
}

export function Header({
  onToggleSidebar,
  onOpenConfig,
  sidebarCollapsed,
  onMinimize,
  onMaximize,
  onClose,
  isConnected = false,
  isPinned = false,
  onTogglePin,
  isMinimalist = false,
  onToggleMinimalist
}: HeaderProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Tooltip component
  const Tooltip = ({ text, show }: { text: string; show: boolean }) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap pointer-events-none shadow-lg"
          style={{ zIndex: 9999 }}
        >
          {text}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // MODE COMPACT - Header ultra-minimaliste
  if (isMinimalist) {
    return (
      <div className="h-11 bg-white/95 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-4 drag-region">
        {/* Logo + Pin uniquement */}
        <div className="flex items-center gap-3">
          <NotionClipperLogo size={20} />
          
          {/* Indicateur connexion minimaliste */}
          {isConnected && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Pin */}
          {onTogglePin && (
            <div className="relative">
              <button
                onClick={onTogglePin}
                onMouseEnter={() => setShowTooltip('pin')}
                onMouseLeave={() => setShowTooltip(null)}
                className={`
                  no-drag w-7 h-7 flex items-center justify-center rounded-md transition-all
                  ${isPinned
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <Pin size={14} />
              </button>
              <Tooltip 
                text={isPinned ? 'Désépingler' : 'Épingler'} 
                show={showTooltip === 'pin'} 
              />
            </div>
          )}

          {/* Minimize (retour mode normal) */}
          {onToggleMinimalist && (
            <div className="relative">
              <button
                onClick={onToggleMinimalist}
                onMouseEnter={() => setShowTooltip('expand')}
                onMouseLeave={() => setShowTooltip(null)}
                className="no-drag w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <Square size={12} />
              </button>
              <Tooltip text="Mode normal" show={showTooltip === 'expand'} />
            </div>
          )}

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-100 transition-colors group ml-1"
            >
              <X size={14} className="text-gray-400 group-hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // MODE NORMAL - Header complet
  return (
    <div className="h-14 bg-white/95 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-5 drag-region">
      {/* 🎯 GAUCHE - Logo + Status */}
      <div className="flex items-center gap-4">
        {/* Logo Notion Style */}
        <div className="flex items-center gap-3 select-none">
          <NotionClipperLogo size={28} />
          <span className="text-sm font-semibold text-gray-900 tracking-tight">
            Notion Clipper Pro
          </span>
        </div>

        {/* Status de connexion */}
        {isConnected !== undefined && (
          <>
            <div className="w-px h-6 bg-gray-200/70" />
            <div className="flex items-center">
              <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-300 ease-out
                ${isConnected 
                  ? 'bg-emerald-50 border border-emerald-200/50' 
                  : 'bg-gray-50 border border-gray-200/50'
                }
              `}>
                <div className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-500
                  ${isConnected 
                    ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] animate-pulse' 
                    : 'bg-gray-400'
                  }
                `} />
                <span className={isConnected ? 'text-emerald-700' : 'text-gray-600'}>
                  {isConnected ? 'Connecté' : 'Hors ligne'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 🎯 DROITE - Actions + Window Controls */}
      <div className="flex items-center gap-1">
        {/* Toggle Sidebar */}
        {onToggleSidebar && (
          <div className="relative">
            <button
              onClick={onToggleSidebar}
              onMouseEnter={() => setShowTooltip('toggle-sidebar')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              {sidebarCollapsed ? 
                <PanelLeftOpen size={18} className="text-gray-600" /> : 
                <PanelLeftClose size={18} className="text-gray-600" />
              }
            </button>
            <Tooltip 
              text={sidebarCollapsed ? 'Afficher le panneau' : 'Masquer le panneau'} 
              show={showTooltip === 'toggle-sidebar'} 
            />
          </div>
        )}

        {/* Séparateur */}
        {(onToggleSidebar || onOpenConfig) && (onTogglePin || onToggleMinimalist) && (
          <div className="w-px h-6 bg-gray-200/70 mx-1" />
        )}

        {/* Toggle Pin */}
        {onTogglePin && (
          <div className="relative">
            <button
              onClick={onTogglePin}
              onMouseEnter={() => setShowTooltip('pin')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`
                no-drag w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200
                ${isPinned
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {isPinned ? <Pin size={18} /> : <PinOff size={18} />}
            </button>
            <Tooltip 
              text={isPinned ? 'Désépingler' : 'Épingler au premier plan'} 
              show={showTooltip === 'pin'} 
            />
          </div>
        )}

        {/* Toggle Mode Minimaliste */}
        {onToggleMinimalist && (
          <div className="relative">
            <button
              onClick={onToggleMinimalist}
              onMouseEnter={() => setShowTooltip('minimalist')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <Minimize size={18} />
            </button>
            <Tooltip text="Mode compact" show={showTooltip === 'minimalist'} />
          </div>
        )}

        {/* Séparateur */}
        {(onTogglePin || onToggleMinimalist) && onOpenConfig && (
          <div className="w-px h-6 bg-gray-200/70 mx-1" />
        )}

        {/* Settings */}
        {onOpenConfig && (
          <div className="relative">
            <button
              onClick={onOpenConfig}
              onMouseEnter={() => setShowTooltip('settings')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <Settings size={18} className="text-gray-600" />
            </button>
            <Tooltip text="Paramètres" show={showTooltip === 'settings'} />
          </div>
        )}

        {/* Séparateur avant window controls */}
        {(onMinimize || onMaximize || onClose) && (
          <div className="w-px h-6 bg-gray-200/70 mx-1" />
        )}

        {/* Window controls */}
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              title="Réduire"
            >
              <Minus size={14} className="text-gray-500" />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              title="Agrandir"
            >
              <Square size={12} className="text-gray-500" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-100 transition-colors group"
              title="Fermer"
            >
              <X size={14} className="text-gray-500 group-hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}