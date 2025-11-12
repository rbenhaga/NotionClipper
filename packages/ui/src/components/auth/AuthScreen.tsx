// packages/ui/src/components/auth/AuthScreen.tsx
import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

const NotionLogo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="currentColor">
    <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="white"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 0.793 -1.873l54.92 -4.89c4.247 -0.35 6.437 -0.433 9.393 1.99l8.927 6.183c0.793 0.793 0.383 1.753 -0.793 1.873l-54.92 4.89c-0.397 0.04 -0.793 0.063 -1.327 0.063zM21.4 38.693l2.915 46.303c0.51 4.823 2.552 7.643 9.024 7.643 5.434 0 33.892 -0.663 43.992 -0.997 10.1 -0.333 12.083 -4.823 11.897 -9.646l-2.915 -55.313c-0.186 -4.823 -2.228 -7.643 -9.024 -7.643 -5.434 0 -33.892 0.663 -43.992 0.997 -10.1 0.333 -12.083 4.823 -11.897 9.646z"/>
  </svg>
);

export interface AuthScreenProps {
  supabaseClient: SupabaseClient;
  onAuthSuccess: (userId: string, email: string) => void;
  onError: (error: string) => void;
}

type AuthMode = 'choice' | 'signup' | 'login';

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect',
  'Email not confirmed': 'Veuillez confirmer votre email',
  'User already registered': 'Un compte existe déjà avec cet email',
  'Database error saving new user': 'Erreur lors de la création du compte. Réessayez.',
  'Password should be at least 8 characters': 'Le mot de passe doit contenir au moins 8 caractères',
  'Signup requires a valid password': 'Mot de passe requis',
  'Unable to validate email address': 'Adresse email invalide',
};

function translateError(errorMessage: string): string {
  for (const [key, translation] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return translation;
    }
  }
  return errorMessage;
}

export function AuthScreen({
  supabaseClient,
  onAuthSuccess,
  onError
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper pour ouvrir OAuth dans le navigateur externe (Electron)
  const openOAuthInBrowser = async (provider: 'google' | 'notion') => {
    try {
      const { data, error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: 'notionclipper://auth/callback',
        },
      });

      if (oauthError) throw oauthError;

      if (data?.url) {
        // Ouvrir dans le navigateur externe
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.invoke) {
          await electronAPI.invoke('open-external', data.url);
        } else {
          window.open(data.url, '_blank');
        }
      }
    } catch (err: any) {
      console.error(`[Auth] ${provider} OAuth error:`, err);
      const translatedError = translateError(err.message || `Erreur lors de la connexion avec ${provider}`);
      setError(translatedError);
      onError(translatedError);
    }
  };

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setError('');
    await openOAuthInBrowser('google');
    setLoading(false);
  };

  const handleNotionOAuth = async () => {
    setLoading(true);
    setError('');
    await openOAuthInBrowser('notion');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Email et mot de passe requis');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signupError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            provider: 'email',
          },
        },
      });

      if (signupError) throw signupError;

      if (data.user) {
        if (data.user.identities?.length === 0) {
          setError('Un compte existe déjà avec cet email');
          setMode('login');
        } else {
          console.log('[Auth] User signed up:', data.user.id);
          onAuthSuccess(data.user.id, data.user.email!);
        }
      }
    } catch (err: any) {
      console.error('[Auth] Signup error:', err);
      const translatedError = translateError(err.message || 'Erreur lors de l\'inscription');
      setError(translatedError);
      onError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Email et mot de passe requis');
      setLoading(false);
      return;
    }

    try {
      const { data, error: loginError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        console.log('[Auth] User logged in:', data.user.id);
        onAuthSuccess(data.user.id, data.user.email!);
      }
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      const translatedError = translateError(err.message || 'Erreur de connexion');
      setError(translatedError);
      onError(translatedError);
    } finally {
      setLoading(false);
    }
  };

  // Mode Choix
  if (mode === 'choice') {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto p-6">
        <div className="w-full max-w-sm">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <NotionLogo />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Notion Clipper
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connectez-vous pour commencer
            </p>
          </MotionDiv>

          <div className="space-y-3">
            {/* Notion OAuth */}
            <button
              onClick={handleNotionOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition-all disabled:opacity-50 font-medium"
            >
              <NotionLogo />
              <span>Continuer avec Notion</span>
            </button>

            {/* Google OAuth - Bouton standard */}
            <button
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 font-medium text-gray-700 dark:text-gray-200"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">ou</span>
              </div>
            </div>

            {/* Email */}
            <button
              onClick={() => setMode('signup')}
              className="w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium"
            >
              Créer un compte
            </button>

            <button
              onClick={() => setMode('login')}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
            >
              Déjà un compte ? <span className="underline font-medium">Se connecter</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mode Inscription
  if (mode === 'signup') {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto p-6">
        <div className="w-full max-w-sm">
          <MotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Créer un compte
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remplissez les informations ci-dessous
            </p>
          </MotionDiv>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum 8 caractères
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            <button
              type="button"
              onClick={() => setMode('choice')}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
            >
              ← Retour
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Mode Connexion
  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto p-6">
      <div className="w-full max-w-sm">
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Bon retour
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connectez-vous à votre compte
          </p>
        </MotionDiv>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <button
            type="button"
            onClick={() => setMode('choice')}
            className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
          >
            ← Retour
          </button>
        </form>
      </div>
    </div>
  );
}
