// packages/ui/src/components/common/ConnectionStatus.tsx
// 🎯 Indicateur de statut de connexion avec queue unifiée

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import { Wifi, WifiOff, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { UnifiedQueueHistory, type UnifiedEntry } from '../unified/UnifiedQueueHistory';

interface ConnectionStatusProps {
  isOnline: boolean;
  entries: UnifiedEntry[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onClear?: () => void;
  className?: string;
}

export function ConnectionStatus({
  isOnline,
  entries,
  onRetry,
  onDelete,
  onClear,
  className = ''
}: ConnectionStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Statistiques
  const pendingCount = entries.filter(e => e.status === 'pending' || e.status === 'offline').length;
  const errorCount = entries.filter(e => e.status === 'error').length;
  const hasActivity = entries.length > 0;

  // Couleur du statut
  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (errorCount > 0) return 'text-orange-500';
    if (pendingCount > 0) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Hors ligne';
    if (errorCount > 0) return `${errorCount} erreur${errorCount > 1 ? 's' : ''}`;
    if (pendingCount > 0) return `${pendingCount} en attente`;
    return 'En ligne';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff size={14} className="text-red-500" />;
    if (errorCount > 0) return <AlertCircle size={14} className="text-orange-500" />;
    if (pendingCount > 0) return <Clock size={14} className="text-blue-500" />;
    return <Wifi size={14} className="text-green-500" />;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Indicateur principal */}
      <MotionButton
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${hasActivity 
            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {getStatusIcon()}
        
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>

        {hasActivity && (
          <div className="flex items-center gap-1">
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
            
            {errorCount > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                {errorCount}
              </span>
            )}

            {isExpanded ? (
              <ChevronUp size={12} className="text-gray-400" />
            ) : (
              <ChevronDown size={12} className="text-gray-400" />
            )}
          </div>
        )}
      </MotionButton>

      {/* Panel étendu */}
      <AnimatePresence>
        {isExpanded && hasActivity && (
          <MotionDiv
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Activité récente
                </h3>
                
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <ChevronUp size={16} />
                </button>
              </div>

              <UnifiedQueueHistory
                entries={entries.slice(0, 5)} // Limiter à 5 entrées récentes
                onRetry={onRetry}
                onDelete={onDelete}
                onClear={onClear}
                isOnline={isOnline}
              />

              {entries.length > 5 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Et {entries.length - 5} autre{entries.length - 5 > 1 ? 's' : ''} élément{entries.length - 5 > 1 ? 's' : ''}...
                  </p>
                </div>
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}