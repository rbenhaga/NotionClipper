// packages/ui/src/components/onboarding/PremiumStep.tsx
/**
 * Étape Premium de l'onboarding - Design attractif et premium
 *
 * Fonctionnalités :
 * - Essai gratuit 14 jours
 * - Upgrade immédiat (2,99€/mois)
 * - Plan annuel avec réduction (29€/an - économisez 17%)
 * - Option "Rester gratuit"
 * - Comparaison Free vs Premium
 */

import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import {
  Check,
  X,
  Crown,
  Zap,
  Shield,
  Sparkles,
  TrendingUp,
  Clock,
  Infinity as InfinityIcon,
  Star,
  ChevronRight
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
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartTrial = async () => {
    setIsProcessing(true);
    try {
      await onStartTrial();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await onUpgradeNow(selectedPlan);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = loading || isProcessing;

  // Features premium vs free
  const features = [
    {
      name: 'Clips par mois',
      free: '50 clips',
      premium: 'Illimité',
      icon: Zap
    },
    {
      name: 'Taille des clips',
      free: '2000 mots',
      premium: 'Illimité',
      icon: TrendingUp
    },
    {
      name: 'Fichiers joints',
      free: '5 fichiers',
      premium: 'Illimité',
      icon: InfinityIcon
    },
    {
      name: 'Mode Focus',
      free: '30 min/jour',
      premium: 'Illimité',
      icon: Clock
    },
    {
      name: 'Support',
      free: 'Email',
      premium: 'Prioritaire',
      icon: Shield
    },
    {
      name: 'Synchronisation',
      free: 'Standard',
      premium: 'Instantanée',
      icon: Sparkles
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        {/* Icon premium */}
        <MotionDiv
          className="flex justify-center mb-6"
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-3xl blur-xl opacity-60 animate-pulse" />
            <div className="relative p-5 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-3xl shadow-2xl">
              <Crown size={48} className="text-white" strokeWidth={2} />
            </div>
            <div className="absolute -top-2 -right-2">
              <Star size={24} className="text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </MotionDiv>

        {/* Titre */}
        <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          Débloquez tout le potentiel
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Commencez avec <span className="font-semibold text-blue-600">14 jours d'essai gratuit</span> et découvrez toutes les fonctionnalités Premium
        </p>
      </MotionDiv>

      {/* Plans tarifaires */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Plan Mensuel */}
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setSelectedPlan('monthly')}
          className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all ${
            selectedPlan === 'monthly'
              ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
        >
          {selectedPlan === 'monthly' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                Sélectionné
              </div>
            </div>
          )}

          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mensuel</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">2,99€</span>
              <span className="text-gray-600">/mois</span>
            </div>
            <p className="text-sm text-gray-600">Annulez à tout moment</p>
          </div>
        </MotionDiv>

        {/* Plan Annuel */}
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setSelectedPlan('annual')}
          className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all ${
            selectedPlan === 'annual'
              ? 'border-green-600 bg-green-50 shadow-lg scale-105'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
        >
          {/* Badge économie */}
          <div className="absolute -top-3 right-4">
            <div className="px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
              Économisez 19%
            </div>
          </div>

          {selectedPlan === 'annual' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                Sélectionné
              </div>
            </div>
          )}

          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Annuel</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">29€</span>
              <span className="text-gray-600">/an</span>
            </div>
            <p className="text-sm text-green-700 font-medium">Soit 2,42€/mois</p>
          </div>
        </MotionDiv>
      </div>

      {/* Comparaison Free vs Premium */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6 bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        <div className="grid grid-cols-3 gap-0">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-r border-gray-200">
            <h4 className="font-semibold text-gray-700">Fonctionnalités</h4>
          </div>
          <div className="p-4 bg-gray-50 border-b border-r border-gray-200 text-center">
            <h4 className="font-semibold text-gray-700">Gratuit</h4>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 text-center">
            <h4 className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Premium
            </h4>
          </div>

          {/* Features */}
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <React.Fragment key={feature.name}>
                <div className={`p-4 border-r border-gray-200 flex items-center gap-2 ${index < features.length - 1 ? 'border-b' : ''}`}>
                  <Icon size={18} className="text-gray-500" />
                  <span className="text-sm text-gray-700">{feature.name}</span>
                </div>
                <div className={`p-4 border-r border-gray-200 text-center ${index < features.length - 1 ? 'border-b' : ''}`}>
                  <span className="text-sm text-gray-600">{feature.free}</span>
                </div>
                <div className={`p-4 bg-gradient-to-r from-blue-50/30 to-purple-50/30 text-center ${index < features.length - 1 ? 'border-b border-gray-200' : ''}`}>
                  <span className="text-sm font-semibold text-blue-600">{feature.premium}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </MotionDiv>

      {/* Boutons d'action */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        {/* Bouton principal : Essai gratuit */}
        <button
          onClick={handleStartTrial}
          disabled={isDisabled}
          className="group relative w-full overflow-hidden rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

          <div className="relative flex items-center justify-center gap-3 px-8 py-5">
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white font-bold text-lg">Chargement...</span>
              </>
            ) : (
              <>
                <Sparkles size={24} className="text-white" />
                <span className="text-white font-bold text-lg">
                  Commencer l'essai gratuit (14 jours)
                </span>
                <ChevronRight size={20} className="text-white/80" />
              </>
            )}
          </div>
        </button>

        {/* Bouton secondaire : Upgrade maintenant */}
        <button
          onClick={handleUpgrade}
          disabled={isDisabled}
          className="w-full px-8 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-2">
            <Crown size={20} className="text-amber-500" />
            <span className="font-semibold text-gray-900">
              Upgrader maintenant - {selectedPlan === 'monthly' ? '2,99€/mois' : '29€/an'}
            </span>
          </div>
        </button>

        {/* Bouton tertiaire : Rester gratuit */}
        <button
          onClick={onStayFree}
          disabled={isDisabled}
          className="w-full text-center py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
        >
          Continuer avec la version gratuite →
        </button>
      </MotionDiv>

      {/* Note légale */}
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 p-4 bg-blue-50 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <strong>Essai sans risque</strong> : Testez toutes les fonctionnalités Premium pendant 14 jours.
            Aucune carte bancaire requise pour l'essai. Annulez à tout moment.
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}
