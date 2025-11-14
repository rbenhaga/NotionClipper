// packages/ui/src/components/auth/AuthScreen.tsx
// Professional auth screen with i18n and app logo
import React, { useState, useEffect } from 'react';
import { MotionDiv } from '../common/MotionWrapper';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { useTranslation } from '@notion-clipper/i18n';
import { NotionClipperLogo } from '../../assets/icons';
import { authDataManager } from '../../services/AuthDataManager';

export interface AuthScreenProps {
  supabaseClient: SupabaseClient;
  supabaseUrl: string;
  supabaseKey: string;
  onAuthSuccess: (userId: string, email: string, notionData?: {
    token: string;
    workspace: { id: string; name: string; icon?: string };
  }, isSignup?: boolean) => void;
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
  supabaseUrl,
  supabaseKey,
  onAuthSuccess,
  onError
}: AuthScreenProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingNotion, setLoadingNotion] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState('');
  const [notionData, setNotionData] = useState<NotionOAuthData | null>(null);

  // ❌ REMOVED: AuthDataManager est déjà initialisé dans App.tsx
  // Ne pas réinitialiser ici car ça écrase supabaseUrl et supabaseKey

  // Notion OAuth - Opens in external browser
  const handleNotionOAuth = async () => {
    setLoadingNotion(true);
    setLoading(true); // Also set global loading to disable all buttons
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

      // 🔧 FIX: Check if this Notion workspace already exists in DB (auto-reconnect)
      try {
        console.log('[Auth] 🔍 Checking if workspace already linked to an account...');
        const checkResponse = await fetch(
          `${supabaseUrl}/functions/v1/get-user-by-workspace`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              workspaceId: authResult.workspace.id
            })
          }
        );

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();

          if (checkData.user) {
            // ✅ User found! Auto-reconnect without asking for email
            console.log('[Auth] ✅ Workspace already linked to user:', checkData.user.email);
            console.log('[Auth] 🔄 Auto-reconnecting user...');

            // Save auth data first
            await authDataManager.saveAuthData({
              userId: checkData.user.id,
              email: checkData.user.email,
              fullName: checkData.user.full_name,
              avatarUrl: checkData.user.avatar_url,
              authProvider: 'notion',
              notionToken: authResult.token,
              notionWorkspace: authResult.workspace,
              onboardingCompleted: true // Auto-complete onboarding for returning users
            });

            // Call success callback immediately (skip email step)
            onAuthSuccess(checkData.user.id, checkData.user.email, {
              token: authResult.token,
              workspace: authResult.workspace
            }, false); // isSignup = false (existing user)

            setLoadingNotion(false);
            setLoading(false);
            return; // Exit early - user reconnected successfully
          }
        }
      } catch (error) {
        console.error('[Auth] Failed to check existing workspace:', error);
        // Continue to email step if check fails
      }

      // Store Notion data with userId
      setNotionData({
        token: authResult.token,
        workspace: authResult.workspace,
        userId: authResult.userId // Stocker le userId
      });

      // Switch to email input mode (new user)
      console.log('[Auth] 📧 New workspace - requesting email...');
      setMode('notion-email');

    } catch (err: any) {
      console.error('[Auth] Notion OAuth error:', err);
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoadingNotion(false);
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

      // Success - utiliser le userId retourné par l'Edge Function
      const userId = notionData.userId || notionData.workspace.id;
      console.log('[Auth] Notion auth success, userId:', userId);

      // 🔧 FIX BUG #4 & #5 - Sauvegarder via AuthDataManager
      try {
        await authDataManager.saveAuthData({
          userId,
          email,
          fullName: null,
          avatarUrl: null,
          authProvider: 'notion',
          notionToken: notionData.token,
          notionWorkspace: notionData.workspace,
          onboardingCompleted: false // Sera mis à true après onboarding
        });

        console.log('[Auth] ✅ Auth data saved via AuthDataManager');
      } catch (saveError: any) {
        // 🔧 FIX BUG #6: Afficher une erreur claire à l'utilisateur
        console.error('[Auth] ❌ Failed to save auth data:', saveError);

        // Déterminer un message d'erreur clair pour l'utilisateur
        let userMessage = 'Une erreur est survenue lors de la sauvegarde de vos informations.';

        if (saveError.message?.includes('duplicate key')) {
          userMessage = 'Ce compte existe déjà. Veuillez vous connecter avec le même fournisseur que lors de votre inscription.';
        } else if (saveError.message?.includes('User not found')) {
          userMessage = 'Erreur lors de la création de votre compte. Veuillez réessayer.';
        } else if (saveError.message?.includes('Network')) {
          userMessage = 'Erreur réseau. Veuillez vérifier votre connexion internet.';
        }

        setError(userMessage);
        onError(userMessage);
        return; // Ne pas continuer si la sauvegarde a échoué
      }

      // Pass Notion data to parent to skip redundant Notion step in onboarding
      // Notion OAuth est toujours considéré comme une inscription (nouvel utilisateur)
      onAuthSuccess(userId, email, {
        token: notionData.token,
        workspace: notionData.workspace
      }, true);

    } catch (err: any) {
      console.error('[Auth] Notion email submit error:', err);

      // 🔧 FIX BUG #6: Message d'erreur plus clair
      const userMessage = err.message || 'Une erreur est survenue lors de la connexion.';
      setError(userMessage);
      onError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth - Direct OAuth without Supabase
  const handleGoogleOAuth = async () => {
    setLoadingGoogle(true);
    setLoading(true); // Also set global loading to disable all buttons
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

      // 🔧 FIX: Check if this is a returning user (userId exists in DB)
      // If userId is different from email, it means user already exists
      const isReturningUser = userId && userId !== googleEmail;
      const shouldCompleteOnboarding = isReturningUser;

      console.log('[Auth]', isReturningUser ? '🔄 Returning user' : '🆕 New user');

      // 🔧 FIX BUG #4 & #5 - Sauvegarder via AuthDataManager
      try {
        await authDataManager.saveAuthData({
          userId: userId || googleEmail,
          email: googleEmail,
          fullName: googleName || null,
          avatarUrl: googlePicture || null,
          authProvider: 'google',
          onboardingCompleted: shouldCompleteOnboarding // Auto-complete for returning users
        });

        console.log('[Auth] ✅ Auth data saved via AuthDataManager');
      } catch (saveError: any) {
        // 🔧 FIX BUG #6: Afficher une erreur claire à l'utilisateur
        console.error('[Auth] ❌ Failed to save auth data:', saveError);

        // Déterminer un message d'erreur clair pour l'utilisateur
        let userMessage = 'Une erreur est survenue lors de la sauvegarde de vos informations.';

        if (saveError.message?.includes('duplicate key')) {
          userMessage = 'Ce compte Google existe déjà. Veuillez vous connecter.';
        } else if (saveError.message?.includes('User not found')) {
          userMessage = 'Erreur lors de la création de votre compte. Veuillez réessayer.';
        } else if (saveError.message?.includes('Network')) {
          userMessage = 'Erreur réseau. Veuillez vérifier votre connexion internet.';
        }

        setError(userMessage);
        onError(userMessage);
        return; // Ne pas continuer si la sauvegarde a échoué
      }

      // 🔧 FIX: Load Notion connection from DB for returning users
      let notionData: { token: string; workspace: { id: string; name: string; icon?: string } } | undefined;

      if (isReturningUser) {
        console.log('[Auth] 🔄 Returning user - checking for existing Notion connection...');
        try {
          // Force refresh to load data from Supabase (including Notion token if exists)
          const authData = await authDataManager.loadAuthData(true);

          if (authData?.notionToken && authData?.notionWorkspace) {
            console.log('[Auth] ✅ Notion connection found for returning user');
            notionData = {
              token: authData.notionToken,
              workspace: authData.notionWorkspace
            };
          } else {
            console.log('[Auth] ℹ️ No Notion connection found for returning user');
          }
        } catch (loadError) {
          console.error('[Auth] ⚠️ Failed to load Notion connection:', loadError);
          // Continue anyway - user can reconnect Notion if needed
        }
      }

      // Success
      console.log('[Auth] Google auth success, userId:', userId, notionData ? 'with Notion data' : 'without Notion data');
      onAuthSuccess(userId || googleEmail, googleEmail, notionData, !isReturningUser); // isSignup = true only for new users

    } catch (err: any) {
      console.error('[Auth] Google OAuth error:', err);

      // 🔧 FIX BUG #6: Message d'erreur plus clair
      const errorKey = getErrorTranslationKey(err.message);
      const userMessage = t(errorKey as any) || 'Une erreur est survenue lors de la connexion avec Google.';
      setError(userMessage);
      onError(userMessage);
    } finally {
      setLoadingGoogle(false);
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError(t('auth.emailAndPasswordRequired'));
      setLoadingEmail(false);
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      setLoadingEmail(false);
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

          // 🔧 CRITICAL FIX: Save to AuthDataManager to create user_profiles record
          try {
            await authDataManager.saveAuthData({
              userId: data.user.id,
              email: data.user.email!,
              fullName: data.user.user_metadata?.full_name || null,
              avatarUrl: data.user.user_metadata?.avatar_url || null,
              authProvider: 'email',
              onboardingCompleted: false
            });
            console.log('[Auth] ✅ User profile created via AuthDataManager');
          } catch (saveError: any) {
            console.error('[Auth] Error saving user profile:', saveError);
            // Show user-friendly error
            let errorMessage = 'Une erreur est survenue lors de la création du profil.';
            if (saveError.message?.includes('duplicate key')) {
              errorMessage = 'Ce compte existe déjà. Veuillez vous connecter.';
            }
            setError(errorMessage);
            setLoadingEmail(false);
            setLoading(false);
            return;
          }

          onAuthSuccess(data.user.id, data.user.email!, undefined, true); // isSignup = true
        }
      }
    } catch (err: any) {
      console.error('[Auth] Signup error:', err);
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoadingEmail(false);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError(t('auth.emailAndPasswordRequired'));
      setLoadingEmail(false);
      setLoading(false);
      return;
    }

    try {
      // 🔧 FIX: Check if account exists with different OAuth provider
      // If no profile exists (provider = null), still allow login attempt - Supabase Auth will validate
      const provider = await checkEmailProvider(supabaseClient, email);

      // Only block if account explicitly exists with different OAuth provider
      if (provider && provider !== 'email') {
        if (provider === 'google') {
          setError('Ce compte existe avec Google. Veuillez vous connecter avec Google.');
          setLoading(false);
          return;
        }

        if (provider === 'notion') {
          setError('Ce compte existe avec Notion. Veuillez vous connecter avec Notion.');
          setLoading(false);
          return;
        }
      }

      // Attempt login - Supabase Auth will validate if credentials are correct
      const { data, error: loginError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (data.user) {
        console.log('[Auth] User logged in:', data.user.id);

        // 🔧 FIX BUG #4 & #5 - Sauvegarder via AuthDataManager
        await authDataManager.saveAuthData({
          userId: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name || null,
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          authProvider: 'email',
          onboardingCompleted: false
        });

        // 🔧 FIX: Load Notion connection from DB for returning users
        let notionData: { token: string; workspace: { id: string; name: string; icon?: string } } | undefined;

        console.log('[Auth] 🔄 Returning user (login) - checking for existing Notion connection...');
        try {
          // Force refresh to load data from Supabase (including Notion token if exists)
          const authData = await authDataManager.loadAuthData(true);

          if (authData?.notionToken && authData?.notionWorkspace) {
            console.log('[Auth] ✅ Notion connection found for returning user');
            notionData = {
              token: authData.notionToken,
              workspace: authData.notionWorkspace
            };
          } else {
            console.log('[Auth] ℹ️ No Notion connection found for returning user');
          }
        } catch (loadError) {
          console.error('[Auth] ⚠️ Failed to load Notion connection:', loadError);
          // Continue anyway - user can reconnect Notion if needed
        }

        console.log('[Auth] Email login success, userId:', data.user.id, notionData ? 'with Notion data' : 'without Notion data');
        onAuthSuccess(data.user.id, data.user.email!, notionData, false); // isSignup = false (login)
      }
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      const errorKey = getErrorTranslationKey(err.message);
      setError(t(errorKey as any));
      onError(err.message);
    } finally {
      setLoadingEmail(false);
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
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
            >
              {loadingNotion ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                  alt="Notion"
                  width="20"
                  height="20"
                  className="object-contain"
                />
              )}
              <span>{loadingNotion ? t('auth.connecting') : t('auth.continueWithNotion')}</span>
            </button>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
            >
              {loadingGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              <span>{loadingGoogle ? t('auth.connecting') : t('auth.continueWithGoogle')}</span>
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
              <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-200">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" 
                  alt="Notion"
                  width="40"
                  height="40"
                  className="object-contain"
                />
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
