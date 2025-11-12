// packages/ui/src/components/auth/NotionConnectScreen.tsx
// Écran de connexion Notion workspace - Design simplifié et épuré
import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { ExternalLink, Shield, AlertCircle } from 'lucide-react';

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
    <div className="w-full max-w-md mx-auto">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        {/* User info header */}
        {userEmail && (
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
              {userEmail[0].toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">Connecté en tant que</p>
              <p className="font-medium text-gray-900">{userEmail}</p>
            </div>
          </div>
        )}

        {/* Notion Logo */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl shadow-lg flex items-center justify-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
              alt="Notion"
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Connectez Notion
        </h1>
        <p className="text-sm text-gray-600 mb-8 max-w-sm mx-auto">
          Autorisez l'accès à votre workspace pour sauvegarder vos contenus
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 justify-center">
              <AlertCircle size={16} className="text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={connecting || loading}
          className="group relative w-full overflow-hidden rounded-xl transition-all duration-300 disabled:opacity-50 mb-4"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 group-hover:scale-105 transition-transform" />
          <div className="relative flex items-center justify-center gap-3 px-6 py-4">
            {connecting || loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white font-medium">Connexion...</span>
              </>
            ) : (
              <>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
                <span className="text-white font-medium">Connecter Notion</span>
                <ExternalLink size={16} className="text-white/80" />
              </>
            )}
          </div>
        </button>

        {/* Skip button */}
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={connecting || loading}
            className="w-full text-center py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Plus tard →
          </button>
        )}

        {/* Security note */}
        <div className="mt-6 p-3 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 justify-center">
            <Shield size={14} className="text-blue-600" />
            <p className="text-xs text-blue-900">
              Connexion sécurisée via OAuth officiel Notion
            </p>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}
