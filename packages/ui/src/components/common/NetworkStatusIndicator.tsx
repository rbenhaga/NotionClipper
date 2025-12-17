/**
 * NetworkStatusIndicator - Visual indicator for network connectivity
 * 
 * Shows a subtle indicator when offline with option to retry connection.
 * Designed to be non-intrusive but clearly visible.
 */

import React, { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { MotionDiv } from './MotionWrapper';
import { useTranslation } from '@notion-clipper/i18n';

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  lastChecked?: number;
  onForceCheck?: () => void;
  pendingCount?: number;
  variant?: 'minimal' | 'compact' | 'full';
  className?: string;
}

export function NetworkStatusIndicator({
  isOnline,
  lastChecked,
  onForceCheck,
  pendingCount = 0,
  variant = 'compact',
  className = '',
}: NetworkStatusIndicatorProps) {
  const { t } = useTranslation();

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onForceCheck?.();
  }, [onForceCheck]);

  // Format last checked time
  const formatLastChecked = useCallback(() => {
    if (!lastChecked) return '';
    const seconds = Math.floor((Date.now() - lastChecked) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }, [lastChecked]);

  // Minimal variant - just an icon
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center ${className}`}>
        <AnimatePresence mode="wait">
          {isOnline ? (
            <MotionDiv
              key="online"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-green-500 dark:text-green-400"
            >
              <Wifi size={14} strokeWidth={2} />
            </MotionDiv>
          ) : (
            <MotionDiv
              key="offline"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-orange-500 dark:text-orange-400"
            >
              <WifiOff size={14} strokeWidth={2} />
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Compact variant - icon with optional pending count
  if (variant === 'compact') {
    return (
      <AnimatePresence>
        {!isOnline && (
          <MotionDiv
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-orange-100 dark:bg-orange-900/30
              border border-orange-200 dark:border-orange-800
              ${className}
            `}
          >
            <CloudOff size={14} className="text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
              {t('common.offline')}
            </span>
            {pendingCount > 0 && (
              <span className="text-xs text-orange-600 dark:text-orange-400">
                ({pendingCount})
              </span>
            )}
            {onForceCheck && (
              <button
                onClick={handleRetry}
                className="p-0.5 hover:bg-orange-200 dark:hover:bg-orange-800/50 rounded transition-colors"
                title={t('common.retry')}
              >
                <RefreshCw size={12} className="text-orange-600 dark:text-orange-400" />
              </button>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    );
  }

  // Full variant - detailed status bar
  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`
          flex items-center justify-between px-4 py-2
          ${isOnline 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }
          border-b
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Cloud size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {t('common.online')}
              </span>
            </>
          ) : (
            <>
              <CloudOff size={16} className="text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                {t('common.offline')}
              </span>
              {pendingCount > 0 && (
                <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">
                  {t('common.elementsWaiting', { count: pendingCount }) || `${pendingCount} en attente`}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatLastChecked()}
            </span>
          )}
          {onForceCheck && (
            <button
              onClick={handleRetry}
              className={`
                p-1.5 rounded-md transition-colors
                ${isOnline 
                  ? 'hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400' 
                  : 'hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                }
              `}
              title={t('common.retry')}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </MotionDiv>
    </AnimatePresence>
  );
}

export default NetworkStatusIndicator;
