/**
 * OfflineBanner - Bannière visible quand l'utilisateur est hors ligne
 * 
 * Affiche un message clair avec le nombre d'éléments en attente
 * et un bouton pour forcer la vérification de connexion.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { MotionDiv } from './MotionWrapper';
import { useTranslation } from '@notion-clipper/i18n';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  errorCount?: number;
  onRetryConnection?: () => void;
  onViewQueue?: () => void;
  isRetrying?: boolean;
  subscriptionTier?: string;
  className?: string;
}

export function OfflineBanner({
  isOnline,
  pendingCount,
  errorCount = 0,
  onRetryConnection,
  onViewQueue,
  isRetrying = false,
  subscriptionTier,
  className = '',
}: OfflineBannerProps) {
  const { t } = useTranslation();

  // Ne rien afficher si en ligne et pas d'éléments en attente
  if (isOnline && pendingCount === 0 && errorCount === 0) {
    return null;
  }

  const isFreeUser = subscriptionTier === 'FREE';

  return (
    <AnimatePresence>
      {(!isOnline || pendingCount > 0 || errorCount > 0) && (
        <MotionDiv
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`overflow-hidden ${className}`}
        >
          <div
            className={`
              flex items-center justify-between px-4 py-2.5
              ${!isOnline 
                ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-orange-200 dark:border-orange-800' 
                : errorCount > 0
                  ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-red-200 dark:border-red-800'
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800'
              }
            `}
          >
            {/* Icône et message */}
            <div className="flex items-center gap-3">
              {!isOnline ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40">
                  <WifiOff size={16} className="text-orange-600 dark:text-orange-400" />
                </div>
              ) : errorCount > 0 ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
              )}

              <div className="flex flex-col">
                <span className={`text-sm font-medium ${
                  !isOnline 
                    ? 'text-orange-800 dark:text-orange-200' 
                    : errorCount > 0
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-blue-800 dark:text-blue-200'
                }`}>
                  {!isOnline 
                    ? t('common.offline')
                    : errorCount > 0
                      ? `${errorCount} ${t('common.errors')}`
                      : `${pendingCount} ${t('common.pending')}`
                  }
                </span>
                
                <span className={`text-xs ${
                  !isOnline 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : errorCount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {!isOnline 
                    ? isFreeUser
                      ? 'Mode offline réservé aux utilisateurs Premium'
                      : pendingCount > 0 
                        ? `${pendingCount} clip(s) en attente - envoi automatique à la reconnexion`
                        : 'Vos clips seront envoyés à la reconnexion'
                    : errorCount > 0
                      ? 'Certains envois ont échoué'
                      : 'Envoi en cours...'
                  }
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Bouton voir la queue */}
              {(pendingCount > 0 || errorCount > 0) && onViewQueue && (
                <button
                  onClick={onViewQueue}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                    ${!isOnline 
                      ? 'text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40' 
                      : errorCount > 0
                        ? 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
                        : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                    }
                  `}
                >
                  Voir la file
                </button>
              )}

              {/* Bouton retry connexion */}
              {!isOnline && onRetryConnection && (
                <button
                  onClick={onRetryConnection}
                  disabled={isRetrying}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                    bg-orange-600 hover:bg-orange-700 text-white
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <RefreshCw 
                    size={12} 
                    className={isRetrying ? 'animate-spin' : ''} 
                  />
                  {isRetrying ? 'Vérification...' : 'Réessayer'}
                </button>
              )}
            </div>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export default OfflineBanner;
