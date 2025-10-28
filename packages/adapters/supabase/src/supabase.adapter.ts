// packages/adapters/supabase/src/supabase.adapter.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local type definitions to avoid import issues
interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  avatar?: string;
  avatar_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NotionWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_icon?: string;
  bot_id: string;
  access_token: string;
  token_type: string;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
  workspace?: NotionWorkspace;
}

interface ISupabaseAdapter {
  initialize(supabaseUrl: string, supabaseAnonKey: string): Promise<void>;
  getUser(): Promise<User | null>;
  initiateOAuth(email: string): Promise<{ authUrl: string }>;
  handleCallback(code: string, state: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  fetchWorkspaces(userId: string): Promise<NotionWorkspace[]>;
  setDefaultWorkspace(userId: string, workspaceId: string): Promise<void>;
  updateWorkspace(workspaceId: string, updates: Partial<NotionWorkspace>): Promise<void>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  getAccessToken(workspaceId: string): Promise<string | null>;
}

/**
 * Supabase Adapter
 * Generic implementation that works in both browser and Node.js
 */
export class SupabaseAdapter implements ISupabaseAdapter {
  private client: SupabaseClient | null = null;
  private functionsUrl: string = '';

  async initialize(url: string, anonKey: string): Promise<void> {
    this.client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    this.functionsUrl = `${url}/functions/v1`;
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  async getSession(): Promise<any> {
    const client = this.ensureClient();
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  async getUser(): Promise<User | null> {
    try {
      const client = this.ensureClient();
      const { data: { user }, error } = await client.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Fetch additional user data from our users table
      const { data: userData, error: userError } = await client
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        return null;
      }

      return {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at || userData.created_at)
      };
    } catch (error) {
      console.error('❌ Failed to get user:', error);
      return null;
    }
  }

  async initiateOAuth(email: string): Promise<{ authUrl: string }> {
    // Version simplifiée sans Edge Functions
    const state = btoa(JSON.stringify({ 
      email, 
      timestamp: Date.now() 
    }));

    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', '298d872b-594c-808a-bdf4-00379b703b97');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('owner', 'user');
    authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/oauth/callback');
    authUrl.searchParams.set('state', state);

    return { authUrl: authUrl.toString() };
  }

  async handleCallback(code: string, state: string): Promise<AuthResult> {
    try {
      // The callback is handled server-side by the Edge Function
      // This method is called after the redirect to parse the result
      // In practice, you'd extract user_id from the redirect URL
      
      // For now, we'll just validate that we can fetch the user
      const user = await this.getUser();
      
      if (!user) {
        return {
          success: false,
          error: 'Failed to authenticate user after OAuth callback'
        };
      }

      // Fetch the newly created workspace
      const workspaces = await this.fetchWorkspaces(user.id);
      const latestWorkspace = workspaces.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        success: true,
        user,
        workspace: latestWorkspace,
        message: 'OAuth authentication successful'
      };
    } catch (error) {
      console.error('❌ OAuth callback handling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async fetchWorkspaces(userId: string): Promise<NotionWorkspace[]> {
    try {
      const client = this.ensureClient();
      
      const { data, error } = await client
        .from('notion_workspaces')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('last_used_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch workspaces:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch workspaces:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId: string, updates: Partial<NotionWorkspace>): Promise<void> {
    try {
      const client = this.ensureClient();
      
      const { error } = await client
        .from('notion_workspaces')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      if (error) {
        console.error('❌ Failed to update workspace:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to update workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      
      // Soft delete by setting is_active to false
      const { error } = await client
        .from('notion_workspaces')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      if (error) {
        console.error('❌ Failed to delete workspace:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to delete workspace:', error);
      throw error;
    }
  }

  async setDefaultWorkspace(userId: string, workspaceId: string): Promise<void> {
    try {
      const client = this.ensureClient();
      
      // First, unset all defaults for this user
      await client
        .from('notion_workspaces')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the new default
      const { error } = await client
        .from('notion_workspaces')
        .update({ 
          is_default: true,
          last_used_at: new Date().toISOString()
        })
        .eq('id', workspaceId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Failed to set default workspace:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to set default workspace:', error);
      throw error;
    }
  }

  async getAccessToken(workspaceId: string): Promise<string> {
    try {
      const client = this.ensureClient();
      
      const { data, error } = await client
        .from('notion_workspaces')
        .select('access_token')
        .eq('id', workspaceId)
        .single();

      if (error || !data) {
        throw new Error('Failed to fetch access token');
      }

      // Decrypt the token (in production, use proper decryption)
      // For now, assuming it's base64 encoded
      const decrypted = atob(data.access_token);
      
      return decrypted;
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const client = this.ensureClient();
      await client.auth.signOut();
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  }

  // ============================================
  // ADDITIONAL UTILITY METHODS
  // ============================================

  /**
   * Refresh session
   */
  async refreshSession(): Promise<void> {
    try {
      const client = this.ensureClient();
      const { error } = await client.auth.refreshSession();
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to refresh session:', error);
      throw error;
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void): () => void {
    const client = this.ensureClient();
    
    const { data: { subscription } } = client.auth.onAuthStateChange(callback);
    
    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Check if user session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const session = await this.getSession();
      return session !== null;
    } catch {
      return false;
    }
  }
}