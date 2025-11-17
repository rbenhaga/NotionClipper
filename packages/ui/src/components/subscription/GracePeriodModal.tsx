/**
 * Grace Period Urgent Modal
 *
 * Modal urgente affichée quand la période de grâce est proche de l'expiration (≤ 3 jours)
 * Design: Apple/Notion - Urgent mais non-punitif, encourageant
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X, Zap, Shield } from 'lucide-react';

export interface GracePeriodModalProps {
  isOpen: boolean;
  daysRemaining: number;
  onClose: () => void;
  onUpgrade: () => void;
}

export const GracePeriodUrgentModal: React.FC<GracePeriodModalProps> = ({
  isOpen,
  daysRemaining,
  onClose,
  onUpgrade,
}) => {
  const isLastDay = daysRemaining <= 1;
  const isVeryUrgent = daysRemaining === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center p-6 z-[9999] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header avec gradient */}
              <div
                className={`relative px-6 pt-6 pb-4 ${
                  isVeryUrgent
                    ? 'bg-gradient-to-br from-red-500 to-orange-600'
                    : isLastDay
                    ? 'bg-gradient-to-br from-orange-500 to-yellow-600'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600'
                }`}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm">
                  {isVeryUrgent ? (
                    <AlertTriangle size={32} className="text-white" strokeWidth={2.5} />
                  ) : (
                    <Clock size={32} className="text-white" strokeWidth={2.5} />
                  )}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  {isVeryUrgent
                    ? 'Période d\'essai terminée'
                    : isLastDay
                    ? 'Dernier jour d\'essai Premium'
                    : `${daysRemaining} jours d'essai restants`}
                </h2>

                <p className="text-white/90 text-center text-sm">
                  {isVeryUrgent
                    ? 'Votre accès Premium a expiré aujourd\'hui'
                    : 'Continuez à profiter de toutes les fonctionnalités Premium'}
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-6 space-y-4">
                {/* Features Premium */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Conservez vos avantages Premium :
                  </p>

                  <div className="space-y-2">
                    <FeatureItem icon={<Zap />} text="Clips illimités sans restriction" />
                    <FeatureItem icon={<Shield />} text="Fichiers illimités (images, PDFs, vidéos)" />
                    <FeatureItem icon={<Clock />} text="Mode Focus & Compact sans limite de temps" />
                    <FeatureItem icon={<Shield />} text="Mode Offline activé en permanence" />
                  </div>
                </div>

                {/* Warning message */}
                {isVeryUrgent ? (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-800 dark:text-red-200 text-center">
                      <strong>Action requise :</strong> Passez à Premium maintenant pour conserver l'accès à toutes les fonctionnalités.
                    </p>
                  </div>
                ) : isLastDay ? (
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-orange-800 dark:text-orange-200 text-center">
                      <strong>Dernier jour :</strong> Après aujourd'hui, vous reviendrez au plan FREE avec quotas limités.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-800 dark:text-purple-200 text-center">
                      Profitez de {daysRemaining} jours d'essai restants ou passez à Premium dès maintenant.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  {/* Primary: Upgrade */}
                  <button
                    onClick={() => {
                      onUpgrade();
                      onClose();
                    }}
                    className={`
                      w-full px-4 py-3 rounded-xl font-semibold text-white
                      shadow-lg transition-all duration-200
                      transform hover:scale-[1.02] active:scale-[0.98]
                      ${
                        isVeryUrgent
                          ? 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700'
                          : isLastDay
                          ? 'bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700'
                          : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                      }
                    `}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Zap size={18} />
                      <span>{isVeryUrgent ? 'Activer Premium maintenant' : 'Continuer avec Premium'}</span>
                    </span>
                  </button>

                  {/* Secondary: Remind later / Stay free */}
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {isVeryUrgent ? 'Rester en FREE' : 'Me le rappeler plus tard'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Feature Item - Petit composant pour afficher une feature Premium
 */
interface FeatureItemProps {
  icon: React.ReactNode;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
      {React.cloneElement(icon as React.ReactElement, { size: 16, strokeWidth: 2.5 })}
    </div>
    <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
  </div>
);
