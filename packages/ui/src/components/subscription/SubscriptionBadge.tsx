/**
 * Subscription Badge Component
 *
 * Badge subtil style Apple affichant le tier (Free/Premium/Grace)
 *
 * Design Philosophy:
 * - Minimaliste et discret
 * - Couleurs douces et harmonieuses
 * - Animation au hover
 * - Cohérent avec le design Notion/Apple
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Clock } from 'lucide-react';
import { SubscriptionTier, UI_CONFIG } from '@notion-clipper/core-shared';

export interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  gracePeriodDaysRemaining?: number;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  tier,
  gracePeriodDaysRemaining,
  className = '',
  showIcon = true,
  size = 'md',
}) => {
  const getBadgeConfig = () => {
    switch (tier) {
      case SubscriptionTier.PREMIUM:
        return {
          label: 'Premium',
          icon: Crown,
          colorClass: UI_CONFIG.COLORS.PREMIUM_BADGE,
          gradient: 'from-blue-500 to-purple-500',
        };

      case SubscriptionTier.GRACE_PERIOD:
        return {
          label: gracePeriodDaysRemaining
            ? `Essai (${gracePeriodDaysRemaining}j)`
            : 'Essai Premium',
          icon: Clock,
          colorClass: UI_CONFIG.COLORS.GRACE_BADGE,
          gradient: 'from-purple-500 to-pink-500',
        };

      case SubscriptionTier.FREE:
      default:
        return {
          label: 'Gratuit',
          icon: Sparkles,
          colorClass: UI_CONFIG.COLORS.FREE_BADGE,
          gradient: 'from-gray-400 to-gray-500',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeConfig = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      icon: 10,
    },
    md: {
      container: 'px-2.5 py-1 text-xs gap-1.5',
      icon: 12,
    },
    lg: {
      container: 'px-3 py-1.5 text-sm gap-2',
      icon: 14,
    },
  };

  return (
    <motion.div
      className={`
        inline-flex items-center rounded-full font-medium
        backdrop-blur-sm border border-transparent
        ${config.colorClass}
        ${sizeConfig[size].container}
        ${className}
      `}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{
        duration: UI_CONFIG.ANIMATION_DURATION,
        ease: UI_CONFIG.ANIMATION_EASE as any,
      }}
    >
      {showIcon && (
        <Icon
          size={sizeConfig[size].icon}
          className={tier === SubscriptionTier.PREMIUM ? 'text-blue-600' : ''}
        />
      )}
      <span>{config.label}</span>
    </motion.div>
  );
};

/**
 * Compact variant - juste l'icône avec tooltip
 */
export const SubscriptionBadgeCompact: React.FC<SubscriptionBadgeProps> = ({
  tier,
  gracePeriodDaysRemaining,
  className = '',
}) => {
  const config = {
    [SubscriptionTier.PREMIUM]: {
      icon: Crown,
      color: 'text-blue-600',
      tooltip: 'Premium',
    },
    [SubscriptionTier.GRACE_PERIOD]: {
      icon: Clock,
      color: 'text-purple-600',
      tooltip: `Essai Premium (${gracePeriodDaysRemaining || 0}j)`,
    },
    [SubscriptionTier.FREE]: {
      icon: Sparkles,
      color: 'text-gray-500',
      tooltip: 'Gratuit',
    },
  };

  const { icon: Icon, color, tooltip } = config[tier];

  return (
    <motion.div
      className={`relative group ${className}`}
      whileHover={{ scale: 1.1 }}
      transition={{ duration: 0.2 }}
    >
      <Icon size={16} className={color} />

      {/* Tooltip au hover */}
      <div
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-200 whitespace-nowrap
        "
      >
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </motion.div>
  );
};
