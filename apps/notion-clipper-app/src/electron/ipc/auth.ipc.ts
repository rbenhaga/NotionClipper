// apps/notion-clipper-app/src/electron/ipc/auth.ipc.ts
// IPC handlers for OAuth authentication (Google, Microsoft, etc.)

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { UnifiedOAuthManager, type OAuthResult, type OAuthProvider } from '../services/unified-oauth-manager';

function registerAuthIPC(): void {
    console.log('[AUTH IPC] Registering auth IPC handlers...');

    // ============================================
    // GOOGLE OAUTH HANDLER
    // ============================================
    ipcMain.handle('auth:startGoogleOAuth', async (event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[Auth] Starting Google OAuth flow...');

        try {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            
            // ✅ Ne vérifier QUE le client ID (public)
            // Le client_secret est stocké dans Supabase Vault et utilisé par l'Edge Function
            if (!clientId) {
                console.error('[Auth] GOOGLE_CLIENT_ID not found in environment');
                return {
                    success: false,
                    error: 'Google Client ID manquant'
                };
            }

            // Get OAuth server
            const { oauthServer } = require('../main');
            if (!oauthServer) {
                console.error('[Auth] OAuth server not available');
                return {
                    success: false,
                    error: 'Serveur OAuth non disponible'
                };
            }

            const state = Math.random().toString(36).substring(2, 15);
            const redirectUri = oauthServer.getCallbackUrl();

            // Enregistrer callback pour recevoir le code OAuth
            oauthServer.registerCallback(state, async (data: { code: string; state: string }) => {
                console.log('[Auth] Google OAuth callback received with code:', data.code.substring(0, 10) + '...');

                try {
                    // ✅ Appeler l'Edge Function Supabase pour l'échange sécurisé du token
                    console.log('[Auth] Calling Supabase Edge Function for secure token exchange...');
                    
                    const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/google-oauth`;
                    const tokenResponse = await fetch(edgeFunctionUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                            code: data.code,
                            redirectUri: redirectUri,
                        })
                    });

                    if (!tokenResponse.ok) {
                        const errorData = await tokenResponse.text();
                        console.error('[Auth] Edge Function failed:', errorData);
                        throw new Error(`Failed to exchange code for token via Edge Function: ${errorData}`);
                    }

                    const result = await tokenResponse.json();
                    
                    if (!result.success) {
                        throw new Error(result.error || 'OAuth exchange failed');
                    }
                    
                    console.log('[Auth] Token exchange successful for user:', result.email);

                    // Envoyer le résultat au frontend
                    const successData: OAuthResult = {
                        success: true,
                        userInfo: result.userInfo,
                    };

                    console.log('[Auth] Sending success result to frontend');
                    event.sender.send('auth:oauth-result', successData);

                } catch (error: any) {
                    console.error('[Auth] Error during Google OAuth token exchange:', error);
                    const errorData: OAuthResult = {
                        success: false,
                        error: error.message || 'Erreur lors de la connexion Google'
                    };
                    event.sender.send('auth:oauth-result', errorData);
                }
            });

            // Construire l'URL d'autorisation Google
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${clientId}&` +
                `response_type=code&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `state=${state}&` +
                `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&` +
                `access_type=offline&` +
                `prompt=consent`;

            console.log('[Auth] Generated Google auth URL');
            console.log('[Auth] Redirect URI:', redirectUri);

            return {
                success: true,
                authUrl
            };

        } catch (error: any) {
            console.error('[Auth] Error starting Google OAuth:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du démarrage OAuth'
            };
        }
    });

    // ============================================
    // MICROSOFT OAUTH HANDLER (pour future)
    // ============================================
    ipcMain.handle('auth:startMicrosoftOAuth', async (event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[Auth] Starting Microsoft OAuth flow...');

        try {
            const { oauthServer } = require('../main');
            if (!oauthServer) {
                return {
                    success: false,
                    error: 'Serveur OAuth non disponible'
                };
            }

            const oauthManager = new UnifiedOAuthManager(oauthServer);
            const result = await oauthManager.startOAuth('microsoft');

            if (!result.success || !result.authUrl) {
                return result;
            }

            return {
                success: true,
                authUrl: result.authUrl
            };

        } catch (error: any) {
            console.error('[Auth] Error starting Microsoft OAuth:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du démarrage OAuth'
            };
        }
    });

    // ============================================
    // REFRESH TOKEN HANDLER
    // ============================================
    ipcMain.handle('auth:refreshToken', async (
        event: IpcMainInvokeEvent,
        provider: OAuthProvider,
        refreshToken: string
    ): Promise<OAuthResult> => {
        console.log(`[Auth] Refreshing ${provider} token...`);

        try {
            const { oauthServer } = require('../main');
            if (!oauthServer) {
                return {
                    success: false,
                    error: 'Serveur OAuth non disponible'
                };
            }

            const oauthManager = new UnifiedOAuthManager(oauthServer);
            return await oauthManager.refreshToken(provider, refreshToken);

        } catch (error: any) {
            console.error(`[Auth] Error refreshing ${provider} token:`, error);
            return {
                success: false,
                error: error.message || 'Erreur lors du rafraîchissement du token'
            };
        }
    });

    // ============================================
    // REVOKE TOKEN HANDLER
    // ============================================
    ipcMain.handle('auth:revokeToken', async (
        event: IpcMainInvokeEvent,
        provider: OAuthProvider,
        token: string
    ): Promise<{ success: boolean; error?: string }> => {
        console.log(`[Auth] Revoking ${provider} token...`);

        try {
            const { oauthServer } = require('../main');
            if (!oauthServer) {
                return {
                    success: false,
                    error: 'Serveur OAuth non disponible'
                };
            }

            const oauthManager = new UnifiedOAuthManager(oauthServer);
            const success = await oauthManager.revokeToken(provider, token);

            return { success };

        } catch (error: any) {
            console.error(`[Auth] Error revoking ${provider} token:`, error);
            return {
                success: false,
                error: error.message || 'Erreur lors de la révocation du token'
            };
        }
    });

    console.log('[AUTH IPC] Auth IPC handlers registered');
}

export default registerAuthIPC;
