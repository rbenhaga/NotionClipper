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

      // 1. Sauvegarder dans la mémoire
      this.currentData = data;

      // 2. Sauvegarder dans localStorage (cache local)
      this.saveToLocalStorage(data);

      // 3. Sauvegarder dans Electron config (persistence)
      await this.saveToElectronConfig(data);

      // 4. Sauvegarder dans Supabase (source de vérité distante)
      await this.saveToSupabase(data);

      console.log('[AuthDataManager] ✅ Auth data saved successfully');
    } catch (error) {
      console.error('[AuthDataManager] ❌ Error saving auth data:', error);
      throw error;
    }
  }

  /**
   * Récupérer les données d'authentification (avec fallback cascade)
   */
  async loadAuthData(): Promise<UserAuthData | null> {
    try {
      console.log('[AuthDataManager] 📖 Loading auth data...');

      // 1. Essayer la mémoire d'abord
      if (this.currentData) {
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
        this.currentData = electronData;
        // Synchroniser avec localStorage
        this.saveToLocalStorage(electronData);
        return electronData;
      }

      // 4. Essayer localStorage (fallback)
      const localData = this.loadFromLocalStorage();
      if (localData) {
        console.log('[AuthDataManager] ✅ Loaded from localStorage');
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
   */
  async saveNotionConnection(connection: NotionConnection): Promise<void> {
    if (!this.supabaseClient) {
      console.warn('[AuthDataManager] Supabase not available, skipping notion_connections save');
      return;
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
    } catch (error) {
      console.error('[AuthDataManager] ❌ Exception saving notion_connections:', error);
      throw error;
    }
  }

  /**
   * Récupérer la connexion Notion depuis Supabase
   */
  async loadNotionConnection(userId: string): Promise<NotionConnection | null> {
    if (!this.supabaseClient) {
      console.warn('[AuthDataManager] Supabase not available');
      return null;
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('notion_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Pas de connexion trouvée
          return null;
        }
        throw error;
      }

      if (data) {
        return {
          userId: data.user_id,
          workspaceId: data.workspace_id,
          workspaceName: data.workspace_name,
          workspaceIcon: data.workspace_icon,
          accessToken: data.access_token_encrypted,
          isActive: data.is_active
        };
      }

      return null;
    } catch (error) {
      console.error('[AuthDataManager] Error loading notion_connections:', error);
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
   * Effacer toutes les données d'authentification
   */
  async clearAuthData(): Promise<void> {
    console.log('[AuthDataManager] 🧹 Clearing all auth data');

    // 1. Mémoire
    this.currentData = null;

    // 2. localStorage
    const keysToRemove = [
      'notion_token',
      'notion_workspace',
      'user_email',
      'user_name',
      'user_picture',
      'auth_provider',
      'onboarding_progress'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 3. Electron config
    if (this.electronAPI?.invoke) {
      await this.electronAPI.invoke('config:reset');
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

    // 2. Sauvegarder la connexion Notion si présente
    if (data.notionToken && data.notionWorkspace) {
      await this.saveNotionConnection({
        userId: actualUserId, // Utiliser le vrai userId
        workspaceId: data.notionWorkspace.id,
        workspaceName: data.notionWorkspace.name,
        workspaceIcon: data.notionWorkspace.icon,
        accessToken: data.notionToken,
        isActive: true
      });
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
}

// Export singleton instance
export const authDataManager = AuthDataManager.getInstance();
