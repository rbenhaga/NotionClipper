/**
 * Quota Counter Component
 *
 * Affiche les quotas d'usage de manière subtile et élégante (style Apple)
 *
 * Design Philosophy:
 * - Information présente mais non intrusive
 * - Animations fluides et naturelles
 * - Couleurs sémantiques (vert/orange/rouge)
 * - Progress bar minimaliste
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Image,
  Clock,
  Focus,
  Minimize2,
  TrendingUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { QuotaUsage, QuotaSummary } from '@notion-clipper/core-shared/src/types/subscription.types';
import { FeatureType, UI_CONFIG } from '@notion-clipper/core-shared';

/**
 * 🆕 Countdown Component - Affiche le temps restant avant reset quotas
 * Format: "Xj Yh" ou "Xh Ym" selon le temps restant
 */
interface CountdownProps {
  targetDate: string; // ISO date string (period_end from quotaSummary)
  compact?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ targetDate, compact = false }) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      return { days, hours, minutes };
    };

    // Calcul initial
    setTimeRemaining(calculateTimeRemaining());

    // Mise à jour toutes les minutes
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 60000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeRemaining) return null;

  const { days, hours, minutes } = timeRemaining;

  // Format compact: "Xj" ou "Xh"
  if (compact) {
    if (days > 0) {
      return <span>{days}j</span>;
    } else if (hours > 0) {
      return <span>{hours}h</span>;
    } else {
      return <span>{minutes}min</span>;
    }
  }

  // Format complet: "X jours Y heures" ou "X heures Y minutes"
  if (days > 0) {
    return (
      <span>
        {days} jour{days > 1 ? 's' : ''}{hours > 0 ? ` ${hours}h` : ''}
      </span>
    );
  } else if (hours > 0) {
    return (
      <span>
        {hours} heure{hours > 1 ? 's' : ''}{minutes > 0 ? ` ${minutes}min` : ''}
      </span>
    );
  } else {
    return <span>{minutes} minute{minutes > 1 ? 's' : ''}</span>;
  }
};

export interface QuotaCounterProps {
  summary: QuotaSummary;
  compact?: boolean;
  showAll?: boolean;
  className?: string;
  onUpgradeClick?: () => void;
}

export const QuotaCounter: React.FC<QuotaCounterProps> = ({
  summary,
  compact = false,
  showAll = true,
  className = '',
  onUpgradeClick,
}) => {
  const quotaItems = [
    {
      label: 'Clips',
      quota: summary.clips,
      icon: FileText,
      feature: FeatureType.CLIPS,
    },
    {
      label: 'Fichiers',
      quota: summary.files,
      icon: Image,
      feature: FeatureType.FILES,
    },
    {
      label: 'Focus',
      quota: summary.focus_mode_time,
      icon: Focus,
      feature: FeatureType.FOCUS_MODE_TIME,
      unit: 'min',
    },
    {
      label: 'Compact',
      quota: summary.compact_mode_time,
      icon: Minimize2,
      feature: FeatureType.COMPACT_MODE_TIME,
      unit: 'min',
    },
  ];

  // Filtrer pour n'afficher que les quotas limités si compact
  const displayedItems = compact
    ? quotaItems.filter((item) => item.quota.is_limited)
    : quotaItems;

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {displayedItems.map((item) => (
          <QuotaCounterItemCompact
            key={item.feature}
            {...item}
            onUpgradeClick={onUpgradeClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-notion-gray-800 dark:text-notion-gray-200">
          Utilisation mensuelle
        </h3>
        {summary.period_end && (
          <div className="flex items-center gap-1.5 text-xs text-notion-gray-500 dark:text-notion-gray-400">
            <RotateCcw size={12} className="text-notion-gray-400" />
            <span>Reset dans </span>
            <span className="font-medium text-notion-gray-600 dark:text-notion-gray-300">
              <Countdown targetDate={summary.period_end} />
            </span>
          </div>
        )}
      </div>

      {/* Quota items */}
      <div className="space-y-2">
        {displayedItems.map((item) => (
          <QuotaCounterItem
            key={item.feature}
            {...item}
            onUpgradeClick={onUpgradeClick}
          />
        ))}
      </div>

      {/* Grace period warning */}
      {summary.is_grace_period && summary.grace_period_days_remaining && (
        <GracePeriodWarning
          daysRemaining={summary.grace_period_days_remaining}
          onUpgradeClick={onUpgradeClick}
        />
      )}
    </div>
  );
};

/**
 * Item de quota (version complète)
 */
interface QuotaItemProps {
  label: string;
  quota: QuotaUsage;
  icon: React.ElementType;
  unit?: string;
  onUpgradeClick?: () => void;
}

const QuotaCounterItem: React.FC<QuotaItemProps> = ({
  label,
  quota,
  icon: Icon,
  unit = '',
  onUpgradeClick,
}) => {
  const getColorClass = () => {
    if (quota.is_unlimited) return UI_CONFIG.COLORS.SUCCESS;
    if (quota.alert_level === 'critical') return UI_CONFIG.COLORS.CRITICAL;
    if (quota.alert_level === 'warning') return UI_CONFIG.COLORS.WARNING;
    return 'text-notion-gray-600';
  };

  const getProgressColor = () => {
    if (quota.alert_level === 'critical') return 'bg-red-500';
    if (quota.alert_level === 'warning') return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <motion.div
      className="space-y-1.5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Label et usage */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-notion-gray-500" />
          <span className="font-medium text-notion-gray-700 dark:text-notion-gray-300">
            {label}
          </span>
        </div>

        <span className={`font-medium ${getColorClass()}`}>
          {quota.is_unlimited ? (
            'Illimité'
          ) : (
            <>
              {quota.used}/{quota.limit} {unit}
            </>
          )}
        </span>
      </div>

      {/* Progress bar */}
      {!quota.is_unlimited && (
        <div className="relative h-1.5 bg-notion-gray-200 dark:bg-notion-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${getProgressColor()}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(quota.percentage, 100)}%` }}
            transition={{
              duration: 0.5,
              ease: UI_CONFIG.ANIMATION_EASE as any,
            }}
          />
        </div>
      )}

      {/* Warning message */}
      {quota.alert_level !== 'normal' && !quota.can_use && (
        <button
          onClick={onUpgradeClick}
          className="
            text-xs text-blue-600 hover:text-blue-700
            flex items-center gap-1 transition-colors
          "
        >
          <TrendingUp size={12} />
          <span>Passer à Premium</span>
        </button>
      )}
    </motion.div>
  );
};

/**
 * Item de quota (version compacte)
 */
const QuotaCounterItemCompact: React.FC<QuotaItemProps> = ({
  label,
  quota,
  icon: Icon,
  unit = '',
  onUpgradeClick,
}) => {
  if (quota.is_unlimited) return null;

  const getColorClass = () => {
    if (quota.alert_level === 'critical') return 'text-red-600';
    if (quota.alert_level === 'warning') return 'text-orange-600';
    return 'text-notion-gray-600';
  };

  return (
    <motion.div
      className="flex items-center justify-between text-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-notion-gray-400" />
        <span className="text-notion-gray-600 dark:text-notion-gray-400">
          {label}
        </span>
      </div>

      <span className={`font-medium ${getColorClass()}`}>
        {quota.remaining} {unit}
      </span>
    </motion.div>
  );
};

/**
 * Avertissement période de grâce
 */
interface GracePeriodWarningProps {
  daysRemaining: number;
  onUpgradeClick?: () => void;
}

const GracePeriodWarning: React.FC<GracePeriodWarningProps> = ({
  daysRemaining,
  onUpgradeClick,
}) => {
  const isUrgent = daysRemaining <= 7;

  return (
    <motion.div
      className={`
        mt-3 p-3 rounded-lg border
        ${
          isUrgent
            ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
            : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
        }
      `}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          size={16}
          className={isUrgent ? 'text-orange-600' : 'text-purple-600'}
        />
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-notion-gray-800 dark:text-notion-gray-200">
            Période d'essai Premium
          </p>
          <p className="text-xs text-notion-gray-600 dark:text-notion-gray-400">
            {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant
            {daysRemaining > 1 ? 's' : ''}
          </p>

          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="
                mt-2 text-xs font-medium text-blue-600 hover:text-blue-700
                transition-colors
              "
            >
              Continuer avec Premium →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Mini compteur pour la sidebar (très subtil)
 */
export const QuotaCounterMini: React.FC<{
  summary: QuotaSummary;
  onUpgradeClick?: () => void;
}> = ({ summary, onUpgradeClick }) => {
  // Ne montrer que si on approche des limites
  const criticalQuotas = [
    summary.clips,
    summary.files,
    summary.focus_mode_time,
    summary.compact_mode_time,
  ].filter((q) => q.alert_level === 'critical' || q.alert_level === 'warning');

  if (criticalQuotas.length === 0 && !summary.is_grace_period) {
    return null;
  }

  return (
    <motion.div
      className="p-2 rounded-lg bg-notion-gray-50 dark:bg-notion-gray-800"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <QuotaCounter summary={summary} compact showAll={false} onUpgradeClick={onUpgradeClick} />
    </motion.div>
  );
};
