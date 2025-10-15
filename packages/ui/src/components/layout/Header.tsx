// packages/ui/src/components/layout/Header.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Maximize,
  ListChecks,
  Clock,
  Paperclip
} from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';
import { ActionBar } from './ActionBar';

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
  // 🆕 Dynamic Island props
  queueCount?: number;
  historyCount?: number;
  sendingStatus?: 'idle' | 'processing' | 'success' | 'error';
  onOpenHistory?: () => void;
  onOpenQueue?: () => void;
  onOpenFileUpload?: () => void;
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
  // 🆕 Dynamic Island props
  queueCount = 0,
  historyCount = 0,
  sendingStatus = 'idle',
  onOpenHistory,
  onOpenQueue,
  onOpenFileUpload
}: HeaderProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // ActionBar actions - Pas de bouton envoyer
  const actionBarActions = [
    {
      id: 'upload',
      label: 'Uploader un fichier',
      icon: <Paperclip size={18} />,
      onClick: () => onOpenFileUpload?.(),
      disabled: !onOpenFileUpload,
      color: 'default' as const
    },
    {
      id: 'queue',
      label: 'File d\'attente',
      icon: <ListChecks size={18} />,
      onClick: () => onOpenQueue?.(),
      badge: queueCount > 0 ? queueCount : undefined,
      disabled: !onOpenQueue,
      color: 'warning' as const
    },
    {
      id: 'history',
      label: 'Historique',
      icon: <Clock size={18} />,
      onClick: () => onOpenHistory?.(),
      badge: historyCount > 0 ? historyCount : undefined,
      disabled: !onOpenHistory,
      color: 'default' as const
    }
  ];

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
      <div className="h-12 bg-white border-b border-gray-200/70 flex items-center justify-between px-4 drag-region relative app-header
                      sm:px-4 max-sm:px-2">
        {/* Gauche - Logo + Nom + Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <NotionClipperLogo size={22} />

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm font-semibold text-gray-900 tracking-tight truncate">
              Notion Clipper
            </span>

            {/* Status connexion - Badge élégant */}
            {isConnected && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  ON
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Droite - Actions */}
        <div className="flex items-center gap-1 max-sm:gap-0.5">
          {/* Pin */}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              onMouseEnter={() => setShowTooltip('pin')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`
                no-drag w-8 h-8 flex items-center justify-center rounded-lg transition-all relative
                ${isPinned
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
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
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all relative"
            >
              <Maximize size={15} />
              <Tooltip text="Mode normal" show={showTooltip === 'expand'} />
            </button>
          )}

          {/* Séparateur */}
          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all group"
            >
              <X size={15} className="text-gray-500 group-hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // MODE NORMAL - Style Notion complet
  return (
    <div className="h-14 bg-white border-b border-gray-200/70 flex items-center justify-between px-5 drag-region relative app-header
                    sm:px-5 max-sm:px-3 max-sm:h-12">
      {/* Gauche - Logo + Status */}
      <div className="flex items-center gap-4">
        {/* Logo + Nom */}
        <div className="flex items-center gap-3 select-none max-sm:gap-2">
          <NotionClipperLogo size={26} className="max-sm:w-5 max-sm:h-5" />
          <span className="text-[15px] font-semibold text-gray-900 tracking-tight max-sm:text-sm max-sm:hidden">
            Notion Clipper Pro
          </span>
          <span className="text-[15px] font-semibold text-gray-900 tracking-tight max-sm:text-sm sm:hidden">
            Clipper
          </span>
        </div>

        {/* Status connexion */}
        {isConnected !== undefined && (
          <>
            <div className="w-px h-6 bg-gray-200" />
            <motion.div
              className={`
                flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium
                border transition-all
                ${isConnected
                  ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                  : 'bg-gray-50 border-gray-200/60 text-gray-600'
                }
              `}
              animate={{
                scale: isConnected ? [1, 1.02, 1] : 1
              }}
              transition={{
                duration: 2,
                repeat: isConnected ? Infinity : 0,
                repeatType: "reverse"
              }}
            >
              <div className={`
                w-2 h-2 rounded-full
                ${isConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                  : 'bg-gray-400'
                }
              `} />
              <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
            </motion.div>
          </>
        )}
      </div>

      {/* Centre - Action Bar (Style Notion/Apple) */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 no-drag">
        <ActionBar
          actions={actionBarActions}
          status={sendingStatus}
        />
      </div>

      {/* Droite - Actions et contrôles */}
      <div className="flex items-center gap-1.5 max-sm:gap-1">
        {/* Toggle Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            onMouseEnter={() => setShowTooltip('sidebar')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-all relative"
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
          <div className="w-px h-6 bg-gray-200 mx-1" />
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
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
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
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-all relative"
          >
            <Minimize size={18} />
            <Tooltip text="Mode compact" show={showTooltip === 'minimalist'} />
          </button>
        )}

        {/* Séparateur */}
        {(onTogglePin || onToggleMinimalist) && onOpenConfig && (
          <div className="w-px h-6 bg-gray-200 mx-1" />
        )}

        {/* Settings */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            onMouseEnter={() => setShowTooltip('settings')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all relative"
          >
            <Settings size={18} className="text-gray-600" />
            <Tooltip text="Paramètres" show={showTooltip === 'settings'} />
          </button>
        )}

        {/* Séparateur avant window controls */}
        {(onMinimize || onMaximize || onClose) && (
          <div className="w-px h-6 bg-gray-200 mx-1" />
        )}

        {/* Window controls - macOS style */}
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
              title="Réduire"
            >
              <Minus size={15} className="text-gray-500" />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
              title="Agrandir"
            >
              <Square size={13} className="text-gray-500" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all group"
              title="Fermer"
            >
              <X size={15} className="text-gray-500 group-hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

