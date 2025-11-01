// packages/ui/src/components/layout/Header.tsx
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton } from '../common/MotionWrapper';
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Minus,
  Square,
  X,
  Pin,
  PinOff,
  Minimize,
  Maximize
} from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';
import { ConnectionStatusIndicator } from '../common/ConnectionStatusIndicator';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenConfig?: () => void;
  sidebarCollapsed?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isConnected?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isMinimalist?: boolean;
  onToggleMinimalist?: () => void;
  // 🆕 Props pour l'indicateur de statut amélioré
  pendingCount?: number;
  errorCount?: number;
  onStatusClick?: () => void;
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
  onToggleMinimalist,
  // 🆕 Nouvelles props
  pendingCount = 0,
  errorCount = 0,
  onStatusClick
}: HeaderProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Tooltip - Design Notion/Apple épuré et élégant
  const Tooltip = ({ text, show }: { text: string; show: boolean }) => {
    if (!show) return null;

    return (
      <div
        className="absolute px-3 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-[10000]"
        style={{
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px'
        }}
      >
        {text}
        {/* Flèche simple pointant vers le bouton */}
        <div
          className="absolute w-2 h-2 bg-gray-900/95"
          style={{
            top: '-4px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)'
          }}
        />
      </div>
    );
  };

  // MODE COMPACT
  if (isMinimalist) {
    return (
      <div className="h-12 bg-white dark:bg-[#202020] border-b border-gray-200/70 dark:border-gray-800/70 flex items-center justify-between px-4 drag-region relative app-header">
        {/* Gauche - Logo + Nom + Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <NotionClipperLogo size={22} />

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate">
              Notion Clipper
            </span>

            {/* 🆕 Status connexion amélioré */}
            {isConnected !== undefined && (
              <ConnectionStatusIndicator
                isOnline={isConnected}
                pendingCount={pendingCount}
                errorCount={errorCount}
                onClick={onStatusClick}
                className="text-[10px]"
              />
            )}
          </div>
        </div>

        {/* Droite - Actions */}
        <div className="flex items-center gap-1">
          {/* Pin */}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              onMouseEnter={() => setShowTooltip('pin')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`
                no-drag w-8 h-8 flex items-center justify-center rounded-lg transition-all relative
                ${isPinned
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Pin size={15} className={isPinned ? 'fill-current' : ''} />
              <Tooltip text={isPinned ? 'Désépingler' : 'Épingler'} show={showTooltip === 'pin'} />
            </button>
          )}

          {/* Mode Normal */}
          {onToggleMinimalist && (
            <button
              onClick={onToggleMinimalist}
              onMouseEnter={() => setShowTooltip('expand')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all relative"
            >
              <Maximize size={15} />
              <Tooltip text="Mode normal" show={showTooltip === 'expand'} />
            </button>
          )}

          {/* Séparateur */}
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all group"
            >
              <X size={15} className="text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // MODE NORMAL - Style Notion complet
  return (
    <div className="h-14 bg-white dark:bg-[#202020] border-b border-gray-200/70 dark:border-gray-800/70 flex items-center justify-between px-5 drag-region relative app-header">
      {/* Gauche - Logo + Status */}
      <div className="flex items-center gap-4">
        {/* Logo + Nom */}
        <div className="flex items-center gap-3 select-none">
          <NotionClipperLogo size={26} />
          <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Notion Clipper Pro
          </span>
        </div>

        {/* 🆕 Status connexion avec queue info */}
        {isConnected !== undefined && (
          <>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <ConnectionStatusIndicator
              isOnline={isConnected}
              pendingCount={pendingCount}
              errorCount={errorCount}
              onClick={onStatusClick}
            />
          </>
        )}
      </div>

      {/* Droite - Actions et contrôles */}
      <div className="flex items-center gap-1.5">
        {/* Toggle Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            onMouseEnter={() => setShowTooltip('sidebar')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <Tooltip
              text={sidebarCollapsed ? 'Afficher les pages' : 'Masquer les pages'}
              show={showTooltip === 'sidebar'}
            />
          </button>
        )}

        {/* Séparateur */}
        {onToggleSidebar && (onTogglePin || onToggleMinimalist || onOpenConfig) && (
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
        )}

        {/* Pin */}
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            onMouseEnter={() => setShowTooltip('pin')}
            onMouseLeave={() => setShowTooltip(null)}
            className={`
              no-drag w-9 h-9 flex items-center justify-center rounded-lg transition-all relative
              ${isPinned
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            {isPinned ? <Pin size={18} className="fill-current" /> : <PinOff size={18} />}
            <Tooltip
              text={isPinned ? 'Désépingler' : 'Épingler au premier plan'}
              show={showTooltip === 'pin'}
            />
          </button>
        )}

        {/* Mode Minimaliste */}
        {onToggleMinimalist && (
          <button
            onClick={onToggleMinimalist}
            onMouseEnter={() => setShowTooltip('minimalist')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative"
          >
            <Minimize size={18} />
            <Tooltip text="Mode compact" show={showTooltip === 'minimalist'} />
          </button>
        )}

        {/* Séparateur */}
        {(onTogglePin || onToggleMinimalist) && onOpenConfig && (
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
        )}

        {/* Settings */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            onMouseEnter={() => setShowTooltip('settings')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative"
          >
            <Settings size={18} className="text-gray-600 dark:text-gray-400" />
            <Tooltip text="Paramètres" show={showTooltip === 'settings'} />
          </button>
        )}

        {/* Séparateur avant window controls */}
        {(onMinimize || onMaximize || onClose) && (
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
        )}

        {/* Window controls - macOS style */}
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title="Réduire"
            >
              <Minus size={15} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title="Agrandir"
            >
              <Square size={13} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all group"
              title="Fermer"
            >
              <X size={15} className="text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
