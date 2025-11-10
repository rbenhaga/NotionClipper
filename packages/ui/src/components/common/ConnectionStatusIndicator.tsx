// packages/ui/src/components/common/ConnectionStatusIndicator.tsx
// 🎯 Indicateur de statut de connexion avec informations de queue

import React, { useState } from 'react';
import { useTranslation } from '@notion-clipper/i18n';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import { Wifi, WifiOff, Clock, AlertCircle, ChevronDown } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  isOnline: boolean;
  pendingCount?: number;
  errorCount?: number;
  className?: string;
  onClick?: () => void;
}

export function ConnectionStatusIndicator({
  isOnline,
  pendingCount = 0,
  errorCount = 0,
  className = '',
  onClick
}: ConnectionStatusIndicatorProps) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'text-orange-600 dark:text-orange-400';
    if (errorCount > 0) return 'text-red-600 dark:text-red-400';
    if (pendingCount > 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStatusBg = () => {
    if (!isOnline) return 'bg-orange-50 dark:bg-orange-900/30 border-orange-200/60 dark:border-orange-700/60';
    if (errorCount > 0) return 'bg-red-50 dark:bg-red-900/30 border-red-200/60 dark:border-red-700/60';
    if (pendingCount > 0) return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200/60 dark:border-blue-700/60';
    return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-700/60';
  };

  const getStatusText = () => {
    if (!isOnline) return t('common.offline');
    if (errorCount > 0) return t('common.errors', { count: errorCount });
    if (pendingCount > 0) return `${pendingCount} ${t('common.pending')}`;
    return t('common.online');
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff size={12} className="text-orange-500" />;
    if (errorCount > 0) return <AlertCircle size={12} className="text-red-500" />;
    if (pendingCount > 0) return <Clock size={12} className="text-blue-500" />;
    return <Wifi size={12} className="text-green-500" />;
  };

  const getDotColor = () => {
    if (!isOnline) return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
    if (errorCount > 0) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (pendingCount > 0) return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
    return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
  };

  const getTooltipText = () => {
    if (!isOnline) return t('common.offlineQueueMessage');
    if (errorCount > 0) return t('common.errorsInQueue', { count: errorCount });
    if (pendingCount > 0) return t('common.elementsWaiting', { count: pendingCount });
    return t('common.connectedToNotion');
  };

  return (
    <div className={`relative ${className}`}>
      <MotionButton
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium
          border transition-all cursor-pointer hover:shadow-sm
          ${getStatusBg()}
          ${getStatusColor()}
        `}
        animate={{
          scale: isOnline ? [1, 1.02, 1] : 1
        }}
        transition={{
          duration: 2,
          repeat: isOnline ? Infinity : 0,
          repeatType: "reverse"
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className={`w-2 h-2 rounded-full ${getDotColor()}`} />
        <span>{getStatusText()}</span>
        
        {(pendingCount > 0 || errorCount > 0) && (
          <div className="flex items-center gap-1">
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
            
            {errorCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                {errorCount}
              </span>
            )}

            {onClick && <ChevronDown size={10} className="text-gray-400" />}
          </div>
        )}
      </MotionButton>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <MotionDiv
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-[10000]"
          >
            {getTooltipText()}
            {/* Flèche */}
            <div
              className="absolute w-2 h-2 bg-gray-900/95"
              style={{
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)'
              }}
            />
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}