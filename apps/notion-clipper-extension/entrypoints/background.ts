import { defineBackground } from 'wxt/sandbox';
import browser from 'webextension-polyfill';

// ========================================
// ✅ SOLUTION TEMPORAIRE SANS NODE.JS
// Implémentation inline sans crypto-js, natural, etc.
// ========================================

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

/**
 * Service Notion simplifié - Utilise uniquement fetch() natif
 */
class SimpleNotionService {
  constructor(private token: string) {}

  async getPages(): Promise<NotionPage[]> {
    try {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: { property: 'object', value: 'page' },
          page_size: 100
        })
      });

      if (!response.ok) {
        throw new Error(`Notion API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results.map((page: any) => ({
        id: page.id,
        title: this.extractTitle(page),
        icon: page.icon?.emoji || page.icon?.external?.url,
        parent: page.parent,
        url: page.url
      }));
    } catch (error) {
      console.error('❌ Error fetching pages:', error);
      throw error;
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendToPage(pageId: string, content: string): Promise<boolean> {
    try {
      const cleanPageId = pageId.replace(/-/g, '');
      
      const response = await fetch(`https://api.notion.com/v1/blocks/${cleanPageId}/children`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          children: [{
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content } }]
            }
          }]
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Error sending content:', error);
      return false;
    }
  }

  private extractTitle(page: any): string {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return 'Sans titre';
  }
}

const storage = {
  async get<T>(key: string): Promise<T | null> {
    const result = await browser.storage.local.get(key);
    return result[key] !== undefined ? (result[key] as T) : null;
  },
  async set(key: string, value: any): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }
};

let notionService: SimpleNotionService | null = null;
let favorites: string[] = [];

async function initNotionService(): Promise<void> {
  if (notionService) return;
  
  const config = await storage.get<ClipperConfig>('clipperConfig');
  if (!config?.notionToken) {
    console.log('⚠️ No token');
    return;
  }

  notionService = new SimpleNotionService(config.notionToken);
  console.log('✅ Service ready');
}

async function handleMessage(message: any): Promise<any> {
  switch (message.type) {
    case 'VALIDATE_TOKEN':
      const tempService = new SimpleNotionService(message.token);
      const isValid = await tempService.validateToken();
      return { success: isValid, error: isValid ? undefined : 'Token invalide' };

    case 'GET_PAGES':
      if (!notionService) await initNotionService();
      if (!notionService) return { success: false, error: 'Pas de service' };
      const pages = await notionService.getPages();
      return { success: true, pages };

    case 'SAVE_CONFIG':
      await storage.set('clipperConfig', message.config);
      notionService = null;
      await initNotionService();
      return { success: true };

    default:
      return { success: false, error: 'Unknown type' };
  }
}

export default defineBackground(() => {
  console.log('🚀 Background started');

  browser.runtime.onInstalled.addListener(async () => {
    await browser.contextMenus.removeAll();
    await browser.contextMenus.create({
      id: 'notion-clipper-send',
      title: 'Envoyer vers Notion',
      contexts: ['selection']
    });
    console.log('✅ Menu created');
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch(err => 
      sendResponse({ success: false, error: err.message })
    );
    return true; // Async response
  });
});