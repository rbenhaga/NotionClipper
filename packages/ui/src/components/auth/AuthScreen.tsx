// packages/ui/src/components/auth/AuthScreen.tsx
// Écran d'authentification moderne avec OAuth social et email/password
import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { Mail, Lock, User, Eye, EyeOff, Chrome, Apple as AppleIcon } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthScreenProps {
  supabaseClient: SupabaseClient;
  onAuthSuccess: (userId: string, email: string) => void;
  onError: (error: string) => void;
}

type AuthMode = 'choice' | 'signup' | 'login';

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

  // ============================================
  // OAuth Social (Google, Apple)
  // ============================================
  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');

    try {
      const { data, error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) throw oauthError;

      // Le callback sera géré par la redirection
      console.log('[Auth] OAuth redirect initiated:', provider);
    } catch (err: any) {
      console.error('[Auth] OAuth error:', err);
      setError(err.message || `Erreur lors de la connexion avec ${provider}`);
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

        <div className="space-y-4">
          {/* OAuth Google */}
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-50"
          >
            <Chrome size={24} className="text-[#4285F4]" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Continuer avec Google
            </span>
          </button>

          {/* OAuth Apple */}
          <button
            onClick={() => handleOAuthLogin('apple')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-900 dark:hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            <AppleIcon size={24} />
            <span className="font-semibold">
              Continuer avec Apple
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                ou
              </span>
            </div>
          </div>

          {/* Email/Password */}
          <button
            onClick={() => setMode('signup')}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Mail size={20} />
            <span className="font-semibold">S'inscrire avec email</span>
          </button>

          <button
            onClick={() => setMode('login')}
            className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Vous avez déjà un compte ? <span className="font-semibold underline">Se connecter</span>
          </button>
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
