import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

interface OAuthResult {
    success: boolean;
    error?: string;
    authUrl?: string;
    token?: string;
    workspace?: {
        id: string;
        name: string;
        icon?: string;
    };
}

interface TokenExchangeResult {
    success: boolean;
    access_token: string;
    workspace_name: string;
    workspace_id: string;
    workspace_icon?: string;
}

function registerNotionIPC(): void {
    console.log('[CONFIG] Registering Notion IPC handlers...');

    // ============================================
    // OAUTH HANDLERS
    // ============================================

    ipcMain.handle('notion:startOAuth', async (event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[OAuth] Starting OAuth flow...');

        const clientId = process.env.NOTION_CLIENT_ID;
        const clientSecret = process.env.NOTION_CLIENT_SECRET;
        console.log('[OAuth] Client ID from env:', clientId ? `présent (${clientId})` : 'MANQUANT');
        console.log('[OAuth] Client Secret from env:', clientSecret ? 'présent' : 'MANQUANT');

        if (!clientId || !clientSecret) {
            console.error('[OAuth] NOTION_CLIENT_ID or NOTION_CLIENT_SECRET not found in environment');
            return {
                success: false,
                error: 'Configuration OAuth manquante'
            };
        }

        // Récupérer le serveur OAuth
        const { oauthServer, newConfigService } = require('../main');
        if (!oauthServer) {
            console.error('[OAuth] OAuth server not available');
            return {
                success: false,
                error: 'Serveur OAuth non disponible'
            };
        }

        const state = Math.random().toString(36).substring(2, 15);
        const redirectUri = oauthServer.getCallbackUrl();

        // Enregistrer un callback pour gérer le code OAuth
        oauthServer.registerCallback(state, async (data: { code: string; state: string }) => {
            console.log('[OAuth] Callback received with code:', data.code.substring(0, 10) + '...');

            try {
                // Échanger le code contre un token
                const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`
                    },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code: data.code,
                        redirect_uri: redirectUri
                    })
                });

                if (!tokenResponse.ok) {
                    const errorData = await tokenResponse.text();
                    console.error('[OAuth] Token exchange failed:', errorData);
                    throw new Error('Failed to exchange code for token');
                }

                const tokenData = await tokenResponse.json();
                console.log('[OAuth] Token exchange successful for workspace:', tokenData.workspace_name);

                // Sauvegarder le token
                if (newConfigService) {
                    await newConfigService.setNotionToken(tokenData.access_token);
                    await newConfigService.set('onboardingCompleted', true);
                    await newConfigService.set('workspaceName', tokenData.workspace_name);
                    await newConfigService.set('workspaceIcon', tokenData.workspace_icon);
                }

                // Envoyer le résultat au frontend
                const successData: OAuthResult = {
                    success: true,
                    token: tokenData.access_token,
                    workspace: {
                        id: tokenData.workspace_id,
                        name: tokenData.workspace_name,
                        icon: tokenData.workspace_icon
                    }
                };

                console.log('[OAuth] Sending success result to frontend');
                event.sender.send('oauth:result', successData);

            } catch (error: any) {
                console.error('[OAuth] Error during token exchange:', error);
                const errorData: OAuthResult = {
                    success: false,
                    error: error.message || 'Erreur lors de la connexion'
                };
                event.sender.send('oauth:result', errorData);
            }
        });

        const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
            `client_id=${clientId}&` +
            `response_type=code&` +
            `owner=user&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`;

        console.log('[OAuth] Generated auth URL:', authUrl);
        console.log('[OAuth] Redirect URI:', redirectUri);

        return {
            authUrl,
            success: true
        };
    });

    // Handler pour vérifier le statut d'authentification
    ipcMain.handle('notion:check-auth-status', async (_event: IpcMainInvokeEvent) => {
        try {
            // Dynamic require to avoid circular dependencies
            const { newNotionService, newConfigService } = require('../main');

            if (!newConfigService) {
                return { isValid: false, needsReauth: true, error: 'Service non disponible' };
            }

            const token = await newConfigService.getNotionToken();
            if (!token) {
                return { isValid: false, needsReauth: true, error: 'Aucun token trouvé' };
            }

            if (!newNotionService) {
                return { isValid: false, needsReauth: true, error: 'Service Notion non initialisé' };
            }

            // Tester la connexion
            const isValid = await (newNotionService as any).testConnection();
            return {
                isValid,
                needsReauth: !isValid,
                error: isValid ? undefined : 'Token expiré ou invalide'
            };
        } catch (error: any) {
            console.error('[AUTH] Error checking auth status:', error);
            return { isValid: false, needsReauth: true, error: error.message };
        }
    });

    // Handler pour forcer une nouvelle authentification
    ipcMain.handle('notion:force-reauth', async (_event: IpcMainInvokeEvent) => {
        try {
            // Dynamic require to avoid circular dependencies
            const { newConfigService } = require('../main');

            if (newConfigService) {
                // Supprimer le token actuel
                await newConfigService.setNotionToken('');
                await newConfigService.set('onboardingCompleted', false);

                return { success: true };
            }

            return { success: false, error: 'Service non disponible' };
        } catch (error: any) {
            console.error('[AUTH] Error forcing reauth:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('notion:validateApiKey', async (_event: IpcMainInvokeEvent, apiKey: string) => {
        try {
            console.log('[API Key] Validating API key...');

            const response = await fetch('https://api.notion.com/v1/users/me', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Notion-Version': '2022-06-28'
                }
            });

            if (!response.ok) {
                console.error('[API Key] Validation failed:', response.status);
                return { valid: false, error: 'Token invalide ou expiré' };
            }

            const userData = await response.json();
            console.log('[API Key] Validation successful for user:', userData.name);

            // Sauvegarder le token
            const { newConfigService } = require('../main');
            if (newConfigService) {
                await newConfigService.setNotionToken(apiKey);
                await newConfigService.set('onboardingCompleted', true);
                await newConfigService.set('workspaceName', userData.name || 'Mon Workspace');
            }

            return {
                valid: true,
                user: userData
            };
        } catch (error: any) {
            console.error('[API Key] Error during validation:', error);
            return { valid: false, error: 'Erreur lors de la validation' };
        }
    });

    // ✅ Handler pour réinitialiser le NotionService après l'onboarding
    ipcMain.handle('notion:reinitialize-service', async (_event: IpcMainInvokeEvent) => {
        try {
            console.log('[NOTION] 🔄 Reinitializing NotionService...');
            const { newConfigService } = require('../main');

            if (!newConfigService) {
                console.error('[NOTION] ❌ Config service not available');
                return { success: false, error: 'Config service not available' };
            }

            // Récupérer le token depuis la config
            console.log('[NOTION] 📥 Getting token from config...');
            const token = await newConfigService.getNotionToken();
            console.log('[NOTION] Token found:', !!token);

            if (!token) {
                console.error('[NOTION] ❌ No token available in config');
                return { success: false, error: 'No token available' };
            }

            console.log('[NOTION] ✅ Token retrieved successfully');
            console.log('[NOTION] 🔧 Calling reinitializeNotionService...');

            // Réinitialiser le service
            const mainModule = require('../main');
            const success = (mainModule as any).reinitializeNotionService(token);
            if (success) {
                console.log('[NOTION] ✅ NotionService successfully reinitialized');
                return { success: true };
            } else {
                console.error('[NOTION] ❌ reinitializeNotionService returned false');
                return { success: false, error: 'Failed to reinitialize service' };
            }
        } catch (error: any) {
            console.error('[NOTION] ❌ Critical error reinitializing service:', error);
            return { success: false, error: error.message };
        }
    });

    // Handler pour obtenir les pages
    ipcMain.handle('notion:get-pages', async (_event: IpcMainInvokeEvent, forceRefresh = false) => {
        try {
            console.log('[NOTION] Getting pages, forceRefresh:', forceRefresh);

            // Dynamic require to avoid circular dependencies
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available', pages: [] };
            }

            const pages = await notionService.getPages(forceRefresh);
            console.log('[NOTION] Retrieved pages:', pages?.length || 0);

            return { success: true, pages: pages || [] };
        } catch (error: any) {
            console.error('[NOTION] Error getting pages:', error);
            return { success: false, error: error.message, pages: [] };
        }
    });

    // Handler pour envoyer du contenu
    ipcMain.handle('notion:send', async (_event: IpcMainInvokeEvent, data: any) => {
        try {
            console.log('[NOTION] Sending content to page:', data.pageId);

            // Dynamic require to avoid circular dependencies
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available' };
            }

            const result = await notionService.sendContent(data);
            console.log('[NOTION] Send result:', result?.success ? 'success' : 'failed');

            return result || { success: false, error: 'Unknown error' };
        } catch (error: any) {
            console.error('[NOTION] Error sending content:', error);
            return { success: false, error: error.message };
        }
    });

    // Handler pour tester la connexion
    ipcMain.handle('notion:test-connection', async (_event: IpcMainInvokeEvent) => {
        try {
            console.log('[NOTION] Testing connection...');

            // Dynamic require to avoid circular dependencies
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available' };
            }

            const result = await notionService.testConnection();
            console.log('[NOTION] Connection test result:', result?.success ? 'success' : 'failed');

            return result || { success: false, error: 'Unknown error' };
        } catch (error: any) {
            console.error('[NOTION] Error testing connection:', error);
            return { success: false, error: error.message };
        }
    });

    // Handler pour vérifier un token
    ipcMain.handle('notion:verify-token', async (_event: IpcMainInvokeEvent, token: string) => {
        try {
            console.log('[NOTION] Verifying token...');

            // Dynamic require to avoid circular dependencies
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available' };
            }

            const result = await notionService.verifyToken(token);
            console.log('[NOTION] Token verification result:', result?.success ? 'valid' : 'invalid');

            return result || { success: false, error: 'Unknown error' };
        } catch (error: any) {
            console.error('[NOTION] Error verifying token:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[OK] Notion IPC handlers registered');
}

// Note: Les fonctions startOAuthServer et exchangeCodeForToken ont été supprimées
// Le serveur OAuth est maintenant géré par oauth-server.ts qui utilise les pages HTML modernes

export default registerNotionIPC;
