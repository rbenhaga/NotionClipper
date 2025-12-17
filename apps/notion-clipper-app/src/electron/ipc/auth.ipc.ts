// apps/notion-clipper-app/src/electron/ipc/auth.ipc.ts
// IPC handlers for OAuth authentication via NotionClipperWeb backend
// 🔧 MIGRATED: No longer uses local OAuth server (port 8080)

import { ipcMain, shell, IpcMainInvokeEvent } from 'electron';

interface OAuthResult {
    success: boolean;
    error?: string;
    authUrl?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    userId?: string;
    userInfo?: any;
    providerData?: any;
}

type OAuthProvider = 'google' | 'notion' | 'microsoft';

// 🔧 Get backend API URL from environment
// NOTE: BACKEND_API_URL should NOT include /api suffix (e.g., http://localhost:3001)
// We add /api prefix to endpoints as needed
function getBackendApiUrl(): string {
    const baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3001';
    // Remove trailing /api if present (for consistency)
    return baseUrl.replace(/\/api\/?$/, '');
}

// Get the full API URL with /api prefix
function getApiUrl(): string {
    return `${getBackendApiUrl()}/api`;
}

function registerAuthIPC(): void {
    console.log('[AUTH IPC] Registering auth IPC handlers (using backend OAuth)...');

    // ============================================
    // GOOGLE OAUTH HANDLER - Via Backend
    // ============================================
    ipcMain.handle('auth:startGoogleOAuth', async (_event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[Auth] Starting Google OAuth flow via backend...');

        try {
            const apiUrl = getApiUrl();
            
            // Build auth URL with source=app for deep link redirect
            const authUrl = `${apiUrl}/auth/google?source=app`;
            
            console.log('[Auth] Opening browser for Google auth:', authUrl);
            
            // Open in default browser - backend will redirect to notion-clipper://localhost/auth/success
            await shell.openExternal(authUrl);
            
            return {
                success: true,
                authUrl
            };
        } catch (error: any) {
            console.error('[Auth] Error starting Google OAuth:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du démarrage OAuth Google'
            };
        }
    });

    // ============================================
    // NOTION OAUTH HANDLER - Via Backend
    // ============================================
    ipcMain.handle('auth:startNotionOAuth', async (_event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[Auth] Starting Notion OAuth flow via backend...');

        try {
            const apiUrl = getApiUrl();
            
            // Build auth URL with source=app for deep link redirect
            const authUrl = `${apiUrl}/auth/notion?source=app`;
            
            console.log('[Auth] Opening browser for Notion auth:', authUrl);
            
            // Open in default browser
            await shell.openExternal(authUrl);
            
            return {
                success: true,
                authUrl
            };
        } catch (error: any) {
            console.error('[Auth] Error starting Notion OAuth:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du démarrage OAuth Notion'
            };
        }
    });

    // ============================================
    // MICROSOFT OAUTH HANDLER - Via Backend (future)
    // ============================================
    ipcMain.handle('auth:startMicrosoftOAuth', async (_event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[Auth] Starting Microsoft OAuth flow via backend...');

        try {
            const apiUrl = getApiUrl();
            
            // Build auth URL with source=app for deep link redirect
            const authUrl = `${apiUrl}/auth/microsoft?source=app`;
            
            console.log('[Auth] Opening browser for Microsoft auth:', authUrl);
            
            // Open in default browser
            await shell.openExternal(authUrl);
            
            return {
                success: true,
                authUrl
            };
        } catch (error: any) {
            console.error('[Auth] Error starting Microsoft OAuth:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du démarrage OAuth Microsoft'
            };
        }
    });

    // ============================================
    // GENERIC OAUTH STARTER - Via Backend
    // ============================================
    ipcMain.handle('auth:startOAuth', async (_event: IpcMainInvokeEvent, provider: OAuthProvider): Promise<OAuthResult> => {
        console.log(`[Auth] Starting ${provider} OAuth flow via backend...`);

        try {
            const apiUrl = getApiUrl();
            
            // Build auth URL with source=app for deep link redirect
            const authUrl = `${apiUrl}/auth/${provider}?source=app`;
            
            console.log(`[Auth] Opening browser for ${provider} auth:`, authUrl);
            
            // Open in default browser
            await shell.openExternal(authUrl);
            
            return {
                success: true,
                authUrl
            };
        } catch (error: any) {
            console.error(`[Auth] Error starting ${provider} OAuth:`, error);
            return {
                success: false,
                error: error.message || `Erreur lors du démarrage OAuth ${provider}`
            };
        }
    });

    // ============================================
    // VALIDATE TOKEN WITH BACKEND
    // ============================================
    ipcMain.handle('auth:validateToken', async (_event: IpcMainInvokeEvent, token: string): Promise<OAuthResult> => {
        console.log('[Auth] Validating token with backend...');

        try {
            const apiUrl = getApiUrl();
            
            const response = await fetch(`${apiUrl}/user/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: 'Token invalide ou expiré'
                };
            }

            const userData = await response.json();
            
            return {
                success: true,
                userInfo: userData.data?.user || userData.user || userData
            };
        } catch (error: any) {
            console.error('[Auth] Error validating token:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors de la validation du token'
            };
        }
    });

    // ============================================
    // GET SUBSCRIPTION STATUS FROM BACKEND
    // ============================================
    ipcMain.handle('auth:getSubscription', async (_event: IpcMainInvokeEvent, token: string): Promise<any> => {
        console.log('[Auth] Getting subscription from backend...');

        try {
            const apiUrl = getApiUrl();
            
            const response = await fetch(`${apiUrl}/user/subscription`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Auth] Failed to get subscription:', errorText);
                return {
                    success: false,
                    error: 'Impossible de récupérer l\'abonnement'
                };
            }

            const data = await response.json();
            
            return {
                success: true,
                subscription: data.data?.subscription || data.subscription || data
            };
        } catch (error: any) {
            console.error('[Auth] Error getting subscription:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors de la récupération de l\'abonnement'
            };
        }
    });

    // ============================================
    // LOGOUT - Clear local data
    // ============================================
    ipcMain.handle('auth:logout', async (_event: IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> => {
        console.log('[Auth] Logging out...');

        try {
            const { newConfigService } = require('../main');
            
            if (newConfigService) {
                // Clear all auth-related data
                await newConfigService.setNotionToken('');
                await newConfigService.set('userId', '');
                await newConfigService.set('userEmail', '');
                await newConfigService.set('authToken', '');
                await newConfigService.set('onboardingCompleted', false);
                
                console.log('[Auth] ✅ Local auth data cleared');
            }

            return { success: true };
        } catch (error: any) {
            console.error('[Auth] Error during logout:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors de la déconnexion'
            };
        }
    });

    // ============================================
    // HANDLE DEEP LINK TOKEN - Called from main process
    // ============================================
    ipcMain.handle('auth:handleDeepLinkToken', async (_event: IpcMainInvokeEvent, token: string): Promise<OAuthResult> => {
        console.log('[Auth] Handling deep link token...');

        try {
            const { newConfigService, reinitializeNotionService } = require('../main');
            const apiUrl = getApiUrl();
            
            // 🔧 FIX: Use new /app-data endpoint to get ALL data in one call
            console.log('[Auth] Fetching app data from backend...');
            const response = await fetch(`${apiUrl}/user/app-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Auth] Failed to fetch app data:', response.status, errorText);
                return {
                    success: false,
                    error: 'Token invalide ou expiré'
                };
            }

            const result = await response.json();
            const appData = result.data || result;
            
            console.log('[Auth] App data received:', {
                userId: appData.user?.id,
                email: appData.user?.email,
                hasNotionWorkspace: appData.hasNotionWorkspace,
                workspaceName: appData.notionWorkspace?.name,
                tier: appData.subscription?.tier
            });
            
            // Save all data to ConfigService
            if (newConfigService) {
                await newConfigService.set('authToken', token);
                await newConfigService.set('userId', appData.user?.id);
                await newConfigService.set('userEmail', appData.user?.email);
                
                // 🔧 FIX: Save Notion token if workspace exists
                if (appData.hasNotionWorkspace && appData.notionToken) {
                    console.log('[Auth] 🔑 Saving Notion token from backend...');
                    await newConfigService.setNotionToken(appData.notionToken);
                    await newConfigService.set('workspaceName', appData.notionWorkspace?.name || 'My Workspace');
                    await newConfigService.set('workspaceId', appData.notionWorkspace?.id);
                    await newConfigService.set('onboardingCompleted', true);
                    
                    // 🔧 FIX: Reinitialize NotionService with the token (await for IPC response)
                    const reinitSuccess = await reinitializeNotionService(appData.notionToken);
                    if (reinitSuccess) {
                        console.log('[Auth] ✅ NotionService reinitialized');
                    } else {
                        console.warn('[Auth] ⚠️ Failed to reinitialize NotionService');
                    }
                }
                
                console.log('[Auth] ✅ All auth data saved for user:', appData.user?.email);
            }

            return {
                success: true,
                accessToken: token,
                userInfo: appData.user,
                providerData: {
                    hasNotionWorkspace: appData.hasNotionWorkspace,
                    notionWorkspace: appData.notionWorkspace,
                    subscription: appData.subscription
                }
            };
        } catch (error: any) {
            console.error('[Auth] Error handling deep link token:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du traitement du token'
            };
        }
    });

    console.log('[AUTH IPC] ✅ Auth IPC handlers registered (backend OAuth mode)');
}

export default registerAuthIPC;
