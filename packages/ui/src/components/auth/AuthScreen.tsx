// packages/ui/src/components/auth/AuthScreen.tsx
// Professional auth screen with i18n and app logo
import React, { useState } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useTranslation } from '@notion-clipper/i18n';
import { NotionClipperLogo } from '../../assets/icons';

export interface AuthScreenProps {
  supabaseClient: SupabaseClient;
  onAuthSuccess: (userId: string, email: string, notionData?: {
    token: string;
    workspace: { id: string; name: string; icon?: string };
  }) => void;
  onError: (error: string) => void;
}

type AuthMode = 'choice' | 'signup' | 'login' | 'notion-email';

interface NotionOAuthData {
  token: string;
  userId?: string;
  workspace: {
    id: string;
    name: string;
    icon?: string;
  };
}

// Helper to translate Supabase errors
function getErrorTranslationKey(errorMessage: string): string {
  if (errorMessage.includes('Invalid login credentials')) return 'auth.emailOrPasswordIncorrect';
  if (errorMessage.includes('Email not confirmed')) return 'auth.emailNotConfirmed';
  if (errorMessage.includes('User already registered')) return 'auth.userAlreadyRegistered';
  if (errorMessage.includes('Database error')) return 'auth.databaseError';
  if (errorMessage.includes('Password should be at least')) return 'auth.passwordTooShort';
  if (errorMessage.includes('Signup requires a valid password')) return 'auth.passwordRequired';
  if (errorMessage.includes('Unable to validate email')) return 'auth.emailInvalid';
  return 'auth.authError';
}

// Helper to check which auth provider owns an email
async function checkEmailProvider(supabaseClient: SupabaseClient, email: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('auth_provider')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Error checking email provider:', error);
      return null;
    }

    return data?.auth_provider || null;
  } catch (err) {
    console.error('[Auth] Exception checking email provider:', err);
    return null;
  }
}

export function AuthScreen({
  supabaseClient,
  onAuthSuccess,
  onError
}: AuthScreenProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notionData, setNotionData] = useState<NotionOAuthData | null>(null);

  // Notion OAuth - Opens in external browser
  const handleNotionOAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.invoke) {
        throw new Error('Electron API not available');
      }

      // Start OAuth flow - get the authorization URL
      const result = await electronAPI.invoke('notion:startOAuth');

      if (!result || !result.success) {
        throw new Error(result?.error || t('auth.oauthError'));
      }

      if (!result.authUrl) {
        throw new Error('No auth URL returned');
      }

      // Open OAuth URL in external browser
      console.log('[Auth] Opening Notion OAuth in browser...');
      await electronAPI.invoke('open-external', result.authUrl);

      // Wait for OAuth callback from the server
      console.log('[Auth] Waiting for OAuth callback...');
      const authResult: any = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('OAuth timeout - no callback received after 5 minutes'));
        }, 5 * 60 * 1000);

        electronAPI.on('oauth:result', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      if (!authResult.success) {
        throw new Error(authResult.error || t('auth.oauthError'));
      }

      // Notion OAuth successful - workspace connected
      console.log('[Auth] Notion OAuth successful, workspace:', authResult.workspace?.name);

      // Store Notion data with userId
      setNotionData({
        token: authResult.token,
        workspace: authResult.workspace,
        userId: authResult.userId // Stocker le userId
      });

      // Switch to email input mode
      setMode('notion-email');

    } catch (err: any) {
      console.error('[Auth] Notion OAuth error:', err);
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete Notion OAuth - Pas besoin de créer de compte, juste stocker les infos
  const handleNotionEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionData || !email) return;

    setLoading(true);
    setError('');

    try {
      console.log('[Auth] Notion OAuth completed for workspace:', notionData.workspace.name);

      // Stocker les infos localement (pas de compte Supabase Auth nécessaire)
      localStorage.setItem('notion_token', notionData.token);
      localStorage.setItem('notion_workspace', JSON.stringify(notionData.workspace));
      localStorage.setItem('user_email', email);
      localStorage.setItem('auth_provider', 'notion');

      // Success - utiliser le userId retourné par l'Edge Function
      const userId = notionData.userId || notionData.workspace.id;
      console.log('[Auth] Notion auth success, userId:', userId);

      // Pass Notion data to parent to skip redundant Notion step in onboarding
      onAuthSuccess(userId, email, {
        token: notionData.token,
        workspace: notionData.workspace
      });

    } catch (err: any) {
      console.error('[Auth] Notion email submit error:', err);
      setError(err.message);
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth - Direct OAuth without Supabase
  const handleGoogleOAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.invoke) {
        throw new Error('Electron API not available');
      }

      // Start Google OAuth flow
      const result = await electronAPI.invoke('auth:startGoogleOAuth');

      if (!result || !result.success) {
        throw new Error(result?.error || t('auth.oauthError'));
      }

      if (!result.authUrl) {
        throw new Error('No auth URL returned');
      }

      // Open OAuth URL in external browser
      console.log('[Auth] Opening Google OAuth in browser...');
      await electronAPI.invoke('open-external', result.authUrl);

      // Wait for OAuth callback with user info
      console.log('[Auth] Waiting for Google OAuth callback...');
      const authResult: any = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('OAuth timeout - no callback received after 5 minutes'));
        }, 5 * 60 * 1000);

        electronAPI.on('auth:oauth-result', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      if (!authResult.success) {
        throw new Error(authResult.error || t('auth.oauthError'));
      }

      console.log('[Auth] Google OAuth successful');

      // Extract user info from Google (déjà créé par l'Edge Function)
      const googleEmail = authResult.userInfo?.email;
      const googleName = authResult.userInfo?.name;
      const googlePicture = authResult.userInfo?.picture;
      const userId = authResult.userInfo?.userId || authResult.userId;

      if (!googleEmail) {
        throw new Error('No email received from Google');
      }

      console.log('[Auth] Google user authenticated:', googleEmail);
      
      // Stocker les infos localement (pas de compte Supabase Auth nécessaire)
      localStorage.setItem('user_email', googleEmail);
      localStorage.setItem('user_name', googleName || '');
      localStorage.setItem('user_picture', googlePicture || '');
      localStorage.setItem('auth_provider', 'google');
      
      // Success
      console.log('[Auth] Google auth success, userId:', userId);
      onAuthSuccess(userId || googleEmail, googleEmail);

    } catch (err: any) {
      console.error('[Auth] Google OAuth error:', err);
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError(t('auth.emailAndPasswordRequired'));
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
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
          // Email already registered - check which provider
          const provider = await checkEmailProvider(supabaseClient, email);
          if (provider === 'google') {
            setError('This email is already registered with Google. Please sign in with Google.');
          } else if (provider === 'notion') {
            setError('This email is already registered with Notion. Please sign in with Notion.');
          } else {
            setError(t('auth.userAlreadyRegistered'));
          }
          setMode('login');
        } else {
          console.log('[Auth] User signed up:', data.user.id);
          onAuthSuccess(data.user.id, data.user.email!);
        }
      }
    } catch (err: any) {
      console.error('[Auth] Signup error:', err);
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError(t('auth.emailAndPasswordRequired'));
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
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Choice mode
  if (mode === 'choice') {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
        <div className="w-full max-w-sm">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="flex justify-center mb-4">
              <NotionClipperLogo size={64} />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('auth.appName')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.connectToStart')}
            </p>
          </MotionDiv>

          <div className="space-y-3">
            {/* Notion OAuth */}
            <button
              onClick={handleNotionOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition-all disabled:opacity-50 font-medium text-sm shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 0.793 -1.873l54.92 -4.89c4.247 -0.35 6.437 -0.433 9.393 1.99l8.927 6.183c0.793 0.793 0.383 1.753 -0.793 1.873l-54.92 4.89c-0.397 0.04 -0.793 0.063 -1.327 0.063zM21.4 38.693l2.915 46.303c0.51 4.823 2.552 7.643 9.024 7.643 5.434 0 33.892 -0.663 43.992 -0.997 10.1 -0.333 12.083 -4.823 11.897 -9.646l-2.915 -55.313c-0.186 -4.823 -2.228 -7.643 -9.024 -7.643 -5.434 0 -33.892 0.663 -43.992 0.997 -10.1 0.333 -12.083 4.823 -11.897 9.646z"/>
              </svg>
              <span>{t('auth.continueWithNotion')}</span>
            </button>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 font-medium text-sm shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              <span>{t('auth.continueWithGoogle')}</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">{t('auth.or')}</span>
              </div>
            </div>

            {/* Email */}
            <button
              onClick={() => setMode('signup')}
              className="w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium text-sm shadow-sm"
            >
              {t('auth.continueWithEmail')}
            </button>

            <button
              onClick={() => setMode('login')}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
            >
              {t('auth.alreadyHaveAccount')} <span className="underline font-medium">{t('auth.signIn')}</span>
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

  // Signup mode
  if (mode === 'signup') {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
        <div className="w-full max-w-sm">
          <MotionDiv
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center mb-4"
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('auth.createAccount')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.fillInformation')}
            </p>
          </MotionDiv>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.email')}
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
                {t('auth.password')}
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
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('auth.passwordMinLength')}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 text-sm"
              >
                {loading ? t('auth.creatingAccount') : t('auth.signUpButton')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('choice');
                  setError('');
                }}
                className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
              >
                {t('auth.alreadyHaveAccount')} <span className="underline font-medium">{t('auth.signIn')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Notion email mode - Ask for email after Notion OAuth
  if (mode === 'notion-email') {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
        <div className="w-full max-w-sm">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-black dark:bg-white flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 100 100" fill="currentColor" className="text-white dark:text-black">
                  <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 0.793 -1.873l54.92 -4.89c4.247 -0.35 6.437 -0.433 9.393 1.99l8.927 6.183c0.793 0.793 0.383 1.753 -0.793 1.873l-54.92 4.89c-0.397 0.04 -0.793 0.063 -1.327 0.063zM21.4 38.693l2.915 46.303c0.51 4.823 2.552 7.643 9.024 7.643 5.434 0 33.892 -0.663 43.992 -0.997 10.1 -0.333 12.083 -4.823 11.897 -9.646l-2.915 -55.313c-0.186 -4.823 -2.228 -7.643 -9.024 -7.643 -5.434 0 -33.892 0.663 -43.992 0.997 -10.1 0.333 -12.083 4.823 -11.897 9.646z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {notionData?.workspace.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.notionConnected')}
            </p>
          </MotionDiv>

          <form onSubmit={handleNotionEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder={t('auth.enterEmail')}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {t('auth.notionEmailHelp')}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? t('auth.creatingAccount') : t('auth.continueButton')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Login mode
  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
      <div className="w-full max-w-sm">
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center mb-4"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('auth.welcomeBack')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('auth.connectToStart')}
          </p>
        </MotionDiv>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.email')}
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
              {t('auth.password')}
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
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? t('auth.signingIn') : t('auth.signInButton')}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('choice');
                setError('');
              }}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
            >
              {t('auth.noAccount')} <span className="underline font-medium">{t('auth.signUp')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
