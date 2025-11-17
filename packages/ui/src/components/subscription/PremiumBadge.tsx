/**
 * Premium Badge Component
 *
 * Badge élégant "PRO" pour identifier les features premium
 * Design Philosophy: Apple/Notion mix - subtil mais visible
 */

import React from 'react';
import { Crown, Zap, Sparkles } from 'lucide-react';

export interface PremiumBadgeProps {
  variant?: 'default' | 'compact' | 'minimal';
  icon?: 'crown' | 'zap' | 'sparkles' | 'none';
  label?: string;
  className?: string;
  animated?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  variant = 'default',
  icon = 'crown',
  label = 'PRO',
  className = '',
  animated = true,
}) => {
  const getIcon = () => {
    const iconSize = variant === 'minimal' ? 10 : variant === 'compact' ? 12 : 14;
    const iconClass = 'text-white';

    switch (icon) {
      case 'crown':
        return <Crown size={iconSize} className={iconClass} strokeWidth={2.5} />;
      case 'zap':
        return <Zap size={iconSize} className={iconClass} strokeWidth={2.5} fill="currentColor" />;
      case 'sparkles':
        return <Sparkles size={iconSize} className={iconClass} strokeWidth={2.5} />;
      default:
        return null;
    }
  };

  // Variante default - plus visible
  if (variant === 'default') {
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1
          bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900
          text-white rounded-full
          text-[11px] font-bold tracking-wide uppercase
          shadow-sm
          ${animated ? 'transition-transform hover:scale-105' : ''}
          ${className}
        `}
      >
        {icon !== 'none' && getIcon()}
        <span>{label}</span>
      </span>
    );
  }

  // Variante compact - plus discret
  if (variant === 'compact') {
    return (
      <span
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5
          bg-gray-900 dark:bg-gray-700
          text-white rounded
          text-[10px] font-semibold uppercase
          ${animated ? 'transition-opacity hover:opacity-80' : ''}
          ${className}
        `}
      >
        {icon !== 'none' && getIcon()}
        <span>{label}</span>
      </span>
    );
  }

  // Variante minimal - très subtil
  // Si pas d'icône ET pas de label, ne rien afficher
  if (icon === 'none' && !label) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center gap-0.5 px-1 py-0.5
        bg-gray-800 dark:bg-gray-600
        text-white rounded-sm
        text-[9px] font-bold uppercase
        ${className}
      `}
    >
      {icon !== 'none' && getIcon()}
      {label && <span className="ml-0.5">{label}</span>}
    </span>
  );
};

/**
 * Helper Component: Feature avec badge PRO
 */
export const PremiumFeature: React.FC<{
  children: React.ReactNode;
  badgeVariant?: 'default' | 'compact' | 'minimal';
  className?: string;
}> = ({ children, badgeVariant = 'compact', className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex-1">{children}</span>
      <PremiumBadge variant={badgeVariant} />
    </div>
  );
};

/**
 * Helper Component: Bouton avec badge PRO (désactivé si FREE)
 */
export const PremiumButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  isFree?: boolean;
  onUpgrade?: () => void;
  children: React.ReactNode;
  className?: string;
  showBadge?: boolean;
}> = ({
  onClick,
  disabled = false,
  isFree = false,
  onUpgrade,
  children,
  className = '',
  showBadge = true,
}) => {
  const handleClick = () => {
    if (isFree && onUpgrade) {
      onUpgrade(); // Afficher modal upgrade
    } else if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled && !isFree}
      className={`
        relative flex items-center gap-2
        ${
          isFree
            ? 'opacity-60 cursor-pointer' // FREE: montrer qu'il faut upgrade
            : disabled
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer'
        }
        ${className}
      `}
    >
      <span className="flex-1">{children}</span>
      {isFree && showBadge && <PremiumBadge variant="compact" icon="crown" />}
    </button>
  );
};
