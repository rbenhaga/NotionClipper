/// <reference types="chrome"/>
import { defineBackground } from 'wxt/sandbox';
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
    const result = await chrome.storage.local.get(['favorites']);
    favorites = result.favorites || [];
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
    await chrome.storage.local.set({ favorites });
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
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      // Supprimer les anciens menus si ils existent
      await chrome.contextMenus.removeAll();
      
      // Créer le menu
      await chrome.contextMenus.create({
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
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'notion-clipper-send') {
      try {
        console.log('📋 Text selected:', info.selectionText);

        // Sauvegarder les données capturées
        await chrome.storage.local.set({
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
          await chrome.action.openPopup();
        } catch (popupError) {
          console.log('ℹ️ Could not open popup automatically, user needs to click icon');
        }
      } catch (error) {
        console.error('❌ Error handling context menu click:', error);
      }
    }
  });

  // Gérer les messages de la popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
 * Récupérer la configuration
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
    return { success: false, error: error.message };
  }
}

/**
 * Sauvegarder la configuration
 */
async function saveConfig(config: ClipperConfig): Promise<any> {
  try {
    console.log('💾 Saving config...');

    // Sauvegarder la config
    await storage.set('clipperConfig', config);

    // Sauvegarder aussi le flag onboarding
    if (config.onboardingCompleted) {
      await chrome.storage.local.set({ onboardingCompleted: true });
    }

    // Réinitialiser le service pour utiliser le nouveau token
    notionService = null;
    await initNotionService();

    console.log('✅ Config saved');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error saving config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Valider un token Notion
 */
async function validateToken(token: string): Promise<any> {
  try {
    console.log('🔍 Validating token...');

    if (!token || !token.startsWith('ntn')) {
      return { success: false, error: 'Token invalide (doit commencer par "ntn")' };
    }

    // Tester avec une requête simple à l'API Notion
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Token valid');
        return { success: true };
      } else {
        const error = await response.json();
        console.error('❌ Token invalid:', error);
        return {
          success: false,
          error: error.message || 'Token invalide'
        };
      }
    } catch (fetchError: any) {
      console.error('❌ Network error:', fetchError);
      return {
        success: false,
        error: 'Erreur de connexion à Notion'
      };
    }
  } catch (error: any) {
    console.error('❌ Error validating token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer les pages Notion
 */
async function getPages(): Promise<any> {
  try {
    console.log('📚 Loading pages...');

    // Initialiser le service si nécessaire
    await initNotionService();

    if (!notionService) {
      console.error('❌ Notion service not initialized');
      return {
        success: false,
        error: 'Service non initialisé. Configurez d\'abord votre token Notion.'
      };
    }

    // Récupérer les pages via le service
    const pages = await notionService.getPages();

    console.log('✅ Pages loaded:', pages.length);
    return { success: true, pages };
  } catch (error: any) {
    console.error('❌ Error loading pages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rafraîchir les pages (forcer le rechargement)
 */
async function refreshPages(): Promise<any> {
  try {
    console.log('🔄 Refreshing pages...');

    // Réinitialiser le service
    notionService = null;
    await initNotionService();

    // Recharger les pages
    return await getPages();
  } catch (error: any) {
    console.error('❌ Error refreshing pages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer les favoris
 */
async function getFavorites(): Promise<any> {
  try {
    console.log('⭐ Getting favorites...');
    return { success: true, favorites };
  } catch (error: any) {
    console.error('❌ Error getting favorites:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggler un favori
 */
async function toggleFavorite(pageId: string): Promise<any> {
  try {
    console.log('⭐ Toggling favorite:', pageId);

    const index = favorites.indexOf(pageId);
    const isFavorite = index === -1;

    if (isFavorite) {
      favorites.push(pageId);
    } else {
      favorites.splice(index, 1);
    }

    await saveFavorites();

    console.log('✅ Favorite toggled');
    return { success: true, isFavorite };
  } catch (error: any) {
    console.error('❌ Error toggling favorite:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer du contenu vers Notion
 */
async function sendToNotion(data: { pageId: string; content: string }): Promise<any> {
  try {
    console.log('📤 Sending to Notion...', {
      pageId: data.pageId.substring(0, 8) + '...',
      contentLength: data.content.length
    });

    // Initialiser le service si nécessaire
    await initNotionService();

    if (!notionService) {
      console.error('❌ Notion service not initialized');
      return {
        success: false,
        error: 'Service non initialisé'
      };
    }

    // Envoyer via le service
    const result = await notionService.sendToNotion({
      pageId: data.pageId,
      content: data.content
    });

    if (result.success) {
      console.log('✅ Content sent successfully');

      // Afficher une notification
      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon/48.png',
          title: 'Notion Clipper Pro',
          message: '✅ Contenu envoyé avec succès !',
          priority: 2
        });
      } catch (notifError) {
        console.log('ℹ️ Could not show notification:', notifError);
      }

      return { success: true };
    } else {
      console.error('❌ Failed to send:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('❌ Error sending to Notion:', error);
    return { success: false, error: error.message };
  }
}