// packages/ui/src/components/focus-mode/FocusModeIntro.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Target,
  Keyboard,
  Mouse,
  FileUp,
  CheckCircle2,
  ArrowRight,
  X
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

export interface FocusModeIntroProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const FocusModeIntro: React.FC<FocusModeIntroProps> = ({ onComplete, onSkip }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const steps = [
    {
      icon: Target,
      title: t('focusMode.step1Title'),
      description: t('focusMode.step1Description'),
      color: '#3b82f6'
    },
    {
      icon: Zap,
      title: t('focusMode.step2Title'),
      description: t('focusMode.step2Description'),
      color: '#8b5cf6'
    },
    {
      icon: Mouse,
      title: t('focusMode.step3Title'),
      description: t('focusMode.step3Description'),
      color: '#06b6d4'
    },
    {
      icon: FileUp,
      title: t('focusMode.step4Title'),
      description: t('focusMode.step4Description'),
      color: '#10b981'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      if (typeof onComplete === 'function') {
        onComplete();
      } else {
        console.error('onComplete is not a function');
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'Escape') {
      onSkip();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={onSkip}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg"
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(40px)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full
                     hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>

        {/* Contenu */}
        <div className="p-8">
          {/* Indicateurs de progression */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className="h-1.5 rounded-full"
                style={{
                  width: index === currentStep ? 32 : 8,
                  backgroundColor: index === currentStep ? step.color : '#e5e7eb'
                }}
                animate={{
                  width: index === currentStep ? 32 : 8,
                  backgroundColor: index === currentStep ? step.color : '#e5e7eb'
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
          </div>

          {/* Icône animée */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 50 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col items-center text-center"
            >
              {/* Icône */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)`,
                  boxShadow: `0 8px 24px ${step.color}40`
                }}
              >
                <Icon size={40} className="text-white" strokeWidth={2} />
              </div>

              {/* Titre */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed max-w-md">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            {/* Bouton précédent */}
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900
                         disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              {t('common.previous')}
            </button>

            {/* Bouton suivant/terminer */}
            <motion.button
              onClick={handleNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-xl text-white font-medium flex items-center gap-2
                         shadow-lg hover:shadow-xl transition-shadow"
              style={{
                background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)`
              }}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>{t('common.start')}</span>
                </>
              ) : (
                <>
                  <span>{t('common.next')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </div>

          {/* Hint clavier */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              <Keyboard size={12} className="inline mr-1" />
              {t('focusMode.keyboardHint')}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FocusModeIntro;
