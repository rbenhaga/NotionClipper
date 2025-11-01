import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import { AlertCircle, RefreshCcw, Shield, Loader2 } from 'lucide-react';

interface AuthStatus {
  isValid: boolean;
  needsReauth: boolean;
  error?: string;
}

interface AuthStatusCheckerProps {
  onAuthRequired?: () => void;
  children?: React.ReactNode;
}

export const AuthStatusChecker: React.FC<AuthStatusCheckerProps> = ({
  onAuthRequired,
  children
}) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsChecking(true);

      if (window.electronAPI?.invoke) {
        const status = await window.electronAPI.invoke('notion:check-auth-status');
        setAuthStatus(status);

        if (status.needsReauth && onAuthRequired) {
          onAuthRequired();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({
        isValid: false,
        needsReauth: true,
        error: 'Failed to check authentication status'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceReauth = async () => {
    try {
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('notion:force-reauth');
        if (onAuthRequired) {
          onAuthRequired();
        }
      }
    } catch (error) {
      console.error('Error forcing reauth:', error);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    // Vérifier périodiquement le statut (toutes les 5 minutes)
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Si on est en train de vérifier, ne rien afficher
  if (isChecking) {
    return <>{children}</>;
  }

  // Si l'authentification est valide, afficher les enfants normalement
  if (authStatus?.isValid) {
    return <>{children}</>;
  }

  // Si l'authentification est requise - Design Notion/Apple
  if (authStatus?.needsReauth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <MotionDiv
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: 'spring', 
            duration: 0.5,
            bounce: 0.3
          }}
          className="max-w-md w-full"
        >
          {/* Card principale */}
          <div className="bg-white dark:bg-[#191919] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header avec icône d'alerte */}
            <div className="p-8 text-center border-b border-gray-100 dark:border-gray-800">
              {/* Icône avec gradient background */}
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-600/10 flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-br from-red-200/30 to-transparent dark:from-red-500/20 rounded-2xl blur-xl -z-10" />
              </div>

              {/* Titre */}
              <h2 className="text-[22px] font-semibold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
                Authentification requise
              </h2>

              {/* Message d'erreur */}
              <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
                {authStatus.error || 'Votre session Notion a expiré. Veuillez vous reconnecter pour continuer.'}
              </p>
            </div>

            {/* Corps avec actions */}
            <div className="p-8 space-y-4">
              {/* Bouton principal - Reconnecter */}
              <button
                onClick={handleForceReauth}
                className="
                  group relative w-full overflow-hidden
                  flex items-center justify-center gap-2.5
                  px-6 py-3.5
                  bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200
                  hover:from-gray-800 hover:to-gray-700 dark:hover:from-white dark:hover:to-gray-100
                  text-white dark:text-gray-900
                  rounded-xl
                  font-semibold text-[15px]
                  shadow-lg shadow-gray-900/20 dark:shadow-gray-100/10
                  transition-all duration-200
                  hover:shadow-xl hover:-translate-y-0.5
                "
              >
                <Shield className="w-4 h-4" strokeWidth={2.5} />
                <span>Se reconnecter avec Notion</span>
              </button>

              {/* Bouton secondaire - Vérifier */}
              <button
                onClick={checkAuthStatus}
                className="
                  group w-full
                  flex items-center justify-center gap-2.5
                  px-6 py-3
                  bg-gray-50 dark:bg-gray-800/50
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  text-gray-700 dark:text-gray-300
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  font-medium text-[14px]
                  transition-all duration-200
                  hover:shadow-sm
                "
              >
                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" strokeWidth={2} />
                <span>Vérifier à nouveau</span>
              </button>
            </div>

            {/* Footer informatif */}
            <div className="px-8 pb-8">
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[13px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Pourquoi cela arrive-t-il ?
                    </h4>
                    <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      Les sessions Notion expirent automatiquement après un certain temps pour protéger vos données.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
    );
  }

  // Fallback - afficher les enfants
  return <>{children}</>;
};

export default AuthStatusChecker;