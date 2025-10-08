// apps/notion-clipper-extension/entrypoints/content.ts
import { defineContentScript } from 'wxt/sandbox';
import browser from 'webextension-polyfill';

interface Message {
  type: string;
  data?: any;
  [key: string]: any;
}

interface SelectionData {
  text: string;
  url: string;
  title: string;
}

interface PageInfo {
  url: string;
  title: string;
  favicon: string;
  selectedText: string;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  
  main() {
    console.log('[CONTENT SCRIPT] Notion Clipper content script loaded');

    let lastSelection = '';

    /**
     * Capture selected text on mouseup
     */
    document.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText !== lastSelection && selectedText.length > 0) {
        lastSelection = selectedText;
        console.log('[CONTENT SCRIPT] Text selected:', selectedText.substring(0, 50) + '...');

        // Send to background script
        browser.runtime.sendMessage({
          type: 'SELECTION_CAPTURED',
          data: {
            text: selectedText,
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
          }
        }).catch((error: Error) => {
          console.error('[CONTENT SCRIPT] Error sending selection:', error);
        });
      }
    });

    /**
     * Get page favicon
     */
    function getFavicon(): string {
      const iconLink = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (iconLink) {
        return iconLink.href;
      }

      // Fallback to default favicon.ico
      const { origin } = window.location;
      return `${origin}/favicon.ico`;
    }

    /**
     * Show notification (visual feedback)
     */
    function showNotification(message: string): void {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a1a1a;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
      `;

      // Add animation keyframes
      if (!document.getElementById('notion-clipper-styles')) {
        const style = document.createElement('style');
        style.id = 'notion-clipper-styles';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(notification);

      // Remove after 3 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease-out';
        
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }

    /**
     * Listen for messages from popup/background
     * Unified listener for all message types
     */
    browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
      // Type guard
      if (!message || typeof message !== 'object') {
        return true; // Keep channel open even if we don't handle it
      }

      const msg = message as Message;

      // Messages that need responses
      if (msg.type === 'GET_SELECTION') {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';

        sendResponse({
          success: true,
          selection: {
            text: selectedText,
            url: window.location.href,
            title: document.title
          } as SelectionData
        });
        return true;
      }

      if (msg.type === 'GET_PAGE_INFO') {
        sendResponse({
          success: true,
          pageInfo: {
            url: window.location.href,
            title: document.title,
            favicon: getFavicon(),
            selectedText: window.getSelection()?.toString().trim() || ''
          } as PageInfo
        });
        return true;
      }

      // Messages that don't need responses (notifications)
      if (msg.type === 'CLIP_SUCCESS') {
        showNotification('✅ Saved to Notion!');
        return true;
      }

      if (msg.type === 'CLIP_ERROR') {
        showNotification('❌ Failed to save');
        return true;
      }

      // Unknown message type
      return true;
    });

    console.log('[CONTENT SCRIPT] Event listeners registered');
  }
});