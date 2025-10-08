// apps/notion-clipper-extension/entrypoints/background.ts
import { defineBackground } from 'wxt/sandbox';
import browser from 'webextension-polyfill';

// ============================================
// IMPORTS DES PACKAGES PARTAGÉS
// ============================================
import { WebNotionService, WebClipboardService } from '@notion-clipper/core-web';
import { ConfigService } from '@notion-clipper/core-shared';
import { 
  WebExtensionNotionAPIAdapter,
  WebExtensionStorageAdapter,
  WebExtensionConfigAdapter,
  WebExtensionClipboardAdapter
} from '@notion-clipper/adapters-webextension';

// ============================================
// TYPES
// ============================================

interface ClipperConfig {
  notionToken: string;
  onboardingCompleted?: boolean;
}

interface SelectionData {
  text: string;
  url: string;
  title: string;
  timestamp: number;
}

// ============================================
// SERVICES GLOBAUX
// ============================================
let notionService: WebNotionService | null = null;
let configService: ConfigService | null = null;
let clipboardService: WebClipboardService | null = null;
let favorites: string[] = [];
let lastSelection: SelectionData | null = null;

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
// CONTEXT MENU
// ============================================
async function setupContextMenu() {
  try {
    // Remove existing menu items
    await browser.contextMenus.removeAll();

    // Create context menu for text selection
    await browser.contextMenus.create({
      id: 'clip-to-notion',
      title: 'Clip to Notion',
      contexts: ['selection']
    });

    console.log('✅ Context menu created');
  } catch (error) {
    console.error('❌ Error creating context menu:', error);
  }
}

// ============================================
// MESSAGE HANDLERS
// ============================================

async function handleSelectionCaptured(data: SelectionData): Promise<any> {
  try {
    lastSelection = data;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetLastSelection(): Promise<any> {
  try {
    return {
      success: true,
      selection: lastSelection
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

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
    
    const isFavorite = favorites.includes(pageId);
    
    if (isFavorite) {
      await configService?.removeFavorite(pageId);
      favorites = favorites.filter(id => id !== pageId);
    } else {
      await configService?.addFavorite(pageId);
      favorites.push(pageId);
    }

    return {
      success: true,
      isFavorite: !isFavorite
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetFavorites(): Promise<any> {
  try {
    if (!configService) await initServices();
    
    favorites = await configService?.getFavorites() || [];

    return {
      success: true,
      favorites
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleGetClipboard(): Promise<any> {
  try {
    if (!clipboardService) await initServices();
    
    const content = await clipboardService?.getContent();

    return {
      success: true,
      clipboard: content
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function handleMessage(message: any): Promise<any> {
  try {
    switch (message.type) {
      case 'SELECTION_CAPTURED':
        return await handleSelectionCaptured(message.data);

      case 'GET_LAST_SELECTION':
        return await handleGetLastSelection();

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
// BACKGROUND SCRIPT MAIN
// ============================================
export default defineBackground(() => {
  console.log('[BACKGROUND] Notion Clipper Pro background script loaded');

  // Initialize services
  initServices();

  // Setup context menu - wrapped in try-catch for dev mode
  try {
    setupContextMenu();
    
    // Handle context menu clicks - MOVED INSIDE defineBackground
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'clip-to-notion' && info.selectionText) {
        console.log('[CONTEXT MENU] Clip to Notion clicked');
        
        // Store selection
        lastSelection = {
          text: info.selectionText,
          url: info.pageUrl || '',
          title: tab?.title || '',
          timestamp: Date.now()
        };

        // Open popup
        browser.action.openPopup();
      }
    });
  } catch (error) {
    console.warn('[BACKGROUND] Context menu not available in dev mode:', error);
  }

  // Listen for messages
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // Keep channel open for async response
  });

  // Recreate context menu on install
  browser.runtime.onInstalled.addListener(() => {
    console.log('[BACKGROUND] Extension installed/updated');
    try {
      setupContextMenu();
    } catch (error) {
      console.warn('[BACKGROUND] Context menu setup failed:', error);
    }
  });

  console.log('[BACKGROUND] Ready');
});