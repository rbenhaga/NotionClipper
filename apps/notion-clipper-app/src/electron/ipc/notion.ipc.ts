import { ipcMain, shell } from 'electron';
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

function registerNotionIPC(): void {
    console.log('[CONFIG] Registering Notion IPC handlers...');

    // ============================================
    // OAUTH HANDLERS - Using NotionClipperWeb Backend
    // ============================================

    /**
     * Start Notion OAuth via NotionClipperWeb backend
     * The backend handles the OAuth flow and redirects back via deep link
     */
    ipcMain.handle('notion:startOAuth', async (event: IpcMainInvokeEvent): Promise<OAuthResult> => {
        console.log('[OAuth] Starting Notion OAuth flow via backend...');

        try {
            const apiUrl = getApiUrl();
            
            // Build auth URL with source=app for deep link redirect
            const authUrl = `${apiUrl}/auth/notion?source=app`;
            
            console.log('[OAuth] Opening browser for Notion auth:', authUrl);
            
            // Open in default browser
            await shell.openExternal(authUrl);
            
            return {
                success: true,
                authUrl // Return URL for reference
            };
        } catch (error: any) {
            console.error('[OAuth] Error starting Notion OAuth:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors du démarrage OAuth'
            };
        }
    });

    // Handler pour vérifier le statut d'authentification
    ipcMain.handle('notion:check-auth-status', async (_event: IpcMainInvokeEvent) => {
        try {
            // 🔧 FIX P0: Use dynamic property access instead of destructuring
            // Destructuring captures value at require time, causing stale references
            const mainModule = require('../main');

            if (!mainModule.newConfigService) {
                return { isValid: false, needsReauth: true, error: 'Service non disponible' };
            }

            const token = await mainModule.newConfigService.getNotionToken();
            if (!token) {
                return { isValid: false, needsReauth: true, error: 'Aucun token trouvé' };
            }

            if (!mainModule.newNotionService) {
                return { isValid: false, needsReauth: true, error: 'Service Notion non initialisé' };
            }

            // Tester la connexion
            const isValid = await (mainModule.newNotionService as any).testConnection();
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
            // 🔧 FIX P0: Use dynamic property access instead of destructuring
            const mainModule = require('../main');

            if (mainModule.newConfigService) {
                // Supprimer le token actuel
                await mainModule.newConfigService.setNotionToken('');
                await mainModule.newConfigService.set('onboardingCompleted', false);

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

            // 🔧 FIX P0: Use dynamic property access instead of destructuring
            const mainModule = require('../main');
            if (mainModule.newConfigService) {
                await mainModule.newConfigService.setNotionToken(apiKey);
                await mainModule.newConfigService.set('onboardingCompleted', true);
                await mainModule.newConfigService.set('workspaceName', userData.name || 'Mon Workspace');
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
            let token = providedToken;

            // Fallback: Try to get token from config if not provided
            if (!token) {
                const { newConfigService } = require('../main');
                if (newConfigService) {
                    token = await newConfigService.getNotionToken();
                }
            }

            if (!token) {
                console.error('[NOTION] ❌ reinitialize-service: No token available');
                return { success: false, error: 'No token available' };
            }

            // Réinitialiser le service (function is idempotent - will skip if same token)
            const mainModule = require('../main');
            const success = await (mainModule as any).reinitializeNotionService(token);
            // Note: reinitializeNotionService logs its own status (skipped or initialized)
            return { success };
        } catch (error: any) {
            console.error('[NOTION] ❌ Critical error reinitializing service:', error);
            return { success: false, error: error.message };
        }
    });

    // 🔧 Handler to set the scope key for cache isolation
    ipcMain.handle('notion:set-scope', async (_event: IpcMainInvokeEvent, scopeKey: string) => {
        try {
            console.log('[NOTION] Setting scope key:', scopeKey);
            
            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (notionService && typeof notionService.setScopeKey === 'function') {
                notionService.setScopeKey(scopeKey);
                return { success: true };
            }

            console.warn('[NOTION] NotionService.setScopeKey not available');
            return { success: false, error: 'setScopeKey not available' };
        } catch (error: any) {
            console.error('[NOTION] Error setting scope:', error);
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
            const newConfigService = (mainModule as any).newConfigService;
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
                    // 🔧 FIX: Use Electron ConfigService instead of AuthDataManager (which is a React singleton)
                    // AuthDataManager.getCurrentData() returns null in Electron main process context
                    const userId = await newConfigService?.get('userId');
                    console.log('[NOTION] 🔍 DEBUG: userId from ConfigService =', userId || 'undefined');

                    // 🔒 SECURITY P0: Get auth token - REQUIRED for tracking
                    const authToken = await newConfigService?.get('authToken');
                    
                    if (!authToken) {
                        console.warn('[NOTION] ⚠️ Skipping usage tracking: no authToken (user not authenticated)');
                    } else {
                        // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Supabase Edge Function
                        const apiUrl = getApiUrl();

                        console.log('[NOTION] 🚀 Calling backend track-usage...');
                        // Count words for metadata
                        const contentText = data.content?.text || data.content?.textContent || '';
                        const wordCount = contentText ? contentText.split(/\s+/).length : 0;
                        const pageCount = data.pageIds ? data.pageIds.length : 1;

                        const response = await fetch(`${apiUrl}/usage/track`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`, // 🔒 REQUIRED - backend extracts userId from JWT
                            },
                            body: JSON.stringify({
                                // 🔒 SECURITY: userId NOT sent - backend extracts from JWT token
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
                            console.log('[NOTION] ✅ Quota tracked via backend');
                        } else {
                            console.error('[NOTION] ⚠️ Failed to track quota:', await response.text());
                        }
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

    // ✅ Handler pour vider tout le cache des blocs (TOC cache)
    ipcMain.handle('notion:clear-all-blocks-cache', async (_event: IpcMainInvokeEvent) => {
        console.log('[NOTION] Clearing all blocks cache (TOC cache)...');
        const cacheSize = pageBlocksCache.size;
        pageBlocksCache.clear();
        console.log(`[NOTION] ✅ Cleared ${cacheSize} cached page blocks`);
        return { success: true, clearedCount: cacheSize };
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
    // 🔧 PROTOCOL: Renderer sends scopeKey, main validates it matches current scope
    ipcMain.handle('notion:get-pages-paginated', async (_event: IpcMainInvokeEvent, options?: { cursor?: string; pageSize?: number; scopeKey?: string }) => {
        try {
            console.log('[NOTION] Getting pages with pagination:', { ...options, scopeKey: options?.scopeKey ? '***' : 'none' });

            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available', pages: [], hasMore: false };
            }

            const currentScope = notionService.getScopeKey?.();
            const requestScope = options?.scopeKey;

            // 🔧 KILL SWITCH #1: Reject if main process scope not set
            if (!currentScope) {
                console.error('[NOTION] ❌ SCOPE_NOT_SET: Rejecting pages request - scope not initialized');
                return { 
                    success: false, 
                    error: 'SCOPE_NOT_SET', 
                    pages: [], 
                    hasMore: false 
                };
            }

            // 🔧 KILL SWITCH #2: Reject if renderer didn't send scopeKey (legacy call / bug)
            if (!requestScope) {
                console.error('[NOTION] ❌ SCOPE_REQUIRED: Rejecting pages request - scopeKey not provided by renderer');
                return { 
                    success: false, 
                    error: 'SCOPE_REQUIRED', 
                    pages: [], 
                    hasMore: false,
                    currentScope // Send back current scope so renderer can retry with it
                };
            }

            // 🔧 KILL SWITCH #3: Reject if scope mismatch (stale request from old workspace)
            if (requestScope !== currentScope) {
                console.warn(`[NOTION] ⚠️ SCOPE_MISMATCH: Rejecting stale request (request: ${requestScope}, current: ${currentScope})`);
                return { 
                    success: false, 
                    error: 'SCOPE_MISMATCH', 
                    pages: [], 
                    hasMore: false,
                    currentScope // Send back current scope so renderer can retry
                };
            }

            console.log(`[NOTION] 🔐 Fetching pages with scope: ${currentScope}`);

            // Utiliser la nouvelle méthode avec pagination
            const result = await notionService.getPagesWithPagination(options);
            
            return {
                success: true,
                pages: result.pages,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor,
                scopeKey: currentScope // Tag response with scope for renderer validation
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
    // 🔧 PROTOCOL: Renderer sends scopeKey, main validates it matches current scope
    ipcMain.handle('notion:get-recent-pages-paginated', async (_event: IpcMainInvokeEvent, options?: { cursor?: string; limit?: number; scopeKey?: string }) => {
        try {
            console.log('[NOTION] Getting recent pages with pagination:', { ...options, scopeKey: options?.scopeKey ? '***' : 'none' });

            const mainModule = require('../main');
            const notionService = (mainModule as any).newNotionService;

            if (!notionService) {
                console.error('[NOTION] NotionService not available');
                return { success: false, error: 'NotionService not available', pages: [], hasMore: false };
            }

            const currentScope = notionService.getScopeKey?.();
            const requestScope = options?.scopeKey;

            // 🔧 KILL SWITCH #1: Reject if main process scope not set
            if (!currentScope) {
                console.error('[NOTION] ❌ SCOPE_NOT_SET: Rejecting recent pages request');
                return { success: false, error: 'SCOPE_NOT_SET', pages: [], hasMore: false };
            }

            // 🔧 KILL SWITCH #2: Reject if renderer didn't send scopeKey
            if (!requestScope) {
                console.error('[NOTION] ❌ SCOPE_REQUIRED: Rejecting recent pages request - scopeKey not provided');
                return { success: false, error: 'SCOPE_REQUIRED', pages: [], hasMore: false, currentScope };
            }

            // 🔧 KILL SWITCH #3: Reject if scope mismatch (stale request)
            if (requestScope !== currentScope) {
                console.warn(`[NOTION] ⚠️ SCOPE_MISMATCH: Rejecting stale recent pages request`);
                return { success: false, error: 'SCOPE_MISMATCH', pages: [], hasMore: false, currentScope };
            }

            // Utiliser la nouvelle méthode pour les pages récentes
            const result = await notionService.getRecentPagesWithPagination(options);
            
            return {
                success: true,
                pages: result.pages,
                hasMore: result.hasMore,
                nextCursor: result.nextCursor,
                scopeKey: currentScope
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

    console.log('[OK] Notion IPC handlers registered (using backend OAuth)');
}

export default registerNotionIPC;
