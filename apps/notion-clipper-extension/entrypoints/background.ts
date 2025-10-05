/// <reference types="chrome"/>
import { defineBackground } from 'wxt/sandbox';
import { NotionService } from '@notion-clipper/core/services';
import { WebExtensionNotionAPIAdapter, WebExtensionStorageAdapter } from '@notion-clipper/adapters-webextension';

let notionService: NotionService | null = null;
const storage = new WebExtensionStorageAdapter();

export default defineBackground(() => {
  console.log('🚀 Notion Clipper Pro started');

  chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.create({
      id: 'notion-clipper-send',
      title: 'Envoyer vers Notion',
      contexts: ['selection']
    });
  });

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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true;
  });
});

async function handleMessage(message: any) {
  switch (message.type) {
    case 'GET_CONFIG':
      return await getConfig();
    case 'SAVE_CONFIG':
      return await saveConfig(message.config);
    case 'GET_PAGES':
      return await getPages();
    case 'SEND_TO_NOTION':
      return await sendToNotion(message.data);
    default:
      return { success: false, error: 'Unknown message' };
  }
}

async function getConfig() {
  const config = await storage.get('clipperConfig');
  return { success: true, config: config || {} };
}

async function saveConfig(config: any) {
  await storage.set('clipperConfig', config);
  notionService = null;
  return { success: true };
}

async function getPages() {
  try {
    await initNotionService();
    if (!notionService) {
      return { success: false, error: 'Notion not initialized' };
    }

    const pages = await notionService.getPages();
    return { success: true, pages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendToNotion(data: { content: string; pageId: string }) {
  try {
    await initNotionService();
    if (!notionService) {
      return { success: false, error: 'Notion not initialized' };
    }

    const result = await notionService.sendToNotion({
      pageId: data.pageId,
      content: data.content
    });

    if (result.success) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/48.png',
        title: 'Notion Clipper Pro',
        message: '✅ Contenu envoyé avec succès !'
      });
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function initNotionService() {
  if (notionService) return;

  const config = await storage.get('clipperConfig');
  if (!config?.notionToken) throw new Error('No token');

  const adapter = new WebExtensionNotionAPIAdapter();
  adapter.setToken(config.notionToken);
  notionService = new NotionService(adapter, storage);
}