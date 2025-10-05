/// <reference types="chrome"/>
import { defineBackground } from 'wxt/sandbox';
import { NotionService } from '@notion-clipper/core/services';
import { WebExtensionNotionAPIAdapter, WebExtensionStorageAdapter } from '@notion-clipper/adapters-webextension';

let notionService: NotionService | null = null;
const storage = new WebExtensionStorageAdapter();

export default defineBackground(() => {
  console.log('🚀 Notion Clipper Pro - Background script started');

  // Menu contextuel au clic droit
  chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
      id: 'notion-clipper-send',
      title: 'Envoyer vers Notion',
      contexts: ['selection']
    });
  });

  // Gestion du menu contextuel
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'notion-clipper-send') {
      await chrome.storage.local.set({
        capturedData: {
          text: info.selectionText || '',
          url: tab?.url || '',
          title: tab?.title || '',
          selection: info.selectionText,
          timestamp: Date.now()
        }
      });
      await chrome.action.openPopup();
    }
  });

  // Messages depuis la popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Background received message:', message.type);
    
    handleMessage(message)
      .then(response => {
        console.log('✅ Sending response:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('❌ Message handler error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  });
});

/**
 * Route les messages vers les handlers appropriés
 */
async function handleMessage(message: any) {
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
    
    default:
      console.warn('⚠️ Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Récupère la configuration
 */
async function getConfig() {
  try {
    const config = await storage.get('clipperConfig');
    return { success: true, config: config || {} };
  } catch (error: any) {
    console.error('❌ Error getting config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sauvegarde la configuration
 */
async function saveConfig(config: any) {
  try {
    await storage.set('clipperConfig', config);
    
    // Invalider le service pour forcer la réinitialisation avec le nouveau token
    notionService = null;
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error saving config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ VALIDATION DE TOKEN - Utilise l'architecture core
 * Au lieu de dupliquer la logique avec fetch(), on utilise l'adapter existant
 */
async function validateToken(token: string) {
  try {
    console.log('🔐 Validating token via NotionService...');
    
    if (!token || token.trim().length === 0) {
      return { success: false, error: 'Token vide' };
    }
    
    // Créer un adapter temporaire avec le token à tester
    const tempAdapter = new WebExtensionNotionAPIAdapter(token.trim());
    
    // Utiliser la méthode testConnection() de l'adapter
    // Cette méthode fait déjà l'appel à l'API Notion correctement
    const isValid = await tempAdapter.testConnection();
    
    if (isValid) {
      console.log('✅ Token valid');
      return { success: true };
    } else {
      console.log('❌ Token invalid');
      return { success: false, error: 'Token invalide ou expiré' };
    }
  } catch (error: any) {
    console.error('❌ Token validation error:', error);
    return { success: false, error: error.message || 'Erreur de validation' };
  }
}

/**
 * Récupère la liste des pages Notion
 */
async function getPages() {
  try {
    console.log('📄 Fetching Notion pages...');
    
    await initNotionService();
    
    if (!notionService) {
      return { success: false, error: 'Service Notion non initialisé' };
    }

    const pages = await notionService.getPages();
    console.log(`✅ Found ${pages.length} pages`);
    
    return { success: true, pages };
  } catch (error: any) {
    console.error('❌ Error fetching pages:', error);
    
    if (error.message === 'No token') {
      return { success: false, error: 'No token' };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Envoie du contenu vers Notion
 */
async function sendToNotion(data: { 
  content: string; 
  pageId: string;
  properties?: any;
}) {
  try {
    console.log('📤 Sending to Notion:', { pageId: data.pageId, contentLength: data.content.length });
    
    await initNotionService();
    
    if (!notionService) {
      return { success: false, error: 'Service Notion non initialisé' };
    }

    // ✅ Correction : properties doit être dans options
    const result = await notionService.sendToNotion({
      pageId: data.pageId,
      content: data.content,
      options: {
        properties: data.properties
      }
    });

    if (result.success) {
      console.log('✅ Content sent successfully');
      
      // Notification Chrome
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/48.png',
        title: 'Notion Clipper Pro',
        message: '✅ Contenu envoyé avec succès !'
      });
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error sending to Notion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialise le NotionService avec le token stocké
 */
async function initNotionService() {
  // Si déjà initialisé, ne rien faire
  if (notionService) {
    console.log('✅ NotionService already initialized');
    return;
  }

  console.log('🔄 Initializing NotionService...');

  const config = await storage.get('clipperConfig');
  
  if (!config?.notionToken) {
    console.warn('⚠️ No token found in config');
    throw new Error('No token');
  }

  // Créer l'adapter avec le token
  const adapter = new WebExtensionNotionAPIAdapter(config.notionToken);
  
  // Créer le service
  notionService = new NotionService(adapter, storage);
  
  console.log('✅ NotionService initialized');
}