// packages/ui/src/components/onboarding/FocusModeIntro.tsx
// 🎯 Introduction au Mode Focus - Design Premium inspiré Notion/Apple
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Target,
  Zap,
  Upload,
  MousePointer2,
  Keyboard,
  ChevronRight,
  X,
  Check,
  Eye,
  Sparkles,
  ArrowRight,
  Circle
} from 'lucide-react';
import { MotionButton, MotionDiv } from '../common/MotionWrapper';

export interface FocusModeIntroProps {
  onComplete: () => void;
  onSkip: () => void;
  pageName?: string;
}

// 🎨 Étapes simplifiées et optimisées
const steps = [
  {
    id: 'overview',
    icon: Target,
    title: 'Mode Focus activé',
    subtitle: 'Capturez sans friction',
    description: 'Travaillez librement pendant que tout ce que vous copiez est automatiquement envoyé vers votre page Notion.',
    color: 'from-violet-500 to-purple-600',
    highlight: 'violet'
  },
  {
    id: 'shortcuts',
    icon: Zap,
    title: 'Actions instantanées',
    subtitle: 'Clavier et souris',
    description: 'Utilisez le raccourci global ou glissez-déposez vos fichiers directement sur la bulle flottante.',
    color: 'from-blue-500 to-indigo-600',
    highlight: 'blue'
  },
  {
    id: 'bubble',
    icon: Eye,
    title: 'Contrôle discret',
    subtitle: 'Toujours accessible',
    description: 'La bulle reste visible pour surveiller vos clips, consulter les stats et gérer le mode en un clic.',
    color: 'from-indigo-500 to-violet-600',
    highlight: 'indigo'
  }
];

export const FocusModeIntro: React.FC<FocusModeIntroProps> = ({
  onComplete,
  onSkip,
  pageName = 'votre page'
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] p-4 [color-scheme:light]">
      <MotionDiv
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Progress bar minimaliste */}
        <div className="h-1 bg-gray-100">
          <MotionDiv
            className={`h-full bg-gradient-to-r ${currentStepData.color}`}
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Header compact */}
        <div className="relative px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentStepData.color} flex items-center justify-center shadow-sm`}>
                <Target size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">Mode Focus</h2>
                <p className="text-[12px] text-gray-500">
                  Étape {currentStep + 1} sur {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content avec scroll */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Hero section */}
              <div className="text-center space-y-3">
                <MotionDiv
                  className="flex justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${currentStepData.color} flex items-center justify-center shadow-lg`}>
                    <Icon size={36} className="text-white" />
                    {/* Effet de brillance */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/20 to-white/0" />
                  </div>
                </MotionDiv>

                <div>
                  <h3 className="text-[22px] font-semibold text-gray-900 mb-1">
                    {currentStepData.title}
                  </h3>
                  <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
                    {currentStepData.subtitle}
                  </p>
                </div>

                <p className="text-[15px] text-gray-600 leading-relaxed max-w-[400px] mx-auto">
                  {currentStepData.description}
                </p>
              </div>

              {/* Visual demo - contextuels */}
              <MotionDiv
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {/* Étape 1: Overview avec page active */}
                {currentStep === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-lg shadow-sm border border-gray-100">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentStepData.color} flex items-center justify-center flex-shrink-0`}>
                        <Check size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {pageName}
                        </p>
                        <p className="text-[12px] text-gray-500">
                          Page de destination active
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-md">
                          <Circle size={6} className="fill-current" />
                          Actif
                        </span>
                      </div>
                    </div>
                    
                    {/* Notification simulée */}
                    <MotionDiv
                      className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm border border-violet-100"
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles size={14} className="text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-gray-900 mb-0.5">
                          Contenu capturé
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Envoyé vers "{pageName}"
                        </p>
                      </div>
                    </MotionDiv>
                  </div>
                )}

                {/* Étape 2: Raccourcis et drag & drop */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* Raccourci clavier */}
                    <div className="bg-white p-4 rounded-lg border border-gray-100">
                      <p className="text-[12px] font-medium text-gray-700 mb-3">
                        Raccourci global
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <kbd className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[13px] font-semibold shadow-sm">
                          Ctrl
                        </kbd>
                        <span className="text-gray-400">+</span>
                        <kbd className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[13px] font-semibold shadow-sm">
                          Maj
                        </kbd>
                        <span className="text-gray-400">+</span>
                        <kbd className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[13px] font-semibold shadow-sm">
                          C
                        </kbd>
                        <MotionDiv
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight size={18} className={`text-${currentStepData.highlight}-600`} />
                        </MotionDiv>
                      </div>
                    </div>

                    {/* Drag & Drop zone */}
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-200">
                      <p className="text-[12px] font-medium text-gray-700 mb-3 text-center">
                        Glissez vos fichiers
                      </p>
                      <MotionDiv
                        className="flex flex-col items-center gap-2"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Upload size={28} className="text-gray-400" />
                        <p className="text-[11px] text-gray-500">
                          Directement sur la bulle
                        </p>
                      </MotionDiv>
                    </div>
                  </div>
                )}

                {/* Étape 3: Bulle flottante */}
                {currentStep === 2 && (
                  <div className="flex flex-col items-center gap-4">
                    {/* Bulle animée */}
                    <MotionDiv
                      className="relative"
                      animate={{
                        y: [0, -8, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
                        <Target size={32} className="text-white" />
                        
                        {/* Badge de notification */}
                        <MotionDiv
                          className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                        >
                          <span className="text-white text-[11px] font-bold">3</span>
                        </MotionDiv>

                        {/* Effet de pulsation */}
                        <MotionDiv
                          className="absolute inset-0 rounded-full bg-indigo-500"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0, 0.5]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                    </MotionDiv>

                    {/* Stats cards */}
                    <div className="w-full grid grid-cols-2 gap-2">
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-[11px] text-gray-500 mb-1">Clips envoyés</p>
                        <p className="text-[18px] font-bold text-gray-900">12</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-[11px] text-gray-500 mb-1">Actif depuis</p>
                        <p className="text-[18px] font-bold text-gray-900">2h</p>
                      </div>
                    </div>

                    <p className="text-[12px] text-gray-500 text-center">
                      Cliquez sur la bulle pour accéder au menu complet
                    </p>
                  </div>
                )}
              </MotionDiv>

              {/* Tips card - Design Apple moderne */}
              <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex items-start gap-3 p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <Sparkles size={14} className={`text-${currentStepData.highlight}-600`} />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-[12px] font-semibold text-gray-900 mb-1">
                    Astuce pro
                  </h4>
                  <p className="text-[12px] text-gray-600 leading-relaxed">
                    {currentStep === 0 && "Le Mode Focus continue de fonctionner en arrière-plan, même après avoir fermé l'application."}
                    {currentStep === 1 && "Vous pouvez glisser plusieurs fichiers à la fois vers la bulle pour les envoyer instantanément."}
                    {currentStep === 2 && "La bulle reste toujours au premier plan et peut être déplacée n'importe où sur votre écran."}
                  </p>
                </div>
              </MotionDiv>
            </MotionDiv>
          </AnimatePresence>
        </div>

        {/* Footer - Design épuré */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Retour
            </button>

            <div className="flex items-center gap-2">
              {/* Dots indicator */}
              <div className="flex gap-1.5 mr-3">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? `w-6 bg-gradient-to-r ${currentStepData.color}`
                        : index < currentStep
                        ? 'w-1.5 bg-emerald-500'
                        : 'w-1.5 bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <MotionButton
                onClick={handleNext}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold
                  bg-gradient-to-r ${currentStepData.color}
                  text-white shadow-lg transition-all
                  hover:shadow-xl hover:scale-[1.02]
                `}
                whileTap={{ scale: 0.98 }}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Check size={16} />
                    <span>Activer le Mode Focus</span>
                  </>
                ) : (
                  <>
                    <span>Suivant</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </MotionButton>
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};