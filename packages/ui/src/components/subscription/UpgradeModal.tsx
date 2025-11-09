/**
 * Upgrade Modal Component
 *
 * Modal d'upgrade élégante et encourageante (style Apple/Notion)
 *
 * Design Philosophy:
 * - Magnifique et inspirante (pas agressive)
 * - Animations fluides et naturelles
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
} from 'lucide-react';
import { FeatureType, SUBSCRIPTION_MESSAGES, UI_CONFIG } from '@notion-clipper/core-shared/src/config/subscription.config';

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
  const [step, setStep] = useState<'intro' | 'features' | 'pricing'>('intro');

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
    }
  }, [isOpen]);

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

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              className="
                bg-white dark:bg-notion-gray-900
                rounded-2xl shadow-2xl
                max-w-lg w-full
                pointer-events-auto
                overflow-hidden
              "
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                duration: UI_CONFIG.ANIMATION_DURATION,
                ease: UI_CONFIG.ANIMATION_EASE as any,
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="
                  absolute top-4 right-4 p-2 rounded-lg
                  text-notion-gray-500 hover:text-notion-gray-700
                  hover:bg-notion-gray-100 dark:hover:bg-notion-gray-800
                  transition-colors z-10
                "
              >
                <X size={20} />
              </button>

              {/* Header avec gradient */}
              <div className="relative p-8 pb-6 bg-gradient-to-br from-blue-500 to-purple-600">
                <motion.div
                  className="flex items-center gap-3 mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Crown size={32} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.TITLE}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.SUBTITLE}
                    </p>
                  </div>
                </motion.div>

                {/* Feature-specific message */}
                {featureMessage && (
                  <motion.div
                    className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-sm font-medium text-white">
                      {featureMessage.title}
                    </p>
                    <p className="text-xs text-blue-100 mt-1">
                      {featureMessage.description}
                    </p>
                  </motion.div>
                )}

                {/* Decorative elements */}
                <Sparkles
                  className="absolute top-4 right-20 text-white/30"
                  size={24}
                />
                <Sparkles
                  className="absolute bottom-8 right-12 text-white/20"
                  size={16}
                />
              </div>

              {/* Features list */}
              <div className="p-8 space-y-4">
                {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.FEATURES.map((feature, index) => (
                  <motion.div
                    key={feature}
                    className="flex items-start gap-3"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full mt-0.5">
                      <Check size={14} className="text-green-600" />
                    </div>
                    <p className="text-sm text-notion-gray-700 dark:text-notion-gray-300">
                      {feature}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Pricing */}
              <div className="px-8 pb-8">
                <motion.div
                  className="
                    p-6 rounded-xl
                    bg-gradient-to-br from-blue-50 to-purple-50
                    dark:from-blue-900/20 dark:to-purple-900/20
                    border border-blue-200 dark:border-blue-800
                  "
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="text-center mb-4">
                    <p className="text-sm text-notion-gray-600 dark:text-notion-gray-400">
                      Prix mensuel
                    </p>
                    <p className="text-4xl font-bold text-notion-gray-900 dark:text-white mt-1">
                      {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.PRICE}
                    </p>
                    <p className="text-xs text-notion-gray-500 mt-1">
                      Annulez à tout moment
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2">
                    <motion.button
                      onClick={onUpgrade}
                      className="
                        w-full py-3 px-6 rounded-lg font-semibold
                        bg-gradient-to-r from-blue-600 to-purple-600
                        text-white shadow-lg
                        hover:shadow-xl
                        transition-all duration-200
                      "
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Zap size={18} />
                        {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.CTA_PRIMARY}
                      </span>
                    </motion.button>

                    <button
                      onClick={onClose}
                      className="
                        w-full py-2 px-6 rounded-lg
                        text-sm text-notion-gray-600 dark:text-notion-gray-400
                        hover:text-notion-gray-800 dark:hover:text-notion-gray-200
                        transition-colors
                      "
                    >
                      {SUBSCRIPTION_MESSAGES.UPGRADE_MODAL.CTA_SECONDARY}
                    </button>
                  </div>
                </motion.div>

                {/* Trust indicators */}
                <motion.div
                  className="flex items-center justify-center gap-6 mt-6 text-xs text-notion-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-1">
                    <Shield size={14} />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
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
