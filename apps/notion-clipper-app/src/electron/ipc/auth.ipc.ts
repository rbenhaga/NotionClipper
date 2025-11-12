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

            // Setup background handler to wait for OAuth completion and notify frontend
            // We'll use the UnifiedOAuthManager's internal promise system
            (async () => {
                try {
                    // Create a new promise that will resolve when the callback fires
                    // We need to hook into the manager's callback system
                    // Unfortunately the current architecture doesn't expose this well

                    // Alternative: Just wait a bit and check the callback
                    // For now, we'll rely on the OAuth manager's internal promise resolution

                    // The OAuth callback will be handled by the UnifiedOAuthManager
                    // When it completes, we need to notify the frontend

                    // HACK: Store a reference to send the result
                    const state = result.authUrl!.match(/state=([^&]+)/)?.[1];
                    if (state) {
                        // Wrap the original callback to also send to frontend
                        const originalCallback = (oauthManager as any).pendingCallbacks.get(state);
                        if (originalCallback) {
                            const wrappedResolve = (authResult: OAuthResult) => {
                                console.log('[Auth] Sending Google OAuth result to frontend');
                                event.sender.send('auth:oauth-result', authResult);
                                originalCallback.resolve(authResult);
                            };
                            const wrappedReject = (error: Error) => {
                                console.error('[Auth] Google OAuth failed:', error);
                                event.sender.send('auth:oauth-result', {
                                    success: false,
                                    error: error.message
                                });
                                originalCallback.reject(error);
                            };

                            // Replace the callback
                            (oauthManager as any).pendingCallbacks.set(state, {
                                resolve: wrappedResolve,
                                reject: wrappedReject,
                                timeout: originalCallback.timeout
                            });
                        }
                    }
                } catch (error: any) {
                    console.error('[Auth] Error setting up OAuth callback:', error);
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
