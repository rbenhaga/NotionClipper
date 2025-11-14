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
 * - Supabase (source de vérité distante)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchWithRetry } from '../utils/edgeFunctions';

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

  private constructor() {
    this.electronAPI = (window as any).electronAPI;
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
    try {
      console.log('[AuthDataManager] 📖 Loading auth data...', forceRefresh ? '(force refresh)' : '');

      // 1. Essayer la mémoire d'abord (sauf si forceRefresh)
      if (!forceRefresh && this.currentData) {
        console.log('[AuthDataManager] ✅ Loaded from memory');
        return this.currentData;
      }

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

        // 🔐 CRITICAL FIX: Only load Notion token if user has/had Notion connection
        // Don't call get-notion-token for Google-only users (prevents 404 errors)
        const shouldLoadNotionToken = electronData.authProvider === 'notion' ||
                                       electronData.notionWorkspace?.id;

        if (shouldLoadNotionToken && electronData.userId && this.supabaseClient) {
          console.log('[AuthDataManager] 🔄 Loading Notion token from database...');
          const notionConnection = await this.loadNotionConnection(electronData.userId);

          if (notionConnection) {
            console.log('[AuthDataManager] ✅ Notion token loaded and decrypted');
            electronData.notionToken = notionConnection.accessToken;
            electronData.notionWorkspace = {
              id: notionConnection.workspaceId,
              name: notionConnection.workspaceName,
              icon: notionConnection.workspaceIcon
            };
          } else {
            console.log('[AuthDataManager] ℹ️ No Notion connection found in database');
          }
        } else if (electronData.userId) {
          console.log('[AuthDataManager] ⏭️ Skipping Notion token load (Google-only user)');
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

        // 🔐 CRITICAL FIX: Only load Notion token if user has/had Notion connection
        const shouldLoadNotionToken = localData.authProvider === 'notion' ||
                                       localData.notionWorkspace?.id;

        if (shouldLoadNotionToken && localData.userId && this.supabaseClient) {
          console.log('[AuthDataManager] 🔄 Loading Notion token from database...');
          const notionConnection = await this.loadNotionConnection(localData.userId);

          if (notionConnection) {
            console.log('[AuthDataManager] ✅ Notion token loaded and decrypted');
            localData.notionToken = notionConnection.accessToken;
            localData.notionWorkspace = {
              id: notionConnection.workspaceId,
              name: notionConnection.workspaceName,
              icon: notionConnection.workspaceIcon
            };
          } else {
            console.log('[AuthDataManager] ℹ️ No Notion connection found in database');
          }
        } else if (localData.userId) {
          console.log('[AuthDataManager] ⏭️ Skipping Notion token load (Google-only user)');
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
   * Sauvegarder la connexion Notion dans Supabase
   * Returns the saved connection data (including the token)
   */
  async saveNotionConnection(connection: NotionConnection): Promise<NotionConnection | null> {
    if (!this.supabaseClient) {
      console.warn('[AuthDataManager] Supabase not available, skipping notion_connections save');
      return null;
    }

    try {
      console.log('[AuthDataManager] 💾 Saving Notion connection for user:', connection.userId);

      // 🔧 FIX: Appeler l'Edge Function save-notion-connection (avec retry logic)
      const result = await fetchWithRetry(
        `${this.supabaseUrl}/functions/v1/save-notion-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
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
        console.error(`[AuthDataManager] ❌ Error calling save-notion-connection after ${result.attempts} attempts:`, result.error);
        throw result.error;
      }

      console.log('[AuthDataManager] ✅ Notion connection saved via Edge Function:', result.data);
      
      // Return the connection data from the response (includes the token)
      if (result.data?.connection) {
        return {
          userId: result.data.connection.userId,
          workspaceId: result.data.connection.workspaceId,
          workspaceName: result.data.connection.workspaceName,
          workspaceIcon: result.data.connection.workspaceIcon,
          accessToken: result.data.connection.accessToken,
          isActive: result.data.connection.isActive
        };
      }
      
      return null;
    } catch (error) {
      console.error('[AuthDataManager] ❌ Exception saving notion_connections:', error);
      throw error;
    }
  }

  /**
   * 🔐 Decrypt Notion token using AES-GCM
   *
   * This method decrypts tokens that were encrypted by the save-notion-connection Edge Function.
   * Encryption format: IV (12 bytes) + ciphertext → base64 encoded
   * Algorithm: AES-GCM with 256-bit key
   *
   * SECURITY: The encryption key must match TOKEN_ENCRYPTION_KEY used in Edge Functions.
   * The key should be provided via environment variable and must be 32 bytes (256 bits) base64-encoded.
   *
   * @param encryptedToken - Base64-encoded encrypted token (IV + ciphertext)
   * @returns Decrypted token (plaintext starting with 'secret_' or 'ntn_')
   * @throws Error if decryption fails or encryption key not available
   */
  private async decryptNotionToken(encryptedToken: string): Promise<string> {
    try {
      console.log('[AuthDataManager] 🔐 Attempting to decrypt Notion token...');

      // Get encryption key from multiple possible sources
      let encryptionKeyBase64: string | undefined;

      // Try different environment variable sources (browser vs Electron)
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TOKEN_ENCRYPTION_KEY) {
        encryptionKeyBase64 = (import.meta as any).env.VITE_TOKEN_ENCRYPTION_KEY as string;
        console.log('[AuthDataManager] 🔑 Using encryption key from import.meta.env');
      } else if (typeof process !== 'undefined' && process.env?.TOKEN_ENCRYPTION_KEY) {
        encryptionKeyBase64 = process.env.TOKEN_ENCRYPTION_KEY;
        console.log('[AuthDataManager] 🔑 Using encryption key from process.env');
      } else if ((window as any).ENV?.TOKEN_ENCRYPTION_KEY) {
        encryptionKeyBase64 = (window as any).ENV.TOKEN_ENCRYPTION_KEY;
        console.log('[AuthDataManager] 🔑 Using encryption key from window.ENV');
      }

      if (!encryptionKeyBase64) {
        console.error('[AuthDataManager] ❌ TOKEN_ENCRYPTION_KEY not found in environment');
        console.error('[AuthDataManager] 💡 Please set VITE_TOKEN_ENCRYPTION_KEY in your .env file');
        console.error('[AuthDataManager] 💡 This key must match TOKEN_ENCRYPTION_KEY in Supabase Vault');
        throw new Error('TOKEN_ENCRYPTION_KEY not available - cannot decrypt token');
      }

      // Decode encryption key from base64
      const keyData = Uint8Array.from(atob(encryptionKeyBase64), c => c.charCodeAt(0));

      // Validate key length (must be 32 bytes for AES-256)
      if (keyData.length !== 32) {
        throw new Error(`Invalid encryption key length: expected 32 bytes, got ${keyData.length} bytes`);
      }

      // Import key for AES-GCM decryption
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decode base64 encrypted data
      const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

      // Validate minimum length (IV is 12 bytes + at least some ciphertext)
      if (combined.length < 13) {
        throw new Error(`Invalid encrypted token: too short (${combined.length} bytes)`);
      }

      // Extract IV (first 12 bytes) and ciphertext (remaining bytes)
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      console.log('[AuthDataManager] 🔓 Decrypting with AES-GCM...');

      // Decrypt using AES-GCM
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      // Convert to string
      const decoder = new TextDecoder();
      const decryptedToken = decoder.decode(decrypted);

      // Validate token format (Notion tokens start with 'secret_' or 'ntn_')
      if (!decryptedToken.startsWith('secret_') && !decryptedToken.startsWith('ntn_')) {
        console.warn('[AuthDataManager] ⚠️ Decrypted token has unexpected format (expected to start with "secret_" or "ntn_")');
        console.warn('[AuthDataManager] ⚠️ Token preview:', decryptedToken.substring(0, 10) + '...');
      }

      console.log('[AuthDataManager] ✅ Token decrypted successfully');
      console.log('[AuthDataManager] 🎯 Token prefix:', decryptedToken.substring(0, 8) + '...');

      return decryptedToken;
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
   * Récupérer la connexion Notion depuis Supabase
   *
   * 🔐 CRITICAL FIX (BUG #1): Uses Edge Function to bypass RLS and decrypt token server-side
   * OAuth custom users don't have Supabase Auth sessions, so direct DB queries fail with 406 errors.
   * The get-notion-token Edge Function uses SERVICE_ROLE_KEY to bypass RLS.
   */
  async loadNotionConnection(userId: string): Promise<NotionConnection | null> {
    if (!this.supabaseClient) {
      console.warn('[AuthDataManager] Supabase not available');
      return null;
    }

    try {
      console.log('[AuthDataManager] 📞 Calling get-notion-token Edge Function for user:', userId);

      // Call get-notion-token Edge Function (bypasses RLS, decrypts server-side)
      const result = await fetchWithRetry(
        `${this.supabaseUrl}/functions/v1/get-notion-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`
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

        console.error(`[AuthDataManager] ❌ Error calling get-notion-token after ${result.attempts} attempts:`, result.error);
        return null;
      }

      const data = result.data;
      if (!data || !data.success || !data.token) {
        console.log('[AuthDataManager] ℹ️ No Notion token returned from Edge Function');
        return null;
      }

      console.log('[AuthDataManager] ✅ Notion token loaded from Edge Function (already decrypted server-side)');
      console.log('[AuthDataManager] 📖 Workspace:', data.workspaceName);

      return {
        userId: userId,
        workspaceId: data.workspaceId,
        workspaceName: data.workspaceName,
        workspaceIcon: data.workspaceIcon,
        accessToken: data.token, // Already decrypted by Edge Function
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
   * PRIVATE - Sauvegarder dans Supabase
   */
  private async saveToSupabase(data: UserAuthData): Promise<void> {
    if (!this.supabaseClient) {
      console.warn('[AuthDataManager] Supabase not available, skipping');
      return;
    }

    // 🔧 FIX BUG #2: Throw errors au lieu de les logger silencieusement
    // Cela permet au code appelant de gérer les erreurs correctement

    // 1. Appeler l'Edge Function create-user
    console.log('[AuthDataManager] 📞 Calling create-user Edge Function...');
    console.log('[AuthDataManager] 🔧 Using URL:', this.supabaseUrl);
    console.log('[AuthDataManager] 🔧 Full URL:', `${this.supabaseUrl}/functions/v1/create-user`);

    const response = await fetch(`${this.supabaseUrl}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`
      },
      body: JSON.stringify({
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        authProvider: data.authProvider
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || errorData.details || response.statusText;
      console.error('[AuthDataManager] ❌ create-user failed:', response.status, errorMessage);
      throw new Error(`Failed to create user: ${errorMessage}`);
    }

    const result = await response.json();
    console.log('[AuthDataManager] ✅ User profile created via Edge Function:', result);

    // 🔧 FIX BUG #1: Extraire le vrai userId de la réponse
    // (peut être différent du userId passé si l'email existe déjà)
    const actualUserId = result.userId || result.profile?.id || data.userId;
    console.log('[AuthDataManager] 📝 Using userId for notion_connection:', actualUserId);

    // 🔧 FIX CRITICAL: Update data.userId with the actual userId from database
    // This ensures all subsequent saves (Electron, localStorage) use the correct merged account userId
    // instead of the temporary OAuth provider userId (fixes Google user 404 errors)
    if (actualUserId !== data.userId) {
      console.log('[AuthDataManager] 🔄 Updating userId from', data.userId, 'to', actualUserId);
      data.userId = actualUserId;
    }

    // 2. Sauvegarder la connexion Notion si présente
    if (data.notionToken && data.notionWorkspace) {
      const savedConnection = await this.saveNotionConnection({
        userId: actualUserId, // Utiliser le vrai userId
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
      }
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
