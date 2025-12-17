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
  ClipboardPaste
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';
import { ClipperProLogo } from '../../assets/icons';
import { SubscriptionTier, type QuotaSummary } from '@notion-clipper/core-shared';



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
  onRefreshQuotas?: () => Promise<void>;
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
  onQuotaExceeded,
  onRefreshQuotas
}: HeaderProps) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // 🔍 Debug: Log quota data when it changes
  useEffect(() => {
    if (quotaSummary) {
      console.log('[Header] 📊 Quota data received:', {
        clips: `${quotaSummary.clips.used}/${quotaSummary.clips.limit}`,
        files: `${quotaSummary.files.used}/${quotaSummary.files.limit}`,
        focus: `${quotaSummary.focus_mode_minutes.used}/${quotaSummary.focus_mode_minutes.limit} min`,
        compact: `${quotaSummary.compact_mode_minutes.used}/${quotaSummary.compact_mode_minutes.limit} min`,
      });
    }
  }, [quotaSummary]);

  // 🔄 Rafraîchir les quotas au montage et périodiquement (toutes les 30 secondes)
  useEffect(() => {
    if (!isMinimalist && onRefreshQuotas) {
      console.log('[Header] 🔄 Refreshing quotas on mount...');
      onRefreshQuotas();

      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(() => {
        console.log('[Header] 🔄 Periodic quota refresh...');
        onRefreshQuotas();
      }, 30000);

      // Rafraîchir quand la fenêtre reprend le focus
      const handleFocus = () => {
        console.log('[Header] 🔄 Window focus - refreshing quotas...');
        onRefreshQuotas();
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isMinimalist, onRefreshQuotas]);

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
              onQuotaExceeded('focus_mode_minutes');
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

  // MODE COMPACT - Design épuré avec tooltips visibles
  if (isMinimalist) {
    return (
      <div className="h-10 bg-white dark:bg-[#191919] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-2.5 drag-region app-header relative">
        
        {/* Gauche - Logo compact */}
        <div className="flex items-center gap-1.5 min-w-0">
          <ClipperProLogo size={18} />
          <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">Clipper Pro</span>
        </div>

        {/* Droite - Contrôles compacts */}
        <div className="flex items-center gap-0.5">
          {/* Bouton retour mode normal */}
          {onToggleMinimalist && (
            <div className="relative">
              <button
                onClick={onToggleMinimalist}
                onMouseEnter={() => setShowTooltip('expand')}
                onMouseLeave={() => setShowTooltip(null)}
                className="no-drag w-6 h-6 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
              >
                <Maximize size={12} />
              </button>
              <Tooltip text={t('common.normalMode')} show={showTooltip === 'expand'} />
            </div>
          )}

          {/* Pin */}
          {onTogglePin && (
            <div className="relative">
              <button
                onClick={onTogglePin}
                onMouseEnter={() => setShowTooltip('pin-compact')}
                onMouseLeave={() => setShowTooltip(null)}
                className={`no-drag w-6 h-6 flex items-center justify-center rounded transition-all ${isPinned
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {isPinned ? <Pin size={12} className="fill-current" /> : <PinOff size={12} />}
              </button>
              <Tooltip text={isPinned ? t('common.unpin') : t('common.pin')} show={showTooltip === 'pin-compact'} />
            </div>
          )}

          {/* Séparateur */}
          {(onMinimize || onClose) && (
            <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
          )}

          {/* Window controls */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="no-drag w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              title={t('common.minimize')}
            >
              <Minus size={10} className="text-gray-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-all group"
              title={t('common.close')}
            >
              <X size={10} className="text-gray-400 group-hover:text-red-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // MODE NORMAL - Design System unifié
  return (
    <div className="h-14 bg-[var(--ds-bg)] border-b border-[var(--ds-border)] flex items-center justify-between px-5 drag-region relative app-header">
      
      {/* Gauche - Logo + Status */}
      <div className="flex items-center gap-4">
        {/* Logo + Nom + Indicateur de statut amélioré */}
        <div 
          className="flex items-center gap-2.5 select-none cursor-pointer group"
          onClick={onStatusClick}
          onMouseEnter={() => setShowTooltip('connection')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {/* Logo */}
          <ClipperProLogo size={26} />
          {/* Nom */}
          <span className="text-[15px] font-semibold text-[var(--ds-fg)] tracking-tight group-hover:opacity-80 transition-opacity">
            Clipper Pro
          </span>
          {/* Status badge - Plus explicite */}
          <div className={`
            flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
            ${isConnected 
              ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success)]' 
              : 'bg-[var(--ds-bg-muted)] text-[var(--ds-fg-subtle)]'
            }
          `}>
            <span 
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-[var(--ds-success)]' : 'bg-[var(--ds-fg-subtle)]'
              }`}
            />
            <span>{isConnected ? 'Sync OK' : 'Offline'}</span>
          </div>
          {/* Tooltip */}
          <Tooltip 
            text={isConnected ? t('common.connectedToNotion') : t('common.offline')} 
            show={showTooltip === 'connection'} 
          />
        </div>

        {/* 🆕 Quota Display for FREE users */}
        {subscriptionTier === SubscriptionTier.FREE && quotaSummary && (
          <>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <button
              onClick={onUpgradeClick}
              onMouseEnter={() => setShowTooltip('quota')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`no-drag flex items-center gap-2 px-3 py-1.5 rounded-full transition-all relative border ${
                quotaSummary.clips.percentage >= 80
                  ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700 hover:border-orange-300 hover:shadow-sm'
                  : 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 hover:border-violet-300 hover:shadow-sm'
              }`}
            >
              <ClipboardPaste size={12} className={`${
                quotaSummary.clips.percentage >= 80 
                  ? 'text-orange-500' 
                  : 'text-violet-500'
              }`} />
              <span className={`text-[11px] font-bold ${
                quotaSummary.clips.percentage >= 80
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-violet-700 dark:text-violet-300'
              }`}>
                {quotaSummary.clips.remaining} clips
              </span>
              <Tooltip text="Passer à Pro+" show={showTooltip === 'quota'} />
            </button>
          </>
        )}
      </div>

      {/* Droite - Actions et contrôles */}
      <div className="flex items-center gap-1">
        {/* Toggle Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            onMouseEnter={() => setShowTooltip('sidebar')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag ds-btn ds-btn-ghost ds-btn-icon"
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
          <div className="w-px h-5 bg-[var(--ds-border)] mx-1" />
        )}

        {/* Pin */}
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            onMouseEnter={() => setShowTooltip('pin')}
            onMouseLeave={() => setShowTooltip(null)}
            className={`
              no-drag ds-btn ds-btn-icon
              ${isPinned
                ? 'bg-[var(--ds-primary-subtle)] text-[var(--ds-primary)]'
                : 'ds-btn-ghost'
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
              if (onCompactModeCheck && !isMinimalist) {
                const quotaResult = await onCompactModeCheck();
                if (!quotaResult.canUse) {
                  console.log('[Header] ❌ Compact Mode quota reached - showing upgrade modal');
                  if (quotaResult.quotaReached && onQuotaExceeded) {
                    onQuotaExceeded('compact_mode_minutes');
                  }
                  return;
                }
              }
              onToggleMinimalist();
            }}
            onMouseEnter={() => setShowTooltip('minimalist')}
            onMouseLeave={() => setShowTooltip(null)}
            className={`
              no-drag ds-btn ds-btn-icon
              ${subscriptionTier === SubscriptionTier.FREE &&
                quotaSummary?.compact_mode_minutes &&
                !quotaSummary.compact_mode_minutes.can_use
                  ? 'opacity-50'
                  : 'ds-btn-ghost'
              }
            `}
          >
            <Minimize size={18} />
            <Tooltip
              text={
                subscriptionTier === SubscriptionTier.FREE &&
                quotaSummary?.compact_mode_minutes &&
                !quotaSummary.compact_mode_minutes.can_use
                  ? '🔒 Quota atteint (60min/mois)'
                  : t('common.compactMode')
              }
              show={showTooltip === 'minimalist'}
            />
          </button>
        )}

        {/* 🎯 FOCUS MODE BUTTON */}
        <button
          onClick={() => handleFocusModeToggle(selectedPage)}
          onMouseEnter={() => setShowTooltip('focus')}
          onMouseLeave={() => setShowTooltip(null)}
          className={`
            no-drag ds-btn ds-btn-icon
            ${focusModeEnabled
              ? 'bg-[var(--ds-primary-subtle)] text-[var(--ds-primary)]'
              : subscriptionTier === SubscriptionTier.FREE &&
                quotaSummary?.focus_mode_minutes &&
                !quotaSummary.focus_mode_minutes.can_use
              ? 'opacity-50'
              : 'ds-btn-ghost'
            }
          `}
        >
          <Target size={18} />
          <Tooltip
            text={
              !selectedPage
                ? t('common.selectPageToActivateFocusMode')
                : subscriptionTier === SubscriptionTier.FREE &&
                  quotaSummary?.focus_mode_minutes &&
                  !quotaSummary.focus_mode_minutes.can_use
                ? '🔒 Quota atteint (60min/mois)'
                : focusModeEnabled
                ? t('common.deactivateFocusMode')
                : t('common.activateFocusMode')
            }
            show={showTooltip === 'focus'}
          />
        </button>

        {/* Séparateur */}
        {(onTogglePin || onToggleMinimalist || selectedPage) && onOpenConfig && (
          <div className="w-px h-6 bg-[var(--ds-border)] mx-1" />
        )}

        {/* Settings */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            onMouseEnter={() => setShowTooltip('settings')}
            onMouseLeave={() => setShowTooltip(null)}
            className="no-drag ds-btn ds-btn-ghost ds-btn-icon"
          >
            <Settings size={18} />
            <Tooltip text={t('common.settings')} show={showTooltip === 'settings'} />
          </button>
        )}

        {/* Séparateur avant window controls */}
        {(onMinimize || onMaximize || onClose) && (
          <div className="w-px h-6 bg-[var(--ds-border)] mx-1" />
        )}

        {/* Window controls */}
        <div className="flex items-center gap-0.5">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="no-drag ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"
              title={t('common.minimize')}
            >
              <Minus size={14} />
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="no-drag ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"
              title={t('common.maximize')}
            >
              <Square size={12} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="no-drag ds-btn ds-btn-icon ds-btn-sm hover:bg-[var(--ds-error-subtle)] hover:text-[var(--ds-error)]"
              title={t('common.close')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
