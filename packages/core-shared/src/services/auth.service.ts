// packages/core-shared/src/services/auth.service.ts

import type {
  IAuth,
  User,
  OAuthState,
  AuthResult,
  AuthConfig,
  ISupabaseAdapter
} from '../interfaces';

/**
 * Generic Authentication Service
 * Uses dependency injection with ISupabaseAdapter
 */
export class AuthService implements IAuth {
  private adapter: ISupabaseAdapter;
  private config: AuthConfig | null = null;
  private currentUser: User | null = null;
  private authListeners: Array<(user: User | null) => void> = [];

  constructor(adapter: ISupabaseAdapter) {
    this.adapter = adapter;
  }

  async initialize(config: AuthConfig): Promise<void> {
    this.config = config;

    if (config.method === 'oauth' && config.supabaseUrl && config.supabaseAnonKey) {
      await this.adapter.initialize(config.supabaseUrl, config.supabaseAnonKey);
      
      // Try to restore session
      const user = await this.adapter.getUser();
      if (user) {
        this.setCurrentUser(user);
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.currentUser) {
      this.currentUser = await this.adapter.getUser();
    }
    return this.currentUser;
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  async signInWithOAuth(email: string): Promise<OAuthState> {
    try {
      if (!this.config) {
        throw new Error('Auth service not initialized');
      }

      const { authUrl } = await this.adapter.initiateOAuth(email);

      return {
        state: 'authorizing',
        authUrl
      };
    } catch (error) {
      console.error('❌ OAuth initiation failed:', error);
      return {
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async signInWithApiKey(apiKey: string): Promise<AuthResult> {
    try {
      // For backward compatibility with API key method
      // This would create a user and workspace entry with the API key
      // Implementation depends on your backend setup
      
      // For now, we'll just validate the API key with Notion
      const testResponse = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!testResponse.ok) {
        return {
          success: false,
          error: 'Invalid API key'
        };
      }

      await testResponse.json();

      // In a real implementation, you'd create a user entry in Supabase here
      // For now, we'll return a minimal success response
      return {
        success: true,
        message: 'API key validated successfully'
      };
    } catch (error) {
      console.error('❌ API key sign in failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<AuthResult> {
    try {
      const result = await this.adapter.handleCallback(code, state);
      
      if (result.success && result.user) {
        this.setCurrentUser(result.user);
      }

      return result;
    } catch (error) {
      console.error('❌ OAuth callback handling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async signOut(): Promise<void> {
    await this.adapter.signOut();
    this.setCurrentUser(null);
  }

  async getNotionAccessToken(workspaceId?: string): Promise<string | null> {
    try {
      if (!workspaceId) {
        // Get default workspace token
        const user = await this.getCurrentUser();
        if (!user) return null;

        const workspaces = await this.adapter.fetchWorkspaces(user.id);
        const defaultWorkspace = workspaces.find((w: any) => w.is_default);
        
        if (!defaultWorkspace) return null;
        workspaceId = defaultWorkspace.id;
      }

      return await this.adapter.getAccessToken(workspaceId);
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      return null;
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  private setCurrentUser(user: User | null): void {
    this.currentUser = user;
    this.notifyAuthListeners(user);
  }

  private notifyAuthListeners(user: User | null): void {
    this.authListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('❌ Error in auth listener:', error);
      }
    });
  }
}