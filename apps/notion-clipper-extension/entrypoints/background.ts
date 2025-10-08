// apps/notion-clipper-extension/entrypoints/background.ts
import { defineBackground } from 'wxt/sandbox';
import browser from 'webextension-polyfill';

// ============================================
// IMPORTS DES PACKAGES PARTAGÉS
// ============================================
import { WebNotionService, WebClipboardService } from '@notion-clipper/core-web';
import { ConfigService, CacheService } from '@notion-clipper/core-shared';
import { 
  WebExtensionNotionAPIAdapter,
  WebExtensionStorageAdapter,
  WebExtensionConfigAdapter,
  WebExtensionClipboardAdapter
} from '@notion-clipper/adapters-webextension';

// ============================================
// TYPES
// ============================================
interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  parent?: any;
  url?: string;
}

interface ClipperConfig {
  notionToken: string;
  onboardingCompleted?: boolean;
}

// ============================================
// SERVICES GLOBAUX
// ============================================
let notionService: WebNotionService | null = null;
let configService: ConfigService | null = null;
let clipboardService: WebClipboardService | null = null;
let favorites: string[] = [];

// ============================================
// STORAGE HELPER
// ============================================
const storage = {
  async get<T>(key: string): Promise<T | null> {
    const result = await browser.storage.local.get(key);
    return result[key] !== undefined ? (result[key] as T) : null;
  },
  async set(key: string, value: any): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }
};

// ============================================
// INITIALISATION DES SERVICES
// ============================================
async function initServices(): Promise<void> {
  try {
    console.log('🔧 Initializing services...');

    // Storage adapter
    const storageAdapter = new WebExtensionStorageAdapter();

    // Config service
    const configAdapter = new WebExtensionConfigAdapter(storageAdapter);
    configService = new ConfigService(configAdapter);

    // Clipboard service
    const clipboardAdapter = new WebExtensionClipboardAdapter();
    clipboardService = new WebClipboardService(clipboardAdapter);

    // Load config
    const token = await configService.getNotionToken();
    
    if (token) {
      // Notion service
      const notionAdapter = new WebExtensionNotionAPIAdapter(token);
      notionService = new WebNotionService(notionAdapter);
      
      console.log('✅ Services initialized with token');
    } else {
      console.log('⚠️ No token found, services partially initialized');
    }

    // Load favorites
    favorites = await configService.getFavorites();

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
}

// ============================================
// MESSAGE HANDLERS
// ============================================
async function handleMessage(message: any): Promise<any> {
  try {
    switch (message.type) {
      case 'VALIDATE_TOKEN':
        return await handleValidateToken(message.token);

      case 'GET_PAGES':
        return await handleGetPages();

      case 'GET_DATABASES':
        return await handleGetDatabases();

      case 'SEARCH_PAGES':
        return await handleSearchPages(message.query);

      case 'SEND_TO_NOTION':
        return await handleSendToNotion(message);

      case 'SAVE_CONFIG':
        return await handleSaveConfig(message.config);

      case 'GET_CONFIG':
        return await handleGetConfig();

      case 'TOGGLE_FAVORITE':
        return await handleToggleFavorite(message.pageId);

      case 'GET_FAVORITES':
        return await handleGetFavorites();

      case 'GET_CLIPBOARD':
        return await handleGetClipboard();

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error: any) {
    console.error('[BACKGROUND] Message handler error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// HANDLER IMPLEMENTATIONS
// ============================================

async function handleValidateToken(token: string): Promise<any> {
  try {
    const tempAdapter = new WebExtensionNotionAPIAdapter(token);
    const tempService = new WebNotionService(tempAdapter);
    const result = await tempService.testConnection();
    
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetPages(): Promise<any> {
  try {
    if (!notionService) await initServices();
    if (!notionService) {
      return { success: false, error: 'Service not initialized' };
    }

    const pages = await notionService.getPages();
    return { success: true, pages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetDatabases(): Promise<any> {
  try {
    if (!notionService) await initServices();
    if (!notionService) {
      return { success: false, error: 'Service not initialized' };
    }

    const databases = await notionService.getDatabases();
    return { success: true, databases };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleSearchPages(query: string): Promise<any> {
  try {
    if (!notionService) await initServices();
    if (!notionService) {
      return { success: false, error: 'Service not initialized' };
    }

    const pages = await notionService.searchPages(query);
    return { success: true, pages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleSendToNotion(message: any): Promise<any> {
  try {
    if (!notionService) await initServices();
    if (!notionService) {
      return { success: false, error: 'Service not initialized' };
    }

    const result = await notionService.sendToPage(
      message.pageId,
      message.content,
      message.options
    );

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleSaveConfig(config: ClipperConfig): Promise<any> {
  try {
    if (!configService) await initServices();
    
    await configService?.setNotionToken(config.notionToken);
    if (config.onboardingCompleted !== undefined) {
      await configService?.set('onboardingCompleted', config.onboardingCompleted);
    }

    // Reinitialize services with new token
    notionService = null;
    await initServices();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetConfig(): Promise<any> {
  try {
    if (!configService) await initServices();
    
    const token = await configService?.getNotionToken();
    const onboardingCompleted = await configService?.get('onboardingCompleted');

    return {
      success: true,
      config: {
        notionToken: token || '',
        onboardingCompleted: !!onboardingCompleted
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleToggleFavorite(pageId: string): Promise<any> {
  try {
    if (!configService) await initServices();

    const currentFavorites = await configService?.getFavorites() || [];
    
    if (currentFavorites.includes(pageId)) {
      await configService?.removeFavorite(pageId);
      favorites = favorites.filter(id => id !== pageId);
    } else {
      await configService?.addFavorite(pageId);
      favorites.push(pageId);
    }

    return { success: true, favorites };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetFavorites(): Promise<any> {
  try {
    if (!configService) await initServices();
    
    favorites = await configService?.getFavorites() || [];
    return { success: true, favorites };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetClipboard(): Promise<any> {
  try {
    if (!clipboardService) await initServices();
    if (!clipboardService) {
      return { success: false, error: 'Clipboard service not available' };
    }

    const content = await clipboardService.getContent();
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// BACKGROUND SCRIPT MAIN
// ============================================
export default defineBackground(() => {
  console.log('🚀 Background script started');

  // Initialize services on startup
  initServices();

  // Install handler - create context menu
  browser.runtime.onInstalled.addListener(async () => {
    try {
      await browser.contextMenus.removeAll();
      await browser.contextMenus.create({
        id: 'notion-clipper-send',
        title: 'Envoyer vers Notion',
        contexts: ['selection']
      });
      console.log('✅ Context menu created');
    } catch (error) {
      console.error('❌ Error creating context menu:', error);
    }
  });

  // Context menu click handler
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'notion-clipper-send' && info.selectionText) {
      try {
        // Open popup with selected text
        await browser.action.openPopup();
        
        // Send selected text to popup
        // Note: This would need proper communication setup
        console.log('Selected text:', info.selectionText);
      } catch (error) {
        console.error('❌ Error handling context menu click:', error);
      }
    }
  });

  // Message listener
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; // Keep channel open for async response
  });

  console.log('✅ Background script initialized');
});