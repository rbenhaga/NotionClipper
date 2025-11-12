// packages/ui/src/components/onboarding/PremiumStep.tsx
/**
 * Étape Premium de l'onboarding - Design compact et élégant
 *
 * Design Philosophy:
 * - Compact: Tient dans la fenêtre onboarding (max 400px height)
 * - Clair: Focus sur les 3 options principales
 * - Élégant: Style cohérent avec le reste de l'onboarding
 * - Non intrusif: L'utilisateur peut facilement rester gratuit
 */

import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Crown,
  Zap,
  Check,
  Sparkles
} from 'lucide-react';

export interface PremiumStepProps {
  onStartTrial: () => Promise<void>;
  onUpgradeNow: (plan: 'monthly' | 'annual') => Promise<void>;
  onStayFree: () => void;
  loading?: boolean;
}

export function PremiumStep({
  onStartTrial,
  onUpgradeNow,
  onStayFree,
  loading = false
}: PremiumStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartTrial = async () => {
    setIsProcessing(true);
    try {
      await onStartTrial();
    } catch (error) {
      console.error('[PremiumStep] Error starting trial:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeMonthly = async () => {
    setIsProcessing(true);
    try {
      await onUpgradeNow('monthly');
    } catch (error) {
      console.error('[PremiumStep] Error upgrading:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = loading || isProcessing;

  return (
    <div className="w-full max-w-md mx-auto">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        {/* Header compact */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg">
            <Crown size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Découvrez Premium
          </h2>
          <p className="text-sm text-gray-600">
            Testez gratuitement toutes les fonctionnalités pendant 14 jours
          </p>
        </div>

        {/* Features compactes - 3 principales uniquement */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <Zap size={20} className="text-blue-600 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-gray-900">Clips illimités</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <Sparkles size={20} className="text-purple-600 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-gray-900">Fichiers illimités</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <Check size={20} className="text-emerald-600 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-gray-900">Mode Focus</p>
          </div>
        </div>

        {/* Boutons d'action - Stack vertical compact */}
        <div className="space-y-2.5">
          {/* Bouton principal : Essai gratuit */}
          <button
            onClick={handleStartTrial}
            disabled={isDisabled}
            className="group relative w-full overflow-hidden rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:from-blue-700 group-hover:to-purple-700 transition-colors" />

            <div className="relative flex items-center justify-center gap-2 px-6 py-3.5">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white font-semibold text-sm">Chargement...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="text-white" />
                  <span className="text-white font-semibold text-sm">
                    Essai gratuit 14 jours
                  </span>
                </>
              )}
            </div>
          </button>

          {/* Bouton secondaire : Upgrade direct */}
          <button
            onClick={handleUpgradeMonthly}
            disabled={isDisabled}
            className="w-full px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center justify-center gap-2">
              <Crown size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-gray-900 text-sm">
                Passer à Premium - 2,99€/mois
              </span>
            </div>
          </button>

          {/* Bouton tertiaire : Rester gratuit */}
          <button
            onClick={onStayFree}
            disabled={isDisabled}
            className="w-full text-center py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            Continuer avec la version gratuite
          </button>
        </div>

        {/* Note légale compacte */}
        <div className="text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Essai sans risque. Annulez à tout moment. Aucune carte bancaire requise pour l'essai.
          </p>
        </div>
      </MotionDiv>
    </div>
  );
}
