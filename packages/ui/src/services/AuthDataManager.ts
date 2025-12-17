// packages/ui/src/services/AuthDataManager.ts
/**
 * AuthDataManager - Service centralisé pour gérer TOUTES les données d'authentification
 *
 * Source unique de vérité pour :
 * - Auth provider (email, google, notion)
 * - User data (userId, email, name, avatar)
 * - Notion connection (token, workspace)
 * - Onboarding progress
 *
 * Synchronise automatiquement :
 * - localStorage (cache local)
 * - Electron config (persistence)
 * - Backend API (source de vérité distante)
 *
 * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase Edge Functions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchWithRetry } from '../utils/edgeFunctions';

// Get backend API URL from global config (set by app's backend.ts)
const getBackendApiUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__BACKEND_API_URL__) {
    return (window as any).__BACKEND_API_URL__;
  }
  return 'http://localhost:3001/api';
};

export interface UserAuthData {
  // Identification
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;

  // Provider
  authProvider: 'email' | 'google' | 'notion';

  // Notion connection
  notionToken?: string;
  notionWorkspace?: {
    id: string;
    name: string;
    icon?: string;
  };

  // Onboarding
  onboardingCompleted: boolean;
  onboardingProgress?: {
    currentStep: number;
    authCompleted: boolean;
    notionCompleted: boolean;
  };

  // Subscription
  isPremium?: boolean;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  trialEndsAt?: string;
}

export interface NotionConnection {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  accessToken: string;
  isActive: boolean;
}

export class AuthDataManager {
  private static instance: AuthDataManager;
  private supabaseClient: SupabaseClient | null = null;
  private supabaseUrl: string = '';
  private supabaseKey: string = '';
  private electronAPI: any = null;
  private currentData: UserAuthData | null = null;
  private loadingPromise: Promise<UserAuthData | null> | null = null; // 🔧 Prevent concurrent loads

  private constructor() {
    // 🔧 FIX: Check if window exists (might be called from Node.js context)
    this.electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  }

  static getInstance(): AuthDataManager {
    if (!AuthDataManager.instance) {
      AuthDataManager.instance = new AuthDataManager();
    }
    return AuthDataManager.instance;
  }

  /**
   * Initialiser avec le client Supabase
   */
  initialize(supabaseClient: SupabaseClient | null, supabaseUrl?: string, supabaseKey?: string) {
    this.supabaseClient = supabaseClient;
    this.supabaseUrl = supabaseUrl || '';
    this.supabaseKey = supabaseKey || '';
    console.log('[AuthDataManager] Initialized with Supabase:', !!supabaseClient);
    console.log('[AuthDataManager] 🔧 URL:', this.supabaseUrl);
    console.log('[AuthDataManager] 🔧 Key:', this.supabaseKey ? 'Present' : 'Missing');
  }

  /**
   * Sauvegarder les données d'authentification (TOUTES les sources)
   */
  async saveAuthData(data: UserAuthData): Promise<void> {
    try {
      console.log('[AuthDataManager] 💾 Saving auth data for user:', data.userId);

      // 1. Sauvegarder dans Supabase d'abord (source de vérité distante)
      await this.saveToSupabase(data);

      // 2. 🔧 FIX: The token is returned by saveToSupabase (from save-notion-connection Edge Function)
      // No need to reload it separately - it's already in data.notionToken
      if (data.notionToken && data.notionWorkspace?.id) {
        console.log('[AuthDataManager] ✅ Notion token available from save operation');
      }

      // 3. Sauvegarder dans la mémoire (avec le token rechargé)
      this.currentData = data;

      // 4. Sauvegarder dans localStorage (cache local)
      this.saveToLocalStorage(data);

      // 5. Sauvegarder dans Electron config (persistence avec le token)
      await this.saveToElectronConfig(data);

      // 6. 🔧 FIX: Emit event to notify SubscriptionContext that auth data changed
      // This ensures services are reinitialized when user logs in after mount
      // 🔧 FIX RISK #2: Include userId in event payload to avoid unnecessary reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-data-changed', { detail: { userId: data.userId } }));
        console.log('[AuthDataManager] 📢 Emitted auth-data-changed event with userId');
      }

      console.log('[AuthDataManager] ✅ Auth data saved successfully');
    } catch (error) {
      console.error('[AuthDataManager] ❌ Error saving auth data:', error);
      throw error;
    }
  }

  /**
   * Récupérer les données d'authentification (avec fallback cascade)
   */
  async loadAuthData(forceRefresh: boolean = false): Promise<UserAuthData | null> {
    // 1. Essayer la mémoire d'abord (sauf si forceRefresh)
    if (!forceRefresh && this.currentData) {
      return this.currentData;
    }

    // 🔧 FIX: Prevent concurrent loads - reuse existing promise if loading
    if (this.loadingPromise && !forceRefresh) {
      console.log('[AuthDataManager] ⏳ Already loading, waiting for existing promise...');
      return this.loadingPromise;
    }

    // Start new load
    this.loadingPromise = this._doLoadAuthData(forceRefresh);
    try {
      const result = await this.loadingPromise;
      return result;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Internal method that actually loads auth data
   */
  private async _doLoadAuthData(forceRefresh: boolean): Promise<UserAuthData | null> {
    try {
      console.log('[AuthDataManager] 📖 Loading auth data...', forceRefresh ? '(force refresh)' : '');

      // 2. Essayer Supabase (source de vérité)
      const supabaseData = await this.loadFromSupabase();
      if (supabaseData) {
        console.log('[AuthDataManager] ✅ Loaded from Supabase');
        this.currentData = supabaseData;
        // Synchroniser avec localStorage et Electron
        this.saveToLocalStorage(supabaseData);
        await this.saveToElectronConfig(supabaseData);
        return supabaseData;
      }

      // 3. Essayer Electron config
      const electronData = await this.loadFromElectronConfig();
      if (electronData) {
        console.log('[AuthDataManager] ✅ Loaded from Electron config');
        console.log('[AuthDataManager] 📊 Electron data:', {
          userId: electronData.userId,
          hasNotionToken: !!electronData.notionToken,
          hasWorkspace: !!electronData.notionWorkspace,
          onboardingCompleted: electronData.onboardingCompleted
        });

        // 🔧 FIX: Only load from DB if we don't already have a Notion token
        // main.ts saves the token directly to Electron config after deep link callback
        if (!electronData.notionToken && electronData.userId && this.supabaseClient) {
          console.log('[AuthDataManager] 🔄 No local token, loading Notion token from database...');
          try {
            const notionConnection = await this.loadNotionConnection(electronData.userId);

            if (notionConnection) {
              console.log('[AuthDataManager] ✅ Notion token loaded and decrypted from DB');
              electronData.notionToken = notionConnection.accessToken;
              electronData.notionWorkspace = {
                id: notionConnection.workspaceId,
                name: notionConnection.workspaceName,
                icon: notionConnection.workspaceIcon
              };
            } else {
              console.log('[AuthDataManager] ℹ️ No Notion connection found in database');
            }
          } catch (error) {
            console.error('[AuthDataManager] ⚠️ Error loading from DB, using local data:', error);
          }
        } else if (electronData.notionToken) {
          console.log('[AuthDataManager] ✅ Using Notion token from Electron config (already saved by main.ts)');
        }

        this.currentData = electronData;
        // Synchroniser avec localStorage
        this.saveToLocalStorage(electronData);
        return electronData;
      }

      // 4. Essayer localStorage (fallback)
      const localData = this.loadFromLocalStorage();
      if (localData) {
        console.log('[AuthDataManager] ✅ Loaded from localStorage');

        // 🔧 FIX: Only load from DB if we don't already have a Notion token
        if (!localData.notionToken && localData.userId && this.supabaseClient) {
          console.log('[AuthDataManager] 🔄 No local token, loading Notion token from database...');
          try {
            const notionConnection = await this.loadNotionConnection(localData.userId);

            if (notionConnection) {
              console.log('[AuthDataManager] ✅ Notion token loaded and decrypted from DB');
              localData.notionToken = notionConnection.accessToken;
              localData.notionWorkspace = {
                id: notionConnection.workspaceId,
                name: notionConnection.workspaceName,
                icon: notionConnection.workspaceIcon
              };
            } else {
              console.log('[AuthDataManager] ℹ️ No Notion connection found in database');
            }
          } catch (error) {
            console.error('[AuthDataManager] ⚠️ Error loading from DB, using local data:', error);
          }
        } else if (localData.notionToken) {
          console.log('[AuthDataManager] ✅ Using Notion token from localStorage');
        }

        this.currentData = localData;
        return localData;
      }

      console.log('[AuthDataManager] ℹ️ No auth data found');
      return null;
    } catch (error) {
      console.error('[AuthDataManager] ❌ Error loading auth data:', error);
      return null;
    }
  }

  /**
   * Sauvegarder la connexion Notion via le backend
   * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase Edge Functions
   * Returns the saved connection data (including the token)
   */
  async saveNotionConnection(connection: NotionConnection): Promise<NotionConnection | null> {
    try {
      console.log('[AuthDataManager] 💾 Saving Notion connection for user:', connection.userId);

      const backendUrl = getBackendApiUrl();

      // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Edge Function
      const result = await fetchWithRetry(
        `${backendUrl}/notion/save-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: connection.userId,
            workspaceId: connection.workspaceId,
            workspaceName: connection.workspaceName,
            workspaceIcon: connection.workspaceIcon,
            accessToken: connection.accessToken,
            isActive: connection.isActive
          })
        },
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      if (result.error) {
        console.error(`[AuthDataManager] ❌ Error calling save-connection after ${result.attempts} attempts:`, result.error);
        throw result.error;
      }

      const data = result.data?.data || result.data;
      console.log('[AuthDataManager] ✅ Notion connection saved via backend:', data);
      
      // Return the connection data from the response (includes the token)
      if (data?.connection) {
        return {
          userId: data.connection.userId,
          workspaceId: data.connection.workspaceId,
          workspaceName: data.connection.workspaceName,
          workspaceIcon: data.connection.workspaceIcon,
          accessToken: data.connection.accessToken,
          isActive: data.connection.isActive
        };
      }
      
      return null;
    } catch (error) {
      console.error('[AuthDataManager] ❌ Exception saving notion_connections:', error);
      throw error;
    }
  }

  /**
   * 🔐 Decrypt Notion token using Backend API (server-side)
   *
   * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase Edge Functions
   * Le déchiffrement se fait côté serveur pour éviter d'exposer la clé de chiffrement.
   *
   * @param userId - User ID to decrypt token for
   * @returns Decrypted token (plaintext starting with 'secret_' or 'ntn_')
   * @throws Error if decryption fails or user not authenticated
   */
  private async decryptNotionToken(userId: string): Promise<string> {
    try {
      console.log('[AuthDataManager] 🔐 Requesting token decryption from backend...');

      const backendUrl = getBackendApiUrl();

      // Call backend API to decrypt token
      const response = await fetch(`${backendUrl}/notion/get-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthDataManager] ❌ Backend error:', errorData);
        throw new Error(`Failed to decrypt token: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const data = result.data;

      if (!data?.token) {
        throw new Error('Invalid response from decryption service');
      }

      // Validate token format (Notion tokens start with 'secret_' or 'ntn_')
      if (!data.token.startsWith('secret_') && !data.token.startsWith('ntn_')) {
        console.warn('[AuthDataManager] ⚠️ Decrypted token has unexpected format');
      }

      console.log('[AuthDataManager] ✅ Token decrypted successfully via backend');
      console.log('[AuthDataManager] 🎯 Token prefix:', data.token.substring(0, 8) + '...');

      return data.token;
    } catch (error) {
      console.error('[AuthDataManager] ❌ Failed to decrypt Notion token:', error);

      // Provide detailed error context
      if (error instanceof Error) {
        if (error.message.includes('not available')) {
          console.error('[AuthDataManager] 💡 Solution: Add TOKEN_ENCRYPTION_KEY to your environment variables');
        } else if (error.message.includes('key length')) {
          console.error('[AuthDataManager] 💡 Solution: Ensure TOKEN_ENCRYPTION_KEY is a 32-byte base64-encoded string');
        } else {
          console.error('[AuthDataManager] 💡 This may indicate the token was corrupted or encrypted with a different key');
        }
      }

      throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupérer la connexion Notion depuis le backend
   *
   * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase Edge Functions
   * The backend handles RLS bypass and token decryption server-side.
   */
  async loadNotionConnection(userId: string): Promise<NotionConnection | null> {
    try {
      console.log('[AuthDataManager] 📞 Calling backend get-token for user:', userId);

      const backendUrl = getBackendApiUrl();

      // Call backend API (bypasses RLS, decrypts server-side)
      const result = await fetchWithRetry(
        `${backendUrl}/notion/get-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        },
        { maxRetries: 2, initialDelayMs: 500 }
      );

      if (result.error) {
        // Check if it's a "not found" error
        const errorMessage = result.error.message || '';
        if (errorMessage.includes('not found') || errorMessage.includes('No active Notion connection')) {
          console.log('[AuthDataManager] ℹ️ No Notion connection found for user:', userId);
          return null;
        }

        console.error(`[AuthDataManager] ❌ Error calling backend get-token after ${result.attempts} attempts:`, result.error);
        return null;
      }

      const data = result.data?.data || result.data;
      if (!data || !data.token) {
        console.log('[AuthDataManager] ℹ️ No Notion token returned from backend');
        return null;
      }

      console.log('[AuthDataManager] ✅ Notion token loaded from backend (already decrypted server-side)');
      console.log('[AuthDataManager] 📖 Workspace:', data.workspaceName);

      return {
        userId: userId,
        workspaceId: data.workspaceId,
        workspaceName: data.workspaceName,
        workspaceIcon: data.workspaceIcon,
        accessToken: data.token, // Already decrypted by backend
        isActive: true
      };
    } catch (error) {
      console.error('[AuthDataManager] ❌ Exception loading notion_connections:', error);
      return null;
    }
  }

  /**
   * Vérifier si un utilisateur a une connexion Notion active
   */
  async hasNotionConnection(userId: string): Promise<boolean> {
    const connection = await this.loadNotionConnection(userId);
    return !!connection && connection.isActive;
  }

  /**
   * Sauvegarder la progression de l'onboarding
   */
  async saveOnboardingProgress(userId: string, progress: {
    currentStep: number;
    authCompleted: boolean;
    notionCompleted: boolean;
  }): Promise<void> {
    // Sauvegarder dans localStorage
    localStorage.setItem('onboarding_progress', JSON.stringify({
      userId,
      ...progress,
      timestamp: Date.now()
    }));

    // Sauvegarder dans Electron config
    if (this.electronAPI?.invoke) {
      await this.electronAPI.invoke('config:set', 'onboardingProgress', progress);
    }

    console.log('[AuthDataManager] ✅ Onboarding progress saved:', progress);
  }

  /**
   * Récupérer la progression de l'onboarding
   */
  async loadOnboardingProgress(userId: string): Promise<any | null> {
    // Essayer localStorage d'abord
    const stored = localStorage.getItem('onboarding_progress');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.userId === userId) {
          return parsed;
        }
      } catch (e) {
        console.error('[AuthDataManager] Error parsing onboarding progress:', e);
      }
    }

    // Essayer Electron config
    if (this.electronAPI?.invoke) {
      const progress = await this.electronAPI.invoke('config:get', 'onboardingProgress');
      if (progress) {
        return progress;
      }
    }

    return null;
  }

  /**
   * Effacer la progression de l'onboarding
   */
  async clearOnboardingProgress(): Promise<void> {
    // Clear from localStorage
    localStorage.removeItem('onboarding_progress');

    // Clear from Electron config
    // 🔧 FIX: Use config:set with null instead of config:delete (which doesn't exist)
    if (this.electronAPI?.invoke) {
      try {
        await this.electronAPI.invoke('config:set', 'onboardingProgress', null);
      } catch (error) {
        console.warn('[AuthDataManager] Failed to clear onboarding progress from Electron:', error);
        // Non-critical error, continue
      }
    }

    console.log('[AuthDataManager] ✅ Onboarding progress cleared');
  }

  /**
   * Effacer toutes les données d'authentification
   */
  async clearAuthData(): Promise<void> {
    console.log('[AuthDataManager] 🧹 Clearing all auth data');

    // 1. Mémoire
    this.currentData = null;

    // 2. localStorage
    const keysToRemove = [
      'user_id', // ✅ FIX: Match actual key used by saveToLocalStorage
      'notion_token',
      'notion_workspace',
      'user_email',
      'user_name',
      'user_picture',
      'auth_provider',
      'onboarding_progress',
      'onboarding_completed' // ✅ FIX: Also clear this
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 3. Electron config - Clear ALL auth keys explicitly
    // 🔧 FIX CRITICAL: config:reset doesn't clear auth keys, only resets some config
    // We must explicitly clear each auth key to prevent data persistence after disconnect
    if (this.electronAPI?.invoke) {
      try {
        // Clear auth-specific keys first
        await this.electronAPI.invoke('config:set', 'userId', null);
        await this.electronAPI.invoke('config:set', 'userEmail', null);
        await this.electronAPI.invoke('config:set', 'userName', null);
        await this.electronAPI.invoke('config:set', 'authProvider', null);
        await this.electronAPI.invoke('config:set', 'notionToken', null);
        await this.electronAPI.invoke('config:set', 'notionWorkspace', null);
        await this.electronAPI.invoke('config:set', 'onboardingCompleted', false);
        await this.electronAPI.invoke('config:set', 'onboardingProgress', null);
        console.log('[AuthDataManager] ✅ Electron auth keys cleared');

        // Then call config:reset for other config (caches, etc.)
        await this.electronAPI.invoke('config:reset');
        console.log('[AuthDataManager] ✅ Config reset called');
      } catch (error) {
        console.error('[AuthDataManager] Error clearing Electron config:', error);
      }
    }

    // 🔧 FIX BUG #2: Dispatch event so SubscriptionContext knows to reset
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-data-changed', { detail: { userId: null } }));
      console.log('[AuthDataManager] 📢 Emitted auth-data-changed event (clear)');
    }

    console.log('[AuthDataManager] ✅ Auth data cleared');
  }

  /**
   * PRIVATE - Sauvegarder dans localStorage
   *
   * 🔐 SECURITY: Notion tokens are NOT stored in localStorage to prevent plaintext exposure.
   * In Electron: Tokens are stored encrypted in ElectronConfigAdapter (safeStorage)
   * In Browser: Tokens should be kept in memory only or use secure session storage
   */
  private saveToLocalStorage(data: UserAuthData): void {
    localStorage.setItem('user_id', data.userId);
    if (data.email) localStorage.setItem('user_email', data.email);
    if (data.fullName) localStorage.setItem('user_name', data.fullName);
    if (data.avatarUrl) localStorage.setItem('user_picture', data.avatarUrl);
    localStorage.setItem('auth_provider', data.authProvider);

    // 🔐 SECURITY FIX: Do NOT store Notion token in localStorage (plaintext security risk)
    // Token should be retrieved from:
    // - Electron: ConfigService (encrypted with safeStorage)
    // - Browser: Session storage or secure cookie (not implemented yet)
    // if (data.notionToken) {
    //   localStorage.setItem('notion_token', data.notionToken);
    // }

    if (data.notionWorkspace) {
      localStorage.setItem('notion_workspace', JSON.stringify(data.notionWorkspace));
    }

    localStorage.setItem('onboarding_completed', data.onboardingCompleted.toString());
  }

  /**
   * PRIVATE - Charger depuis localStorage
   */
  private loadFromLocalStorage(): UserAuthData | null {
    const userId = localStorage.getItem('user_id');
    const authProvider = localStorage.getItem('auth_provider') as any;

    if (!userId || !authProvider) {
      return null;
    }

    const notionWorkspaceStr = localStorage.getItem('notion_workspace');
    let notionWorkspace = undefined;
    if (notionWorkspaceStr) {
      try {
        notionWorkspace = JSON.parse(notionWorkspaceStr);
      } catch (e) {
        console.error('[AuthDataManager] Error parsing notion_workspace:', e);
      }
    }

    return {
      userId,
      email: localStorage.getItem('user_email'),
      fullName: localStorage.getItem('user_name'),
      avatarUrl: localStorage.getItem('user_picture'),
      authProvider,
      // 🔐 SECURITY: Token is NOT loaded from localStorage (not stored there anymore)
      // In Electron: Use ConfigService.getNotionToken() to retrieve encrypted token
      notionToken: undefined,
      notionWorkspace,
      onboardingCompleted: localStorage.getItem('onboarding_completed') === 'true'
    };
  }

  /**
   * PRIVATE - Sauvegarder dans Electron config
   */
  private async saveToElectronConfig(data: UserAuthData): Promise<void> {
    if (!this.electronAPI?.invoke) {
      return;
    }

    try {
      await this.electronAPI.invoke('config:set', 'userId', data.userId);
      if (data.email) await this.electronAPI.invoke('config:set', 'userEmail', data.email);
      if (data.fullName) await this.electronAPI.invoke('config:set', 'userName', data.fullName);
      await this.electronAPI.invoke('config:set', 'authProvider', data.authProvider);

      if (data.notionToken) {
        await this.electronAPI.invoke('config:set', 'notionToken', data.notionToken);
      }
      if (data.notionWorkspace) {
        await this.electronAPI.invoke('config:set', 'notionWorkspace', data.notionWorkspace);
      }

      await this.electronAPI.invoke('config:set', 'onboardingCompleted', data.onboardingCompleted);
    } catch (error) {
      console.error('[AuthDataManager] Error saving to Electron config:', error);
    }
  }

  /**
   * PRIVATE - Charger depuis Electron config
   */
  private async loadFromElectronConfig(): Promise<UserAuthData | null> {
    if (!this.electronAPI?.invoke) {
      return null;
    }

    try {
      const userId = await this.electronAPI.invoke('config:get', 'userId');
      const authProvider = await this.electronAPI.invoke('config:get', 'authProvider');

      if (!userId || !authProvider) {
        return null;
      }

      const notionWorkspace = await this.electronAPI.invoke('config:get', 'notionWorkspace');

      return {
        userId,
        email: await this.electronAPI.invoke('config:get', 'userEmail'),
        fullName: await this.electronAPI.invoke('config:get', 'userName'),
        avatarUrl: null,
        authProvider,
        notionToken: await this.electronAPI.invoke('config:get', 'notionToken'),
        notionWorkspace,
        onboardingCompleted: await this.electronAPI.invoke('config:get', 'onboardingCompleted') === true
      };
    } catch (error) {
      console.error('[AuthDataManager] Error loading from Electron config:', error);
      return null;
    }
  }

  /**
   * PRIVATE - Sauvegarder dans le backend
   * ✅ MIGRATED: User profile is now created by backend during OAuth callback
   * This method only saves Notion connection if present
   */
  private async saveToSupabase(data: UserAuthData): Promise<void> {
    console.log('[AuthDataManager] 💾 Syncing data to backend for user:', data.userId);

    // User profile is already created by backend during OAuth callback
    // We only need to save Notion connection if present
    if (data.notionToken && data.notionWorkspace) {
      console.log('[AuthDataManager] 📝 Saving Notion connection...');
      
      const savedConnection = await this.saveNotionConnection({
        userId: data.userId,
        workspaceId: data.notionWorkspace.id,
        workspaceName: data.notionWorkspace.name,
        workspaceIcon: data.notionWorkspace.icon,
        accessToken: data.notionToken,
        isActive: true
      });
      
      // Update data with the saved connection info (includes the token)
      if (savedConnection) {
        data.notionToken = savedConnection.accessToken;
        data.notionWorkspace = {
          id: savedConnection.workspaceId,
          name: savedConnection.workspaceName,
          icon: savedConnection.workspaceIcon
        };
        console.log('[AuthDataManager] ✅ Notion connection saved successfully');
      }
    } else {
      console.log('[AuthDataManager] ℹ️ No Notion connection to save');
    }
  }

  /**
   * PRIVATE - Charger depuis Supabase
   */
  private async loadFromSupabase(): Promise<UserAuthData | null> {
    if (!this.supabaseClient) {
      return null;
    }

    try {
      // Récupérer la session Supabase actuelle
      const { data: { session }, error: sessionError } = await this.supabaseClient.auth.getSession();

      if (sessionError || !session) {
        return null;
      }

      const userId = session.user.id;

      // Récupérer le profil
      const { data: profile, error: profileError } = await this.supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        return null;
      }

      // Récupérer la connexion Notion
      const notionConnection = await this.loadNotionConnection(userId);

      return {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        authProvider: profile.auth_provider || 'email',
        notionToken: notionConnection?.accessToken,
        notionWorkspace: notionConnection ? {
          id: notionConnection.workspaceId,
          name: notionConnection.workspaceName,
          icon: notionConnection.workspaceIcon
        } : undefined,
        onboardingCompleted: true // Si on a des données Supabase, l'onboarding est forcément complété
      };
    } catch (error) {
      console.error('[AuthDataManager] Error loading from Supabase:', error);
      return null;
    }
  }

  /**
   * Obtenir les données actuelles (sans chargement)
   */
  getCurrentData(): UserAuthData | null {
    return this.currentData;
  }

  /**
   * 🔧 FIX: Helper to check if user has Notion token
   * This properly checks encrypted storage sources, not just memory cache
   */
  async hasNotionToken(userId?: string): Promise<boolean> {
    try {
      // Load fresh data from storage (bypassing cache)
      const authData = await this.loadAuthData(true);

      if (!authData) {
        return false;
      }

      // Check if token exists in loaded data
      if (authData.notionToken) {
        console.log('[AuthDataManager] ✅ Notion token found in auth data');
        return true;
      }

      // Check if workspace info exists (indicates connection)
      if (authData.notionWorkspace?.id) {
        console.log('[AuthDataManager] ✅ Notion workspace found');
        return true;
      }

      // Double-check Supabase notion_connections table
      if (userId || authData.userId) {
        const connection = await this.loadNotionConnection(userId || authData.userId);
        if (connection && connection.isActive) {
          console.log('[AuthDataManager] ✅ Active Notion connection found in database');
          return true;
        }
      }

      console.log('[AuthDataManager] ℹ️ No Notion token found');
      return false;
    } catch (error) {
      console.error('[AuthDataManager] Error checking Notion token:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authDataManager = AuthDataManager.getInstance();

// 🔧 FIX: Expose globally for SubscriptionService (in core-shared) to access
// This allows cross-package authentication without circular dependencies
if (typeof window !== 'undefined') {
  (window as any).__AUTH_DATA_MANAGER__ = authDataManager;
}
