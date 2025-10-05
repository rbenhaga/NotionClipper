import { defineBackground } from 'wxt/sandbox';
import browser from 'webextension-polyfill';
import { NotionService } from '@notion-clipper/core/services';
import {
  WebExtensionStorageAdapter,
  WebExtensionNotionAPIAdapter
} from '@notion-clipper/adapters-webextension';
import type { ClipperConfig } from '@notion-clipper/ui';

// Service Notion global
let notionService: NotionService | null = null;

// Adapters
const storage = new WebExtensionStorageAdapter();

// Favoris (stockés localement)
let favorites: string[] = [];

/**
 * Initialiser le service Notion
 */
async function initNotionService(): Promise<void> {
  if (notionService) {
    return; // Déjà initialisé
  }

  try {
    // Charger la config
    const config = await storage.get<ClipperConfig>('clipperConfig');

    if (!config || !config.notionToken) {
      console.log('⚠️ No config found - Notion service not initialized');
      return;
    }

    // Créer l'adapter API
    const apiAdapter = new WebExtensionNotionAPIAdapter(config.notionToken);

    // Créer le service
    notionService = new NotionService(apiAdapter, storage);

    console.log('📦 Notion service initialized');
  } catch (error) {
    console.error('❌ Error initializing Notion service:', error);
    notionService = null;
  }
}

/**
 * Charger les favoris
 */
async function loadFavorites(): Promise<void> {
  try {
    const result = await browser.storage.local.get('favorites');
    favorites = (result.favorites as string[]) || [];
    console.log('⭐ Favorites loaded:', favorites.length);
  } catch (error) {
    console.error('❌ Error loading favorites:', error);
    favorites = [];
  }
}

/**
 * Sauvegarder les favoris
 */
async function saveFavorites(): Promise<void> {
  try {
    await browser.storage.local.set({ favorites });
    console.log('💾 Favorites saved:', favorites.length);
  } catch (error) {
    console.error('❌ Error saving favorites:', error);
  }
}

/**
 * Point d'entrée du background script
 */
export default defineBackground(() => {
  console.log('🚀 Notion Clipper Pro background started');

  // Charger les favoris au démarrage
  loadFavorites();

  // Créer le menu contextuel à l'installation
  browser.runtime.onInstalled.addListener(async () => {
    try {
      // Supprimer les anciens menus si ils existent
      await browser.contextMenus.removeAll();

      // Créer le menu
      await browser.contextMenus.create({
        id: 'notion-clipper-send',
        title: 'Envoyer vers Notion',
        contexts: ['selection']
      });
      console.log('✅ Context menu created');
    } catch (error) {
      console.error('❌ Error creating context menu:', error);
    }

    // Initialiser le service au premier lancement
    await initNotionService();
  });

  // Gérer les clics sur le menu contextuel
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'notion-clipper-send') {
      try {
        console.log('📋 Text selected:', info.selectionText);

        // Sauvegarder les données capturées
        await browser.storage.local.set({
          capturedData: {
            text: info.selectionText || '',
            url: tab?.url || '',
            title: tab?.title || '',
            timestamp: Date.now()
          }
        });

        console.log('✅ Captured data saved');

        // Ouvrir la popup
        try {
          await browser.action.openPopup();
        } catch (popupError) {
          console.log('ℹ️ Could not open popup automatically, user needs to click icon');
        }
      } catch (error) {
        console.error('❌ Error handling context menu click:', error);
      }
    }
  });

  // Gérer les messages de la popup
  browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    console.log('📨 Message received:', message.type);

    // Gérer le message de manière asynchrone
    handleMessage(message)
      .then(response => {
        console.log('✅ Response:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('❌ Error:', error);
        sendResponse({
          success: false,
          error: error.message || 'Unknown error'
        });
      });

    // Retourner true pour indiquer qu'on va répondre de manière asynchrone
    return true;
  });
});

/**
 * Gérer les messages de la popup
 */
async function handleMessage(message: any): Promise<any> {
  switch (message.type) {
    case 'GET_CONFIG':
      return await getConfig();

    case 'SAVE_CONFIG':
      return await saveConfig(message.config);

    case 'VALIDATE_TOKEN':
      return await validateToken(message.token);

    case 'GET_PAGES':
      return await getPages();

    case 'SEND_TO_NOTION':
      return await sendToNotion(message.data);

    case 'REFRESH_PAGES':
      return await refreshPages();

    case 'GET_FAVORITES':
      return await getFavorites();

    case 'TOGGLE_FAVORITE':
      return await toggleFavorite(message.pageId);

    default:
      console.warn('⚠️ Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Récupérer toutes les pages Notion
 */
async function getPages(): Promise<any> {
  try {
    console.log('📚 Fetching Notion pages...');

    // Initialiser le service si nécessaire
    if (!notionService) {
      await initNotionService();
    }

    if (!notionService) {
      return {
        success: false,
        error: 'Service Notion non initialisé - vérifiez votre token'
      };
    }

    // Récupérer les pages
    const pages = await notionService.getPages();
    console.log(`📚 Fetched ${pages.length} pages`);

    return {
      success: true,
      pages,
      count: pages.length
    };

  } catch (error: any) {
    console.error('❌ Error fetching pages:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la récupération des pages'
    };
  }
}

/**
 * Rafraîchir les pages (forcer le rechargement)
 */
/**
 * Rafraîchir les pages (bypass cache)
 */
async function refreshPages(): Promise<any> {
  try {
    console.log('🔄 Refreshing pages...');

    // Initialiser le service si nécessaire
    if (!notionService) {
      await initNotionService();
    }

    if (!notionService) {
      return {
        success: false,
        error: 'Service Notion non initialisé'
      };
    }

    // Forcer le refresh (bypass cache)
    // Le 'true' force le service à ignorer le cache
    const pages = await notionService.getPages(true);
    console.log(`🔄 Refreshed ${pages.length} pages`);

    return {
      success: true,
      pages,
      count: pages.length,
      message: `${pages.length} pages rafraîchies`
    };

  } catch (error: any) {
    console.error('❌ Error refreshing pages:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du rafraîchissement'
    };
  }
}

/**
 * Valider un token Notion
 */
async function validateToken(token: string): Promise<any> {
  try {
    console.log('🔐 Validating Notion token...');
    
    if (!token || token.trim().length === 0) {
      return {
        success: false,
        error: 'Token vide'
      };
    }
    
    // Créer des adapters temporaires pour tester
    const tempAdapter = new WebExtensionNotionAPIAdapter(token.trim());
    const tempStorage = new WebExtensionStorageAdapter();
    const tempService = new NotionService(tempAdapter, tempStorage);
    
    // Tester la connexion
    const isValid = await tempService.testConnection();
    
    if (isValid) {
      console.log('✅ Token valid');
      return {
        success: true,
        message: 'Token valide et connecté à Notion'
      };
    } else {
      console.log('❌ Token invalid');
      return {
        success: false,
        error: 'Token invalide - vérifiez vos permissions Notion'
      };
    }
    
  } catch (error: any) {
    console.error('❌ Error validating token:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la validation du token'
    };
  }
}

/**
 * Sauvegarder la config
 */
async function saveConfig(config: ClipperConfig): Promise<any> {
  try {
    console.log('💾 Saving config...');
    await storage.set('clipperConfig', config);

    // Réinitialiser le service si le token a changé
    if (config.notionToken) {
      notionService = null;
      await initNotionService();
    }

    return {
      success: true,
      message: 'Configuration sauvegardée'
    };
  } catch (error: any) {
    console.error('❌ Error saving config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupérer la config
 */
async function getConfig(): Promise<any> {
  try {
    const config = await storage.get<ClipperConfig>('clipperConfig');
    console.log('📦 Config loaded:', config ? 'Found' : 'Not found');

    return {
      success: true,
      config: config || { notionToken: '', onboardingCompleted: false }
    };
  } catch (error: any) {
    console.error('❌ Error loading config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupérer les favoris
 */
async function getFavorites(): Promise<any> {
  return {
    success: true,
    favorites
  };
}

/**
 * Toggle un favori
 */
async function toggleFavorite(pageId: string): Promise<any> {
  try {
    const index = favorites.indexOf(pageId);

    if (index > -1) {
      favorites.splice(index, 1);
      await saveFavorites();
      return {
        success: true,
        isFavorite: false
      };
    } else {
      favorites.push(pageId);
      await saveFavorites();
      return {
        success: true,
        isFavorite: true
      };
    }
  } catch (error: any) {
    console.error('❌ Error toggling favorite:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envoyer du contenu vers Notion
 */
/**
 * Envoyer du contenu vers Notion
 */
async function sendToNotion(data: {
  pageIds: string | string[];
  content: {
    text?: string;
    html?: string;
    imageUrl?: string;
  };
  properties?: Record<string, any>;
}): Promise<any> {
  try {
    console.log('📤 Sending to Notion...', {
      pageIds: data.pageIds,
      contentLength: data.content.text?.length || 0
    });

    // Initialiser le service si nécessaire
    if (!notionService) {
      await initNotionService();
    }

    if (!notionService) {
      return {
        success: false,
        error: 'Service Notion non initialisé'
      };
    }

    // Normaliser pageIds en array
    const pageIds = Array.isArray(data.pageIds) ? data.pageIds : [data.pageIds];
    const results = [];

    // Envoyer à chaque page
    for (const pageId of pageIds) {
      try {
        console.log(`📤 Sending to page ${pageId}...`);

        // ✅ CORRECTION: Utiliser sendToNotion avec la bonne structure
        const result = await notionService.sendToNotion({
          pageId: pageId,
          content: data.content.text || data.content.html || '',
          options: {
            properties: data.properties || {},
            metadata: {
              source: 'notion-clipper-extension'
            }
          }
        });

        if (result.success) {
          results.push({
            pageId,
            success: true,
            result
          });

          // Mettre à jour l'historique d'usage
          try {
            const history = await browser.storage.local.get('usageHistory');
            const usageHistory = (history.usageHistory as Record<string, number>) || {};
            usageHistory[pageId] = (usageHistory[pageId] || 0) + 1;
            await browser.storage.local.set({ usageHistory });
            console.log(`✅ Usage updated for ${pageId}`);
          } catch (usageError) {
            console.warn('⚠️ Could not update usage:', usageError);
          }
        } else {
          results.push({
            pageId,
            success: false,
            error: result.error || 'Unknown error'
          });
        }

      } catch (error: any) {
        console.error(`❌ Error sending to page ${pageId}:`, error);
        results.push({
          pageId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      results,
      successCount,
      totalCount: pageIds.length,
      message: `Contenu envoyé à ${successCount}/${pageIds.length} page(s)`
    };

  } catch (error: any) {
    console.error('❌ Error in sendToNotion:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi'
    };
  }
}