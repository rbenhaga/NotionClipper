import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

interface OAuthResult {
    success: boolean;
    error?: string;
    authUrl?: string;
    token?: string;
    userId?: string;
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
        console.log('[OAuth] Client ID from env:', clientId ? `présent (${clientId})` : 'MANQUANT');
        
        // ✅ Ne vérifier QUE le client ID (public)
        // Le client_secret est stocké dans Supabase Vault et utilisé par l'Edge Function
        if (!clientId) {
            console.error('[OAuth] NOTION_CLIENT_ID not found in environment');
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
                // 🔒 Échanger le code via Edge Function sécurisée (secrets dans Supabase Vault)
                console.log('[OAuth] Calling Supabase Edge Function for secure token exchange...');
                
                const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/notion-oauth`;
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
                    console.error('[OAuth] Edge Function failed with status:', tokenResponse.status);
                    console.error('[OAuth] Edge Function error response:', errorData);
                    throw new Error(`Failed to exchange code for token via Edge Function: ${errorData}`);
                }

                const result = await tokenResponse.json();
                
                if (!result.success) {
                    throw new Error(result.error || 'OAuth exchange failed');
                }
                
                console.log('[OAuth] Token exchange successful for workspace:', result.workspace.name);

                // Sauvegarder le token
                if (newConfigService) {
                    await newConfigService.setNotionToken(result.token);
                    await newConfigService.set('onboardingCompleted', true);
                    await newConfigService.set('workspaceName', result.workspace.name);
                    await newConfigService.set('workspaceIcon', result.workspace.icon);
                }

                // Envoyer le résultat au frontend avec userId
                const successData: OAuthResult = {
                    success: true,
                    token: result.token,
                    workspace: result.workspace,
                    userId: result.userId // Ajouter le userId
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
    // 🔧 FIX: Accept token as parameter instead of reading from config
    // (AuthDataManager loads token from DB, not saved in Electron config)
    ipcMain.handle('notion:reinitialize-service', async (_event: IpcMainInvokeEvent, providedToken?: string) => {
        try {
            console.log('[NOTION] 🔄 Reinitializing NotionService...');

            let token = providedToken;

            // Fallback: Try to get token from config if not provided
            if (!token) {
                console.log('[NOTION] 📥 No token provided, trying config...');
                const { newConfigService } = require('../main');
                if (newConfigService) {
                    token = await newConfigService.getNotionToken();
                }
            }

            console.log('[NOTION] Token found:', !!token);

            if (!token) {
                console.error('[NOTION] ❌ No token available');
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

    // 🆕 Handler optimisé pour le chargement progressif (renvoie les premières pages rapidement)
    ipcMain.handle('notion:get-pages-fast', async (_event: IpcMainInvokeEvent, options: { limit?: number; forceRefresh?: boolean } = {}) => {
        try {
            const { limit = 20, forceRefresh = false } = options;
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                return { success: true, pages: [], hasMore: false };
            }

            console.log(`[NOTION] 🚀 Fast loading first ${limit} pages...`);
            const startTime = Date.now();

            // Charger les pages avec la nouvelle méthode batch
            const pages = await notionService.getPagesBatch?.({ limit, forceRefresh }) || await notionService.getPages(forceRefresh);
            const databases = await notionService.getDatabases(forceRefresh);

            const duration = Date.now() - startTime;
            const allItems = [...pages, ...databases].sort((a: any, b: any) => {
                const dateA = new Date(a.last_edited_time || 0).getTime();
                const dateB = new Date(b.last_edited_time || 0).getTime();
                return dateB - dateA;
            });

            // Retourner les premières pages immédiatement
            const firstBatch = allItems.slice(0, limit);

            console.log(`[NOTION] ⚡ Fast load complete: ${firstBatch.length}/${allItems.length} pages in ${duration}ms`);

            return {
                success: true,
                pages: firstBatch,
                hasMore: allItems.length > limit,
                total: allItems.length
            };
        } catch (error: any) {
            console.error('[ERROR] ❌ Fast page loading failed:', error);
            return {
                success: false,
                error: error.message,
                pages: [],
                hasMore: false
            };
        }
    });

    // Handler pour envoyer du contenu
    ipcMain.handle('notion:send', async (_event: IpcMainInvokeEvent, data: any) => {
        try {
            console.log('[NOTION] Sending content:', {
                pageId: data.pageId,
                pageIds: data.pageIds,
                hasContent: !!data.content
            });

            // Dynamic require to avoid circular dependencies
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;
            const newStatsService = (mainModule as any).newStatsService;
            // 🔧 FIX: Use dynamic import() for ESM packages (bypass TS compilation to CommonJS require)
            const importDynamic = new Function('modulePath', 'return import(modulePath)');
            const { authDataManager } = await importDynamic('@notion-clipper/ui') as any;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available' };
            }

            // Utiliser sendToNotion qui accepte l'objet data complet
            const result = await notionService.sendToNotion(data);
            console.log('[NOTION] Send result:', result?.success ? 'success' : 'failed');

            // 🔧 FIX: Increment quota ONCE per send action (multi-page = 1 clip)
            if (result.success) {
                // Local stats increment
                if (newStatsService) {
                    await newStatsService.incrementClips();
                    console.log('[NOTION] ✅ Local stats incremented');
                }

                // 🔥 CRITICAL: Track usage in Supabase (quota enforcement - NOT crackable)
                try {
                    const authData = authDataManager.getCurrentData();
                    console.log('[NOTION] 🔍 DEBUG: authData?.userId =', authData?.userId);

                    if (authData?.userId) {
                        const supabaseUrl = process.env.SUPABASE_URL;
                        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

                        console.log('[NOTION] 🔍 DEBUG: SUPABASE_URL =', supabaseUrl ? 'present' : 'MISSING');
                        console.log('[NOTION] 🔍 DEBUG: SUPABASE_ANON_KEY =', supabaseAnonKey ? 'present' : 'MISSING');

                        if (supabaseUrl && supabaseAnonKey) {
                            console.log('[NOTION] 🚀 Calling track-usage Edge Function...');
                            // Count words for metadata
                            const wordCount = data.content?.split(/\s+/).length || 0;
                            const pageCount = data.pageIds ? data.pageIds.length : 1;

                            const response = await fetch(`${supabaseUrl}/functions/v1/track-usage`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': supabaseAnonKey,
                                    'Authorization': `Bearer ${supabaseAnonKey}`
                                },
                                body: JSON.stringify({
                                    userId: authData.userId,
                                    feature: 'clips',
                                    increment: 1,
                                    metadata: {
                                        word_count: wordCount,
                                        page_count: pageCount,
                                        is_multiple_selection: pageCount > 1
                                    }
                                })
                            });

                            if (response.ok) {
                                console.log('[NOTION] ✅ Quota tracked in Supabase (secure)');
                            } else {
                                console.error('[NOTION] ⚠️ Failed to track quota:', await response.text());
                            }
                        } else {
                            console.error('[NOTION] ⚠️ Supabase env vars missing - cannot track quota');
                        }
                    } else {
                        console.error('[NOTION] ⚠️ No userId in authData - cannot track quota');
                    }
                } catch (trackError) {
                    console.error('[NOTION] ⚠️ Error tracking usage:', trackError);
                    // Don't fail the send if tracking fails
                }
            }

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

    // ✅ Cache simple pour les blocs de page (5 minutes)
    const pageBlocksCache = new Map<string, { blocks: any[], timestamp: number }>();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // ✅ Handler pour invalider le cache d'une page
    ipcMain.handle('notion:invalidate-blocks-cache', async (_event: IpcMainInvokeEvent, pageId: string) => {
        console.log('[NOTION] Invalidating cache for page:', pageId);
        pageBlocksCache.delete(pageId);
        return true;
    });

    // Handler pour obtenir les blocs d'une page
    ipcMain.handle('notion:get-page-blocks', async (_event: IpcMainInvokeEvent, pageId: string) => {
        try {
            // ✅ Vérifier le cache d'abord
            const cached = pageBlocksCache.get(pageId);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                console.log('[NOTION] Returning cached blocks for:', pageId);
                return cached.blocks;
            }

            console.log('[NOTION] Fetching blocks for:', pageId);

            // Dynamic require to avoid circular dependencies
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                throw new Error('NotionService not available');
            }

            const blocks = await notionService.getPageBlocks(pageId);
            console.log('[NOTION] Retrieved blocks:', blocks?.length || 0);

            // ✅ Mettre en cache
            pageBlocksCache.set(pageId, { blocks: blocks || [], timestamp: Date.now() });

            return blocks || [];
        } catch (error: any) {
            console.error('[NOTION] Error getting page blocks:', error);
            throw error;
        }
    });

    // ✅ Hook pour invalider le cache après un envoi avec position
    const originalSendHandler = ipcMain.listeners('notion:send')[0];
    if (originalSendHandler) {
        ipcMain.removeAllListeners('notion:send');
        ipcMain.handle('notion:send', async (event: IpcMainInvokeEvent, data: any) => {
            const result = await originalSendHandler(event, data);
            
            // Si l'envoi était positionné et réussi, invalider le cache
            if (result?.success && data?.options?.afterBlockId && data?.pageId) {
                console.log('[NOTION] Invalidating cache after positioned send for page:', data.pageId);
                pageBlocksCache.delete(data.pageId);
            }
            
            return result;
        });
    }

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

    // ============================================
    // ✅ NOUVEAUX HANDLERS POUR SCROLL INFINI
    // ============================================

    // Handler pour récupérer les pages avec pagination
    ipcMain.handle('notion:get-pages-paginated', async (_event: IpcMainInvokeEvent, options?: { cursor?: string; pageSize?: number }) => {
        try {
            console.log('[NOTION] Getting pages with pagination:', options);

            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available', pages: [], hasMore: false };
            }

            // Utiliser la nouvelle méthode avec pagination
            const result = await notionService.getPagesWithPagination(options);
            
            return {
                success: true,
                pages: result.pages,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor
            };
        } catch (error: any) {
            console.error('[NOTION] Error getting pages with pagination:', error);
            return { 
                success: false, 
                error: error.message,
                pages: [],
                hasMore: false
            };
        }
    });

    // Handler pour récupérer les pages récentes avec pagination
    ipcMain.handle('notion:get-recent-pages-paginated', async (_event: IpcMainInvokeEvent, options?: { cursor?: string; limit?: number }) => {
        try {
            console.log('[NOTION] Getting recent pages with pagination:', options);

            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available', pages: [], hasMore: false };
            }

            // Utiliser la nouvelle méthode pour les pages récentes
            const result = await notionService.getRecentPagesWithPagination(options);
            
            return {
                success: true,
                pages: result.pages,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor
            };
        } catch (error: any) {
            console.error('[NOTION] Error getting recent pages with pagination:', error);
            return { 
                success: false, 
                error: error.message,
                pages: [],
                hasMore: false
            };
        }
    });

    console.log('[OK] Notion IPC handlers registered (with pagination support)');
}

// Note: Les fonctions startOAuthServer et exchangeCodeForToken ont été supprimées
// Le serveur OAuth est maintenant géré par oauth-server.ts qui utilise les pages HTML modernes

export default registerNotionIPC;
