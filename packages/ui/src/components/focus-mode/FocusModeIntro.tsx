// packages/ui/src/components/focus-mode/FocusModeIntro.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Zap,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Move,
  Upload,
  MousePointer
} from 'lucide-react';

export interface FocusModeIntroProps {
  isOpen: boolean;
  onClose: () => void;
  pageName?: string;
}

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  illustration?: React.ReactNode;
}

export const FocusModeIntro: React.FC<FocusModeIntroProps> = ({
  isOpen,
  onClose,
  pageName = 'votre page'
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      icon: <Target size={32} />,
      title: 'Bienvenue dans le Mode Focus',
      description: `Le Mode Focus vous permet d'envoyer instantanément du contenu vers "${pageName}" sans rouvrir l'application.`
    },
    {
      icon: <Zap size={32} />,
      title: 'Envoi ultra-rapide',
      description: 'Appuyez sur Ctrl+Shift+C (ou Cmd+Shift+C sur Mac) pour envoyer le contenu de votre presse-papiers directement vers votre page.',
      illustration: (
        <div className="flex items-center gap-3 justify-center">
          <kbd className="px-3 py-2 bg-gray-800 rounded-lg text-sm font-mono shadow-lg">Ctrl</kbd>
          <span className="text-gray-400">+</span>
          <kbd className="px-3 py-2 bg-gray-800 rounded-lg text-sm font-mono shadow-lg">Shift</kbd>
          <span className="text-gray-400">+</span>
          <kbd className="px-3 py-2 bg-gray-800 rounded-lg text-sm font-mono shadow-lg">C</kbd>
        </div>
      )
    },
    {
      icon: <Sparkles size={32} />,
      title: 'Bulle flottante',
      description: 'Une petite bulle reste visible en permanence. Cliquez dessus pour envoyer rapidement du contenu.',
      illustration: (
        <div className="flex items-center justify-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl"
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 8px 32px rgba(59, 130, 246, 0.3)',
                '0 8px 40px rgba(59, 130, 246, 0.5)',
                '0 8px 32px rgba(59, 130, 246, 0.3)'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <Target size={20} className="text-white" />
          </motion.div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MousePointer size={14} />
              <span>Clic = envoi rapide</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Move size={14} />
              <span>Déplacer librement</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Upload size={14} />
              <span>Glisser-déposer des fichiers</span>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Check size={32} />,
      title: 'Vous êtes prêt !',
      description: 'Le Mode Focus est maintenant actif. Vous pouvez le désactiver à tout moment via le menu de la bulle (clic droit).'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl border border-gray-700/50 max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>

            {/* Content */}
            <div className="p-8 pt-12">
              {/* Icon */}
              <motion.div
                key={currentStep}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                  <div className="text-white">
                    {step.icon}
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                key={`title-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold text-white text-center mb-3"
              >
                {step.title}
              </motion.h2>

              {/* Description */}
              <motion.p
                key={`desc-${currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-300 text-center mb-8 leading-relaxed"
              >
                {step.description}
              </motion.p>

              {/* Illustration */}
              {step.illustration && (
                <motion.div
                  key={`illus-${currentStep}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8 p-6 bg-gray-800/50 rounded-2xl border border-gray-700/30"
                >
                  {step.illustration}
                </motion.div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-8">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-blue-500'
                        : index < currentStep
                        ? 'w-2 bg-blue-500/50'
                        : 'w-2 bg-gray-700'
                    }`}
                    animate={{
                      scale: index === currentStep ? 1.1 : 1
                    }}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-5 py-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-medium transition-colors"
                  >
                    Précédent
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  {isLastStep ? (
                    <>
                      <Check size={18} />
                      <span>C'est parti !</span>
                    </>
                  ) : (
                    <>
                      <span>Suivant</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};