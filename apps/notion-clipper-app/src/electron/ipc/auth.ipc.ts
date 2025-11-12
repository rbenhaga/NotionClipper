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
            // Get OAuth server
            const { oauthServer } = require('../main');
            if (!oauthServer) {
                console.error('[Auth] OAuth server not available');
                return {
                    success: false,
                    error: 'Serveur OAuth non disponible'
                };
            }

            // Create OAuth manager
            const oauthManager = new UnifiedOAuthManager(oauthServer);

            // Start OAuth flow - this returns authUrl and sets up callback handler
            const result = await oauthManager.startOAuth('google');

            if (!result.success || !result.authUrl) {
                return result;
            }

            // Setup a background handler to wait for the OAuth callback and send result to frontend
            // The UnifiedOAuthManager has registered a callback with the OAuth server
            // When the callback is received, it will resolve the pending promise
            // We need to wait for that and send the result to the frontend
            (async () => {
                try {
                    // Wait for the OAuth callback to complete
                    // This is handled by the promise inside UnifiedOAuthManager
                    // But we need access to that promise...
                    // For now, we'll handle it differently - see below
                } catch (error: any) {
                    console.error('[Auth] Error in OAuth callback:', error);
                    event.sender.send('auth:oauth-result', {
                        success: false,
                        error: error.message || 'Erreur lors du callback OAuth'
                    });
                }
            })();

            return {
                success: true,
                authUrl: result.authUrl
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
