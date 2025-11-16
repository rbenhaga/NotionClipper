// packages/ui/src/components/layout/Header.tsx
import { useState, useCallback, useEffect } from 'react';
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
  Target,
  Zap
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';
import { NotionClipperLogo } from '../../assets/icons';
import { ConnectionStatusIndicator } from '../common/ConnectionStatusIndicator';
import { SubscriptionTier, type QuotaSummary } from '@notion-clipper/core-shared';
import { PremiumBadge } from '../subscription/PremiumBadge';



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
  // 🎯 Props pour Focus Mode
  selectedPage?: any;
  // 🆕 Props pour Quota Display (FREE users)
  quotaSummary?: QuotaSummary | null;
  subscriptionTier?: SubscriptionTier;
  onUpgradeClick?: () => void;
  // 🆕 Quota check callbacks
  onFocusModeCheck?: () => Promise<{ canUse: boolean; quotaReached: boolean; remaining?: number }>;
  onCompactModeCheck?: () => Promise<{ canUse: boolean; quotaReached: boolean; remaining?: number }>;
  onQuotaExceeded?: (feature: string) => void;
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
  onStatusClick,
  // 🎯 Focus Mode
  selectedPage,
  // 🆕 Quota props
  quotaSummary,
  subscriptionTier,
  onUpgradeClick,
  onFocusModeCheck,
  onCompactModeCheck,
  onQuotaExceeded
}: HeaderProps) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // 🎯 Hook Focus Mode - Version simplifiée sans IPC
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);

  // Handler pour toggle le Mode Focus
  const handleFocusModeToggle = useCallback(async (page: any) => {
    if (!page) {
      console.log('Aucune page sélectionnée pour le Mode Focus');
      return;
    }

    try {
      if (focusModeEnabled) {
        // Désactiver le focus mode
        console.log('[Header] Disabling focus mode...');
        const result = await window.electronAPI?.invoke?.('focus-mode:disable');
        if (result?.success) {
          setFocusModeEnabled(false);
          console.log('[Header] ✅ Focus mode disabled');
        } else {
          console.error('[Header] ❌ Failed to disable focus mode:', result);
        }
      } else {
        // 🆕 Quota check avant activation
        if (onFocusModeCheck) {
          const quotaResult = await onFocusModeCheck();
          if (!quotaResult.canUse) {
            console.log('[Header] ❌ Focus Mode quota reached');
            if (quotaResult.quotaReached && onQuotaExceeded) {
              onQuotaExceeded('focus_mode_time');
            }
            return; // Bloquer l'activation
          }
        }

        // Activer le focus mode
        console.log('[Header] Enabling focus mode for page:', page.title);
        const result = await window.electronAPI?.invoke?.('focus-mode:enable', page);
        if (result?.success) {
          setFocusModeEnabled(true);
          console.log('[Header] ✅ Focus mode enabled');
        } else {
          console.error('[Header] ❌ Failed to enable focus mode:', result);
        }
      }
    } catch (error) {
      console.error('[Header] Focus mode toggle error:', error);
    }
  }, [focusModeEnabled, onFocusModeCheck, onQuotaExceeded]);

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

  // MODE COMPACT - Remplacer la section complète
  if (isMinimalist) {
    return (
      <div className="h-12 bg-white dark:bg-[#202020] border-b border-gray-200/70 dark:border-gray-800/70 flex items-center justify-between px-4 drag-region relative app-header">
        {/* Gauche - Logo + Nom + Status */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <NotionClipperLogo size={22} />
        </div>

        {/* 🔧 FIX: Droite - TOUS les contrôles de fenêtre en mode compact */}
        <div className="flex items-center gap-1">
          {/* Bouton retour mode normal */}
          {onToggleMinimalist && (
            <button
              onClick={onToggleMinimalist}
              onMouseEnter={() => setShowTooltip('expand')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative"
            >
              <Maximize size={14} />
              <Tooltip text={t('common.normalMode')} show={showTooltip === 'expand'} />
            </button>
          )}

          {/* Pin */}
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              onMouseEnter={() => setShowTooltip('pin')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`no-drag w-8 h-8 flex items-center justify-center rounded-lg transition-all relative ${isPinned
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {isPinned ? <Pin size={14} className="fill-current" /> : <PinOff size={14} />}
              <Tooltip
                text={isPinned ? t('common.unpin') : t('common.pin')}
                show={showTooltip === 'pin'}
              />
            </button>
          )}

          {/* 🔧 FIX: Séparateur avant window controls */}
          {(onMinimize || onClose) && (
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          )}

          {/* 🔧 FIX: Window controls compacts - TOUS affichés */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              onMouseEnter={() => setShowTooltip('minimize')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative"
              title={t('common.minimize')}
            >
              <Minus size={12} className="text-gray-500 dark:text-gray-400" />
              <Tooltip text={t('common.minimize')} show={showTooltip === 'minimize'} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              onMouseEnter={() => setShowTooltip('close')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all group relative"
              title={t('common.close')}
            >
              <X size={12} className="text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
              <Tooltip text={t('common.close')} show={showTooltip === 'close'} />
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

        {/* 🆕 Quota Display for FREE users */}
        {subscriptionTier === SubscriptionTier.FREE && quotaSummary && (
          <>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <button
              onClick={onUpgradeClick}
              onMouseEnter={() => setShowTooltip('quota')}
              onMouseLeave={() => setShowTooltip(null)}
              className="no-drag flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all relative group"
            >
              <Zap size={14} className="text-purple-600 dark:text-purple-400" />
              <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                {quotaSummary.clips.used}/{quotaSummary.clips.limit} clips
              </span>
              <Tooltip text="Passer à Premium pour des clips illimités" show={showTooltip === 'quota'} />
            </button>
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
              text={sidebarCollapsed ? t('common.showPages') : t('common.hidePages')}
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
              text={isPinned ? t('common.unpin') : t('common.pin')}
              show={showTooltip === 'pin'}
            />
          </button>
        )}

        {/* Mode Minimaliste */}
        {onToggleMinimalist && (
          <button
            onClick={async () => {
              // 🆕 Quota check avant activation
              if (onCompactModeCheck && !isMinimalist) {
                const quotaResult = await onCompactModeCheck();
                if (!quotaResult.canUse) {
                  console.log('[Header] ❌ Compact Mode quota reached');
                  if (quotaResult.quotaReached && onQuotaExceeded) {
                    onQuotaExceeded('compact_mode_time');
                  }
                  return; // Bloquer l'activation
                }
              }
              onToggleMinimalist();
            }}
            onMouseEnter={() => setShowTooltip('minimalist')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative"
          >
            <Minimize size={18} />
            {subscriptionTier === SubscriptionTier.FREE && (
              <div className="absolute -top-1 -right-1">
                <PremiumBadge variant="minimal" icon="none" label="" />
              </div>
            )}
            <Tooltip text={t('common.compactMode')} show={showTooltip === 'minimalist'} />
          </button>
        )}

        {/* 🎯 FOCUS MODE BUTTON - Toujours visible et cliquable */}
        <button
          onClick={() => handleFocusModeToggle(selectedPage)}
          onMouseEnter={() => setShowTooltip('focus')}
          onMouseLeave={() => setShowTooltip(null)}
          disabled={false}
          className={`no-drag w-9 h-9 flex items-center justify-center rounded-lg transition-all relative ${
            focusModeEnabled
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Target size={18} />
          {subscriptionTier === SubscriptionTier.FREE && (
            <div className="absolute -top-1 -right-1">
              <PremiumBadge variant="minimal" icon="none" label="" />
            </div>
          )}
          <Tooltip
            text={
              !selectedPage
                ? t('common.selectPageToActivateFocusMode')
                : focusModeEnabled
                ? t('common.deactivateFocusMode')
                : t('common.activateFocusMode')
            }
            show={showTooltip === 'focus'}
          />
        </button>

        {/* Séparateur */}
        {(onTogglePin || onToggleMinimalist || selectedPage) && onOpenConfig && (
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
            <Tooltip text={t('common.settings')} show={showTooltip === 'settings'} />
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
              title={t('common.minimize')}
            >
              <Minus size={15} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title={t('common.maximize')}
            >
              <Square size={13} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all group"
              title={t('common.close')}
            >
              <X size={15} className="text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
