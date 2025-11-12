// packages/ui/src/components/auth/NotionConnectScreen.tsx
// Écran de connexion Notion workspace - Design Apple/Notion premium
import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { ExternalLink, Shield, Zap, CheckCircle, AlertCircle } from 'lucide-react';

export interface NotionConnectScreenProps {
  onConnect: () => Promise<void>;
  onSkip?: () => void;
  userEmail?: string;
  loading?: boolean;
}

export function NotionConnectScreen({
  onConnect,
  onSkip,
  userEmail,
  loading = false
}: NotionConnectScreenProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setConnecting(true);
    setError('');

    try {
      await onConnect();
    } catch (err: any) {
      console.error('[NotionConnect] Error:', err);
      setError(err.message || 'Erreur lors de la connexion à Notion');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
      {/* Background blur circles - Apple style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-200 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl mx-4"
      >
        {/* Card principale */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
          {/* Header avec user info */}
          {userEmail && (
            <div className="px-8 pt-8 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                  {userEmail[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Connecté en tant que</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{userEmail}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-8 py-12 text-center">
            {/* Notion Logo animé */}
            <MotionDiv
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl flex items-center justify-center transform hover:scale-105 transition-transform">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                  alt="Notion"
                  className="w-16 h-16 object-contain"
                />
              </div>
            </MotionDiv>

            {/* Title */}
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Connectez votre workspace
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
                Donnez accès à Notion Clipper pour sauvegarder vos contenus directement dans vos pages
              </p>
            </MotionDiv>

            {/* Features list */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-12 mb-8 space-y-4 max-w-md mx-auto"
            >
              {[
                {
                  icon: Zap,
                  title: 'Capture instantanée',
                  description: 'Sauvegardez en un clic'
                },
                {
                  icon: Shield,
                  title: 'Sécurisé et privé',
                  description: 'Vos données restent dans Notion'
                },
                {
                  icon: CheckCircle,
                  title: 'Toujours synchronisé',
                  description: 'Accessible sur tous vos appareils'
                }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <MotionDiv
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Icon size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white mb-0.5">
                        {feature.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </MotionDiv>
                );
              })}
            </MotionDiv>

            {/* Error message */}
            {error && (
              <MotionDiv
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400 text-left">
                    {error}
                  </p>
                </div>
              </MotionDiv>
            )}

            {/* Action buttons */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="space-y-3"
            >
              {/* Primary: Connect */}
              <button
                onClick={handleConnect}
                disabled={connecting || loading}
                className="group relative w-full overflow-hidden rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:scale-105 transition-transform duration-300" />

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative flex items-center justify-center gap-3 px-8 py-5">
                  {connecting || loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-white font-semibold text-lg">
                        Connexion...
                      </span>
                    </>
                  ) : (
                    <>
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                      <span className="text-white font-semibold text-lg">
                        Connecter Notion
                      </span>
                      <ExternalLink size={18} className="text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </>
                  )}
                </div>
              </button>

              {/* Secondary: Skip (optionnel) */}
              {onSkip && (
                <button
                  onClick={onSkip}
                  disabled={connecting || loading}
                  className="w-full text-center py-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors disabled:opacity-50"
                >
                  Je configurerai plus tard →
                </button>
              )}
            </MotionDiv>

            {/* Security note */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30"
            >
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 dark:text-blue-300 text-left leading-relaxed">
                  <strong>Sécurité garantie</strong> : Nous utilisons l'OAuth officiel de Notion.
                  Vos identifiants ne sont jamais stockés et vous pouvez révoquer l'accès à tout moment.
                </p>
              </div>
            </MotionDiv>
          </div>
        </div>

        {/* Footer info */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-gray-500 dark:text-gray-500">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Conditions d'utilisation
            </a>
          </p>
        </MotionDiv>
      </MotionDiv>
    </div>
  );
}
