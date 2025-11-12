// packages/ui/src/contexts/AuthContext.tsx
// Context d'authentification - Gère l'état auth globalement
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface AuthContextValue {
  // État
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  // Profil utilisateur
  profile: UserProfile | null;

  // Actions
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user: User | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  auth_provider: string;
  created_at: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
  supabaseClient: SupabaseClient;
}

export function AuthProvider({ children, supabaseClient }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ============================================
  // Charger le profil utilisateur
  // ============================================
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Error loading profile:', error);
        return null;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('[Auth] Exception loading profile:', err);
      return null;
    }
  }, [supabaseClient]);

  // ============================================
  // Initialiser la session au montage
  // ============================================
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        console.log('[Auth] 🔐 Initializing auth...');

        // Récupérer la session actuelle
        const { data: { session: currentSession }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('[Auth] Error getting session:', error);
          return;
        }

        if (mounted) {
          if (currentSession) {
            console.log('[Auth] ✅ Session found:', currentSession.user.id);
            setSession(currentSession);
            setUser(currentSession.user);

            // Charger le profil
            await loadUserProfile(currentSession.user.id);
          } else {
            console.log('[Auth] ℹ️ No session found');
            setSession(null);
            setUser(null);
            setProfile(null);
          }

          setInitialized(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Exception initializing:', err);
        if (mounted) {
          setInitialized(true);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [supabaseClient, loadUserProfile]);

  // ============================================
  // Écouter les changements d'auth
  // ============================================
  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[Auth] Auth state changed:', event);

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

          // Charger le profil si nouveau user
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await loadUserProfile(currentSession.user.id);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient, loadUserProfile]);

  // ============================================
  // Inscription email/password
  // ============================================
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      console.log('[Auth] 📝 Signing up user:', email);

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
            provider: 'email',
          },
        },
      });

      if (error) {
        console.error('[Auth] Signup error:', error);
        return { user: null, error };
      }

      if (data.user) {
        console.log('[Auth] ✅ User signed up:', data.user.id);

        // Si pas de session (email confirmation required), se connecter
        if (!data.session) {
          console.log('[Auth] 🔐 No session, signing in...');
          const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            return { user: data.user, error: signInError };
          }

          return { user: signInData.user, error: null };
        }

        return { user: data.user, error: null };
      }

      return { user: null, error: new Error('No user returned from signup') };
    } catch (err: any) {
      console.error('[Auth] Signup exception:', err);
      return { user: null, error: err };
    }
  }, [supabaseClient]);

  // ============================================
  // Connexion email/password
  // ============================================
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] 🔐 Signing in user:', email);

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Signin error:', error);
        return { user: null, error };
      }

      if (data.user) {
        console.log('[Auth] ✅ User signed in:', data.user.id);
        return { user: data.user, error: null };
      }

      return { user: null, error: new Error('No user returned from signin') };
    } catch (err: any) {
      console.error('[Auth] Signin exception:', err);
      return { user: null, error: err };
    }
  }, [supabaseClient]);

  // ============================================
  // Connexion OAuth (Google, Apple)
  // ============================================
  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    try {
      console.log('[Auth] 🌐 Starting OAuth:', provider);

      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[Auth] OAuth error:', error);
        return { error };
      }

      // Le callback sera géré par la redirection
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] OAuth exception:', err);
      return { error: err };
    }
  }, [supabaseClient]);

  // ============================================
  // Déconnexion
  // ============================================
  const signOut = useCallback(async () => {
    try {
      console.log('[Auth] 👋 Signing out...');

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        console.error('[Auth] Signout error:', error);
        throw error;
      }

      setUser(null);
      setSession(null);
      setProfile(null);

      console.log('[Auth] ✅ Signed out successfully');
    } catch (err) {
      console.error('[Auth] Signout exception:', err);
      throw err;
    }
  }, [supabaseClient]);

  // ============================================
  // Rafraîchir la session
  // ============================================
  const refreshSession = useCallback(async () => {
    try {
      console.log('[Auth] 🔄 Refreshing session...');

      const { data: { session: newSession }, error } = await supabaseClient.auth.refreshSession();

      if (error) {
        console.error('[Auth] Refresh error:', error);
        throw error;
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        console.log('[Auth] ✅ Session refreshed');
      }
    } catch (err) {
      console.error('[Auth] Refresh exception:', err);
      throw err;
    }
  }, [supabaseClient]);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    initialized,
    profile,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook pour utiliser le context
// ============================================
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
