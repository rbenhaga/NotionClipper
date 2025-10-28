// packages/ui/src/components/permissions/ClipboardPermissionPopup.tsx - NOTION STYLE
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Shield,
  Check,
  X,
  Info,
  Lock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export interface ClipboardPermissionPopupProps {
  onAllow: () => void;
  onDeny: () => void;
  onLearnMore?: () => void;
  variant?: 'modal' | 'inline';
}

export function ClipboardPermissionPopup({
  onAllow,
  onDeny,
  onLearnMore,
  variant = 'modal'
}: ClipboardPermissionPopupProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleAllow = () => {
    // Animation de confirmation avant callback
    setTimeout(onAllow, 300);
  };

  if (variant === 'inline') {
    // Version inline pour intégration dans l'onboarding
    return (
      <motion.div
        className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl p-6 border border-blue-100 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <motion.div
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Copy size={20} className="text-white" />
            </motion.div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Autorisation du presse-papier
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Clipper Pro souhaite accéder à votre presse-papier pour capturer automatiquement le contenu que vous copiez.
            </p>

            {/* Détails déroulants */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
            >
              <Info size={12} />
              Pourquoi cette permission ?
              <ChevronRight size={12} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-white/80 rounded-lg mb-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5" />
                      <p className="text-xs text-gray-600">
                        <strong>Capture intelligente :</strong> Détecte automatiquement quand vous copiez du texte ou des images
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5" />
                      <p className="text-xs text-gray-600">
                        <strong>Gain de temps :</strong> Plus besoin de basculer entre les applications
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5" />
                      <p className="text-xs text-gray-600">
                        <strong>Contrôle total :</strong> Vous pouvez désactiver cette fonction à tout moment
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAllow}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Autoriser l'accès
              </button>
              <button
                onClick={onDeny}
                className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Plus tard
              </button>
            </div>

            {/* Note de confidentialité */}
            <div className="mt-4 flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <Lock size={12} className="text-gray-400 mt-0.5" />
              <p className="text-xs text-gray-600">
                Vos données restent privées. Clipper Pro ne collecte que le contenu que vous choisissez de capturer.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Version modal (popup standalone)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header avec gradient */}
        <div className="relative h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/10" />
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10"
          >
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Copy size={32} className="text-white" />
            </div>
          </motion.div>

          {/* Bouton fermer */}
          <button
            onClick={onDeny}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Accès au presse-papier
            </h2>
            <p className="text-sm text-gray-600">
              Permettez à Clipper Pro de capturer automatiquement vos idées
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Capture intelligente</p>
                <p className="text-xs text-gray-600">Détection automatique du contenu copié</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield size={16} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">100% Privé</p>
                <p className="text-xs text-gray-600">Aucune donnée n'est partagée</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Check size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Contrôle total</p>
                <p className="text-xs text-gray-600">Désactivable à tout moment</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleAllow}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              Autoriser l'accès
            </button>

            <div className="flex gap-3">
              <button
                onClick={onDeny}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                Plus tard
              </button>

              {onLearnMore && (
                <button
                  onClick={onLearnMore}
                  className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  En savoir plus
                </button>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500">
              En autorisant l'accès, vous acceptez que Clipper Pro puisse lire le contenu de votre presse-papier uniquement lorsque l'extension est active.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Composant pour intégration dans l'onboarding
export function ClipboardPermissionStep({
  onAllow,
  onDeny
}: Pick<ClipboardPermissionPopupProps, 'onAllow' | 'onDeny'>) {
  return <ClipboardPermissionPopup onAllow={onAllow} onDeny={onDeny} variant="inline" />;
}