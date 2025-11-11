/**
 * Upgrade Modal Component
 *
 * Modal d'upgrade élégante et encourageante (style Apple/Notion)
 * Inspiré du design de l'onboarding - compact, dynamique, hauteur adaptative
 *
 * Design Philosophy:
 * - Subtil et élégant (pas agressif)
 * - Animations fluides et naturelles
 * - Hauteur dynamique adaptée au contenu
 * - Focus sur la valeur, pas sur la limitation
 * - Call-to-action clair mais non intrusif
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Crown,
  Check,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { FeatureType, SUBSCRIPTION_MESSAGES, UI_CONFIG } from '@notion-clipper/core-shared';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature?: FeatureType;
  quotaReached?: boolean;
  remainingQuota?: number;
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
        title: 'Plus de clips disponibles',
        description: quotaReached
          ? 'Vous avez atteint votre limite mensuelle de clips.'
          : `Plus que ${remainingQuota} clips ce mois-ci.`,
      },
      [FeatureType.FILES]: {
        title: 'Plus de fichiers disponibles',
        description: quotaReached
          ? 'Vous avez atteint votre limite d\'upload de fichiers.'
          : `Plus que ${remainingQuota} fichiers ce mois-ci.`,
      },
      [FeatureType.FOCUS_MODE_TIME]: {
        title: 'Mode Focus épuisé',
        description: quotaReached
          ? 'Vous avez utilisé tout votre temps de Mode Focus.'
          : `Plus que ${remainingQuota} minutes de Mode Focus.`,
      },
      [FeatureType.COMPACT_MODE_TIME]: {
        title: 'Mode Compact épuisé',
        description: quotaReached
          ? 'Vous avez utilisé tout votre temps de Mode Compact.'
          : `Plus que ${remainingQuota} minutes de Mode Compact.`,
      },
      [FeatureType.WORDS_PER_CLIP]: {
        title: 'Clip trop long',
        description: 'Ce clip dépasse la limite de mots du plan gratuit.',
      },
      [FeatureType.MULTIPLE_SELECTIONS]: {
        title: 'Sélections multiples',
        description: 'Les sélections multiples sont disponibles en Premium.',
      },
    };

    return messages[feature];
  };

  const featureMessage = getFeatureMessage();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal - Compact et hauteur dynamique */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              className="
                bg-white dark:bg-notion-gray-900
                rounded-2xl shadow-2xl
                max-w-[420px] w-full
                pointer-events-auto
                overflow-hidden
              "
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="
                  absolute top-3 right-3 p-1.5 rounded-lg
                  text-notion-gray-400 hover:text-notion-gray-600
                  hover:bg-notion-gray-100 dark:hover:bg-notion-gray-800
                  transition-colors z-10
                "
                aria-label="Fermer"
              >
                <X size={18} />
              </button>

              {/* Header - Plus subtil */}
              <div className="pt-8 pb-6 px-6 text-center">
                <motion.div
                  className="flex justify-center mb-4"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <div className="relative">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl">
                      <Crown size={32} className="text-blue-600" />
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles size={16} className="text-purple-500" />
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
                    {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.TITLE}
                  </h2>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed max-w-[320px] mx-auto">
                    {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.SUBTITLE}
                  </p>
                </motion.div>

                {/* Feature-specific message - Plus compact */}
                {featureMessage && (
                  <motion.div
                    className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-[13px] font-medium text-orange-900 dark:text-orange-100">
                      {featureMessage.title}
                    </p>
                    <p className="text-[12px] text-orange-700 dark:text-orange-300 mt-0.5">
                      {featureMessage.description}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Features list - Plus compact */}
              <div className="px-6 pb-5 space-y-2.5">
                {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.FEATURES.map((feature, index) => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-2.5"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.04, duration: 0.3 }}
                  >
                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                    </div>
                    <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                      {feature}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Pricing - Compact */}
              <div className="px-6 pb-6">
                <motion.div
                  className="
                    p-4 rounded-xl
                    bg-gradient-to-br from-gray-50 to-gray-100
                    dark:from-gray-800/50 dark:to-gray-800/30
                    border border-gray-200 dark:border-gray-700
                  "
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="text-center mb-3">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-[32px] font-bold text-gray-900 dark:text-white">
                        {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.PRICE.split('/')[0]}
                      </span>
                      <span className="text-[14px] text-gray-600 dark:text-gray-400">
                        /mois
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Sans engagement • Annulez quand vous voulez
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2">
                    <motion.button
                      onClick={onUpgrade}
                      className="
                        group relative w-full overflow-hidden rounded-xl
                        transition-all duration-200
                      "
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900" />
                      <div className="relative flex items-center justify-center gap-2 px-5 py-3">
                        <Zap size={16} className="text-white" strokeWidth={2.5} />
                        <span className="text-white font-medium text-[14px]">
                          {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.CTA_PRIMARY}
                        </span>
                      </div>
                    </motion.button>

                    <button
                      onClick={onClose}
                      className="
                        w-full py-2 px-5 rounded-lg
                        text-[13px] text-gray-600 dark:text-gray-400
                        hover:text-gray-800 dark:hover:text-gray-200
                        transition-colors
                      "
                    >
                      {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.CTA_SECONDARY}
                    </button>
                  </div>
                </motion.div>

                {/* Trust indicators - Compact */}
                <motion.div
                  className="flex items-center justify-center gap-4 mt-4 text-[11px] text-gray-500 dark:text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-1">
                    <Shield size={12} />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Sans engagement</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Variante compacte pour les warnings subtils
 */
export const UpgradeBanner: React.FC<{
  feature: FeatureType;
  remaining: number;
  onUpgradeClick: () => void;
  onDismiss: () => void;
}> = ({ feature, remaining, onUpgradeClick, onDismiss }) => {
  return (
    <motion.div
      className="
        p-3 rounded-lg border
        bg-gradient-to-r from-orange-50 to-yellow-50
        dark:from-orange-900/20 dark:to-yellow-900/20
        border-orange-200 dark:border-orange-800
      "
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-start gap-3">
        <TrendingUp size={18} className="text-orange-600 mt-0.5" />

        <div className="flex-1">
          <p className="text-sm font-medium text-notion-gray-800 dark:text-notion-gray-200">
            Bientôt épuisé
          </p>
          <p className="text-xs text-notion-gray-600 dark:text-notion-gray-400 mt-0.5">
            Plus que {remaining} ce mois-ci. Passez à Premium pour continuer sans limite.
          </p>

          <button
            onClick={onUpgradeClick}
            className="
              mt-2 text-xs font-medium text-blue-600 hover:text-blue-700
              transition-colors
            "
          >
            Voir les options →
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 text-notion-gray-400 hover:text-notion-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};
