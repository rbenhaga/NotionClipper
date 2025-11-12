// packages/ui/src/components/auth/AuthScreen.tsx
// Écran d'authentification moderne avec OAuth social et email/password
import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { Mail, Lock, User, Eye, EyeOff, Chrome } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

// Import Notion icon from assets
const NotionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
    <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="white"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 0.793 -1.873l54.92 -4.89c4.247 -0.35 6.437 -0.433 9.393 1.99l8.927 6.183c0.793 0.793 0.383 1.753 -0.793 1.873l-54.92 4.89c-0.397 0.04 -0.793 0.063 -1.327 0.063zM21.4 38.693l2.915 46.303c0.51 4.823 2.552 7.643 9.024 7.643 5.434 0 33.892 -0.663 43.992 -0.997 10.1 -0.333 12.083 -4.823 11.897 -9.646l-2.915 -55.313c-0.186 -4.823 -2.228 -7.643 -9.024 -7.643 -5.434 0 -33.892 0.663 -43.992 0.997 -10.1 0.333 -12.083 4.823 -11.897 9.646z" fill="currentColor"/>
  </svg>
);

export interface AuthScreenProps {
  supabaseClient: SupabaseClient;
  onAuthSuccess: (userId: string, email: string) => void;
  onError: (error: string) => void;
}

type AuthMode = 'choice' | 'signup' | 'login' | 'notion-email';

export function AuthScreen({
  supabaseClient,
  onAuthSuccess,
  onError
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notionUserId, setNotionUserId] = useState('');

  // ============================================
  // OAuth Google
  // ============================================
  const handleGoogleOAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) throw oauthError;

      // Le callback sera géré par la redirection
      console.log('[Auth] Google OAuth redirect initiated');
    } catch (err: any) {
      console.error('[Auth] Google OAuth error:', err);
      setError(err.message || 'Erreur lors de la connexion avec Google');
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // OAuth Notion (avec demande d'email après)
  // ============================================
  const handleNotionOAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: 'notion',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) throw oauthError;

      // Le callback sera géré par la redirection
      console.log('[Auth] Notion OAuth redirect initiated');
    } catch (err: any) {
      console.error('[Auth] Notion OAuth error:', err);
      setError(err.message || 'Erreur lors de la connexion avec Notion');
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Email/Password Signup
  // ============================================
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
            full_name: fullName || email.split('@')[0],
            provider: 'email',
          },
        },
      });

      if (signupError) throw signupError;

      if (data.user) {
        // Vérifier si l'email doit être confirmé
        if (data.user.identities?.length === 0) {
          setError('Un compte existe déjà avec cet email. Connectez-vous à la place.');
          setMode('login');
        } else {
          console.log('[Auth] User signed up:', data.user.id);
          onAuthSuccess(data.user.id, data.user.email!);
        }
      }
    } catch (err: any) {
      console.error('[Auth] Signup error:', err);
      setError(err.message || 'Erreur lors de l\'inscription');
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Email/Password Login
  // ============================================
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
      setError(err.message || 'Email ou mot de passe incorrect');
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Rendu: Choix de méthode d'authentification
  // ============================================
  if (mode === 'choice') {
    return (
      <div className="w-full max-w-md mx-auto p-8">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenue sur Notion Clipper
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connectez-vous pour commencer
          </p>
        </MotionDiv>

        <div className="space-y-6">
          {/* Section: Connexion rapide avec Notion (Flow unique) */}
          <div className="space-y-3">
            <div className="text-center mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                ⚡ Connexion rapide
              </p>
            </div>

            <button
              onClick={handleNotionOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-900 dark:hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <NotionIcon />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Continuer avec Notion</span>
                <span className="text-xs opacity-75">Authentification + Intégration en un clic</span>
              </div>
            </button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              🎯 Votre workspace Notion sera automatiquement connecté
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                ou utiliser un compte séparé
              </span>
            </div>
          </div>

          {/* Section: Authentification classique (nécessite connexion Notion après) */}
          <div className="space-y-3">
            <div className="text-center mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                🔐 Authentification classique
              </p>
            </div>

            {/* OAuth Google */}
            <button
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-50"
            >
              <Chrome size={24} className="text-[#4285F4]" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Continuer avec Google
              </span>
            </button>

            {/* Email/Password */}
            <button
              onClick={() => setMode('signup')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Mail size={20} />
              <span className="font-semibold">S'inscrire avec email</span>
            </button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              ℹ️ Vous devrez connecter votre workspace Notion après
            </p>

            <button
              onClick={() => setMode('login')}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Vous avez déjà un compte ? <span className="font-semibold underline">Se connecter</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Rendu: Formulaire Inscription
  // ============================================
  if (mode === 'signup') {
    return (
      <div className="w-full max-w-md mx-auto p-8">
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Créer un compte
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Remplissez les informations ci-dessous
          </p>
        </MotionDiv>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Nom complet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom complet (optionnel)
            </label>
            <div className="relative">
              <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mot de passe *
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum 8 caractères
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          {/* Back */}
          <button
            type="button"
            onClick={() => setMode('choice')}
            className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Retour
          </button>
        </form>
      </div>
    );
  }

  // ============================================
  // Rendu: Formulaire Connexion
  // ============================================
  return (
    <div className="w-full max-w-md mx-auto p-8">
      <MotionDiv
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bon retour !
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connectez-vous à votre compte
        </p>
      </MotionDiv>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        {/* Back */}
        <button
          type="button"
          onClick={() => setMode('choice')}
          className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          ← Retour
        </button>
      </form>
    </div>
  );
}
