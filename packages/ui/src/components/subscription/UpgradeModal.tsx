/**
 * Upgrade Modal - Design inspiré de la PricingSection landing page
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Sparkles, Gift } from 'lucide-react';
import { FeatureType, SUBSCRIPTION_MESSAGES, BETA_PRICING } from '@notion-clipper/core-shared';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature?: FeatureType;
  quotaReached?: boolean;
  remainingQuota?: number;
  remainingSpots?: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  feature,
  quotaReached = false,
  remainingQuota,
}) => {
  const getFeatureMessage = () => {
    if (!feature) return null;
    const messages: Record<FeatureType, { title: string; description: string }> = {
      [FeatureType.CLIPS]: {
        title: 'Limite de clips atteinte',
        description: quotaReached ? 'Vous avez utilisé tous vos clips.' : `Plus que ${remainingQuota} clips.`,
      },
      [FeatureType.FILES]: {
        title: 'Limite de fichiers atteinte',
        description: quotaReached ? "Limite d'upload atteinte." : `Plus que ${remainingQuota} fichiers.`,
      },
      [FeatureType.FOCUS_MODE_TIME]: {
        title: 'Mode Focus épuisé',
        description: quotaReached ? 'Temps épuisé ce mois-ci.' : `Plus que ${remainingQuota} min.`,
      },
      [FeatureType.COMPACT_MODE_TIME]: {
        title: 'Mode Compact épuisé',
        description: quotaReached ? 'Temps épuisé ce mois-ci.' : `Plus que ${remainingQuota} min.`,
      },
      [FeatureType.WORDS_PER_CLIP]: {
        title: 'Clip trop long',
        description: 'Dépasse la limite du plan gratuit.',
      },
      [FeatureType.MULTIPLE_SELECTIONS]: {
        title: 'Fonctionnalité Premium',
        description: 'Sélections multiples réservées au Premium.',
      },
      [FeatureType.WORKSPACES]: {
        title: 'Fonctionnalité Premium',
        description: 'Multi-workspaces disponible en Premium.',
      },
      [FeatureType.ANALYTICS]: {
        title: 'Fonctionnalité Premium',
        description: 'Analytics disponibles en Premium.',
      },
    };
    return messages[feature];
  };

  const featureMessage = getFeatureMessage();

  const features = [
    'Clips illimités',
    'Fichiers illimités',
    'Modes Focus & Compact illimités',
    'Workspaces multiples',
    'Support prioritaire',
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop avec blur */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Card - Style PricingSection */}
          <motion.div
            className="relative w-full max-w-[320px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-violet-500/50 shadow-2xl shadow-violet-500/20 ring-4 ring-violet-500/5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gloss Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none opacity-50" />

            {/* Badge BETA */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xl backdrop-blur-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                <Sparkles className="w-3 h-3" />
                BETA
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-20"
            >
              <X size={14} />
            </button>

            {/* Content */}
            <div className="relative z-10 p-5 pt-6">
              {/* Alerte quota */}
              {featureMessage && (
                <div className="mb-4 p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg border border-orange-300 dark:border-orange-700">
                  <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                    ⚠️ {featureMessage.title}
                  </p>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400">
                    {featureMessage.description}
                  </p>
                </div>
              )}

              {/* Header - Style PricingSection */}
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  Premium
                </h3>
                <div className="flex items-baseline justify-center gap-1.5 mb-2">
                  <span className="text-lg font-medium text-gray-400 line-through">
                    {BETA_PRICING.ORIGINAL_PRICE}
                  </span>
                  <span className="text-4xl font-bold tracking-tighter text-violet-600 dark:text-violet-400">
                    {BETA_PRICING.PRICE}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    /mois
                  </span>
                </div>
                <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400 flex items-center justify-center gap-1">
                  <Gift size={12} />
                  <span>-{BETA_PRICING.DISCOUNT_PERCENT}% {BETA_PRICING.FOREVER_TEXT}</span>
                </p>
              </div>

              {/* Divider - Style PricingSection */}
              <div className="h-px w-full mb-4 bg-gradient-to-r from-transparent via-violet-200 dark:via-violet-800 to-transparent" />

              {/* Features - Style PricingSection */}
              <ul className="space-y-2 mb-4">
                {features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm shadow-violet-500/30">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button - Style PricingSection */}
              <button
                onClick={onUpgrade}
                className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all active:scale-[0.98]"
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap size={14} />
                  {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.CTA_PRIMARY}
                </span>
              </button>

              {/* Secondary */}
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.CTA_SECONDARY}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * Compact Upgrade Banner
 */
export interface UpgradeBannerProps {
  feature?: FeatureType;
  remaining?: number;
  onUpgradeClick: () => void;
  onDismiss?: () => void;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  feature: _feature,
  remaining,
  onUpgradeClick,
  onDismiss,
}) => {
  return (
    <motion.div
      className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/25"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-white">Offre Beta • {BETA_PRICING.PRICE}</p>
          <p className="text-[10px] text-white/80">
            {remaining !== undefined ? `Plus que ${remaining} ce mois` : 'Débloquez tout'}
          </p>
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold text-white transition-colors"
        >
          Upgrade
        </button>
        {onDismiss && (
          <button onClick={onDismiss} className="p-1 text-white/50 hover:text-white/80 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
