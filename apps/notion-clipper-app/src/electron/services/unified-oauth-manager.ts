// apps/notion-clipper-app/src/electron/services/unified-oauth-manager.ts

import { LocalOAuthServer } from './oauth-server';
import crypto from 'crypto';

/**
 * OAuth Provider Configuration
 */
interface OAuthProviderConfig {
  clientId: string;
  clientSecret?: string; // Optional for PKCE flow
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  usePKCE?: boolean; // Use PKCE instead of client_secret
  responseType?: string; // Default: 'code'
}

/**
 * OAuth Result returned to the application
 */
export interface OAuthResult {
  success: boolean;
  error?: string;
  authUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  userInfo?: any;
  providerData?: any; // Provider-specific data (workspace, drive, etc.)
}

/**
 * OAuth Callback Data from server
 */
interface OAuthCallbackData {
  code: string;
  state: string;
}

/**
 * Supported OAuth Providers
 */
export type OAuthProvider = 'notion' | 'google' | 'microsoft';

/**
 * Unified OAuth Manager
 * Handles OAuth 2.0 flows for multiple providers using a local HTTP server
 *
 * Benefits:
 * - ✅ Works consistently across all platforms (Windows, macOS, Linux)
 * - ✅ No deep-linking complexity (uses localhost callback)
 * - ✅ Supports PKCE for enhanced security
 * - ✅ Reuses existing LocalOAuthServer infrastructure
 * - ✅ Easy to add new providers
 * - ✅ Promise-based API for clean async/await code
 */
export class UnifiedOAuthManager {
  private server: LocalOAuthServer;
  private providers: Map<OAuthProvider, OAuthProviderConfig> = new Map();
  private pkceVerifiers: Map<string, string> = new Map(); // state -> code_verifier
  private pendingCallbacks: Map<string, {
    resolve: (result: OAuthResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(server: LocalOAuthServer) {
    this.server = server;
    this.initializeProviders();
  }

  /**
   * Initialize OAuth provider configurations from environment variables
   */
  private initializeProviders(): void {
    // Notion OAuth (existing implementation)
    const notionClientId = process.env.NOTION_CLIENT_ID;
    const notionClientSecret = process.env.NOTION_CLIENT_SECRET;

    if (notionClientId && notionClientSecret) {
      this.providers.set('notion', {
        clientId: notionClientId,
        clientSecret: notionClientSecret,
        authUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        scopes: [], // Notion doesn't use scopes in the same way
        usePKCE: false,
        responseType: 'code'
      });
    }

    // Google OAuth (for Gmail, Drive, Docs)
    // Note: Use "Desktop app" type in Google Cloud Console
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (googleClientId) {
      this.providers.set('google', {
        clientId: googleClientId,
        clientSecret: googleClientSecret, // Optional for desktop apps using PKCE
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/drive.file', // Drive access
          'https://www.googleapis.com/auth/documents', // Google Docs
        ],
        usePKCE: true, // RECOMMENDED for desktop apps
        responseType: 'code'
      });
    }

    // Microsoft OAuth (for OneDrive, Word, Outlook)
    const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;

    if (microsoftClientId) {
      this.providers.set('microsoft', {
        clientId: microsoftClientId,
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: [
          'User.Read',
          'Files.ReadWrite', // OneDrive
          'offline_access' // For refresh token
        ],
        usePKCE: true,
        responseType: 'code'
      });
    }

    console.log('[UnifiedOAuth] Initialized providers:', Array.from(this.providers.keys()));
  }

  /**
   * Generate PKCE challenge and verifier
   * PKCE (Proof Key for Code Exchange) adds security for public clients
   */
  private generatePKCE(): { verifier: string; challenge: string } {
    // Generate random code_verifier (43-128 characters, URL-safe)
    const verifier = crypto.randomBytes(32).toString('base64url');

    // Generate code_challenge = BASE64URL(SHA256(verifier))
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge };
  }

  /**
   * Start OAuth flow for a provider
   * Returns a promise that resolves with the OAuth result
   */
  async startOAuth(provider: OAuthProvider, customScopes?: string[]): Promise<OAuthResult> {
    console.log(`[UnifiedOAuth] Starting OAuth flow for ${provider}...`);

    const config = this.providers.get(provider);
    if (!config) {
      return {
        success: false,
        error: `Provider ${provider} not configured. Check environment variables.`
      };
    }

    // Generate unique state for this OAuth attempt
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = this.server.getCallbackUrl();

    // Setup PKCE if required
    let pkceParams: { code_challenge: string; code_challenge_method: string } | null = null;
    if (config.usePKCE) {
      const { verifier, challenge } = this.generatePKCE();
      this.pkceVerifiers.set(state, verifier);
      pkceParams = {
        code_challenge: challenge,
        code_challenge_method: 'S256'
      };
      console.log(`[UnifiedOAuth] Using PKCE for ${provider}`);
    }

    // Create promise that will be resolved when callback is received
    const resultPromise = new Promise<OAuthResult>((resolve, reject) => {
      // Set timeout for OAuth flow (5 minutes)
      const timeout = setTimeout(() => {
        this.pendingCallbacks.delete(state);
        this.pkceVerifiers.delete(state);
        reject(new Error('OAuth timeout - no callback received after 5 minutes'));
      }, 5 * 60 * 1000);

      this.pendingCallbacks.set(state, { resolve, reject, timeout });
    });

    // Register callback handler with the OAuth server
    this.server.registerCallback(state, async (data: OAuthCallbackData) => {
      console.log(`[UnifiedOAuth] Callback received for ${provider}`);

      const pending = this.pendingCallbacks.get(data.state);
      if (!pending) {
        console.warn(`[UnifiedOAuth] No pending callback found for state: ${data.state}`);
        return;
      }

      // Clear timeout
      clearTimeout(pending.timeout);
      this.pendingCallbacks.delete(data.state);

      try {
        const result = await this.handleCallback(provider, data.code, data.state);
        pending.resolve(result);
      } catch (error: any) {
        pending.reject(error);
      }
    });

    // Build authorization URL
    const scopes = customScopes || config.scopes;
    const authUrl = this.buildAuthUrl(provider, config, state, redirectUri, scopes, pkceParams);

    console.log(`[UnifiedOAuth] Auth URL generated for ${provider}`);

    // Return both the auth URL and the promise
    // The caller should open the URL, then await the result
    return {
      success: true,
      authUrl
    };
  }

  /**
   * Build authorization URL with all parameters
   */
  private buildAuthUrl(
    provider: OAuthProvider,
    config: OAuthProviderConfig,
    state: string,
    redirectUri: string,
    scopes: string[],
    pkceParams: { code_challenge: string; code_challenge_method: string } | null
  ): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: config.responseType || 'code',
      redirect_uri: redirectUri,
      state,
    });

    // Add scopes
    if (scopes.length > 0) {
      params.set('scope', scopes.join(' '));
    }

    // Add provider-specific params
    if (provider === 'notion') {
      params.set('owner', 'user');
    } else if (provider === 'google') {
      params.set('access_type', 'offline'); // Request refresh token
      params.set('prompt', 'consent'); // Force consent to get refresh token
    } else if (provider === 'microsoft') {
      params.set('response_mode', 'query');
    }

    // Add PKCE params
    if (pkceParams) {
      params.set('code_challenge', pkceParams.code_challenge);
      params.set('code_challenge_method', pkceParams.code_challenge_method);
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  private async handleCallback(
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<OAuthResult> {
    console.log(`[UnifiedOAuth] Handling callback for ${provider}`);

    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not found`);
    }

    // Get PKCE verifier if applicable
    const codeVerifier = this.pkceVerifiers.get(state);
    if (config.usePKCE && !codeVerifier) {
      throw new Error('PKCE verifier not found');
    }

    // Exchange authorization code for tokens
    const tokenResult = await this.exchangeCodeForToken(
      provider,
      config,
      code,
      codeVerifier
    );

    console.log(`[UnifiedOAuth] Token exchange successful for ${provider}`);

    // Clean up PKCE verifier
    if (codeVerifier) {
      this.pkceVerifiers.delete(state);
    }

    // Fetch additional user/workspace info if needed
    const additionalData = await this.fetchProviderData(provider, tokenResult.accessToken);

    return {
      success: true,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.expiresIn,
      userInfo: additionalData?.userInfo,
      providerData: additionalData?.providerData
    };
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    provider: OAuthProvider,
    config: OAuthProviderConfig,
    code: string,
    codeVerifier?: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
    const redirectUri = this.server.getCallbackUrl();

    // Build token request body
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId
    };

    // Add client credentials or PKCE verifier
    if (config.usePKCE && codeVerifier) {
      body.code_verifier = codeVerifier;
    } else if (config.clientSecret) {
      body.client_secret = config.clientSecret;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    // For Notion, use Basic Auth
    if (provider === 'notion' && config.clientSecret) {
      const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
      headers.Authorization = `Basic ${credentials}`;
      delete body.client_id;
      delete body.client_secret;
    }

    // Make token exchange request
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body: new URLSearchParams(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[UnifiedOAuth] Token exchange failed:`, errorText);
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  /**
   * Fetch provider-specific data (workspace, user info, etc.)
   */
  private async fetchProviderData(provider: OAuthProvider, accessToken: string): Promise<any> {
    try {
      switch (provider) {
        case 'notion':
          // Notion returns workspace info in the token response
          // No additional API call needed
          return null;

        case 'google':
          // Fetch Google user info
          const googleUserInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });

          if (!googleUserInfo.ok) {
            throw new Error('Failed to fetch Google user info');
          }

          const googleData = await googleUserInfo.json();
          return {
            userInfo: {
              email: googleData.email,
              name: googleData.name,
              picture: googleData.picture
            },
            providerData: googleData
          };

        case 'microsoft':
          // Fetch Microsoft user info
          const msUserInfo = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });

          if (!msUserInfo.ok) {
            throw new Error('Failed to fetch Microsoft user info');
          }

          const msData = await msUserInfo.json();
          return {
            userInfo: {
              email: msData.mail || msData.userPrincipalName,
              name: msData.displayName,
              picture: null // Would need separate call to get photo
            },
            providerData: msData
          };

        default:
          return null;
      }
    } catch (error: any) {
      console.error(`[UnifiedOAuth] Error fetching provider data for ${provider}:`, error);
      // Don't fail the entire OAuth flow if we can't fetch user info
      return null;
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshToken(provider: OAuthProvider, refreshToken: string): Promise<OAuthResult> {
    console.log(`[UnifiedOAuth] Refreshing token for ${provider}...`);

    const config = this.providers.get(provider);
    if (!config) {
      return {
        success: false,
        error: `Provider ${provider} not configured`
      };
    }

    try {
      const body: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId
      };

      if (config.clientSecret && !config.usePKCE) {
        body.client_secret = config.clientSecret;
      }

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
        expiresIn: data.expires_in
      };
    } catch (error: any) {
      console.error(`[UnifiedOAuth] Error refreshing token for ${provider}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke access token (logout)
   */
  async revokeToken(provider: OAuthProvider, token: string): Promise<boolean> {
    console.log(`[UnifiedOAuth] Revoking token for ${provider}...`);

    try {
      switch (provider) {
        case 'google':
          await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
            method: 'POST'
          });
          return true;

        case 'microsoft':
          // Microsoft doesn't have a simple revoke endpoint
          // User needs to revoke from account settings
          return true;

        case 'notion':
          // Notion doesn't support token revocation
          // Tokens expire naturally
          return true;

        default:
          return true;
      }
    } catch (error: any) {
      console.error(`[UnifiedOAuth] Error revoking token for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Clean up all pending callbacks and timeouts
   */
  cleanup(): void {
    console.log('[UnifiedOAuth] Cleaning up pending callbacks...');

    for (const [state, pending] of this.pendingCallbacks.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('OAuth manager shutting down'));
    }

    this.pendingCallbacks.clear();
    this.pkceVerifiers.clear();
  }
}
