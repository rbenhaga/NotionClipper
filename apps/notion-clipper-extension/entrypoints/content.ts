// apps/notion-clipper-extension/entrypoints/content.ts - VERSION FINALE
import browser from 'webextension-polyfill';
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('📋 Notion Clipper content script loaded');

    // ============================================
    // TYPES
    // ============================================

    interface ClipboardContent {
      text: string;
      html?: string;
      imageUrl?: string | null;
    }

    // Interface pour les messages (utilisée implicitement)
    // interface MessageRequest {
    //   type: string;
    //   [key: string]: any;
    // }

    interface PermissionResponse {
      hasPermission?: boolean;
      autoDetect?: boolean;
    }

    // ============================================
    // MESSAGE LISTENER avec types corrects
    // ============================================
    browser.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any): true => {
      console.log('📨 Content script received message:', request.type);

      if (request.type === 'GET_CLIPBOARD') {
        getClipboardContent().then(content => {
          sendResponse(content);
        });
        return true;
      }

      if (request.type === 'GET_SELECTION') {
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '';
        const selectedHtml = getSelectionHTML(selection);

        sendResponse({
          text: selectedText,
          html: selectedHtml,
          imageUrl: null
        });
        return true;
      }

      if (request.type === 'CAPTURE_PAGE') {
        const pageContent = {
          text: document.body.innerText,
          html: document.documentElement.outerHTML,
          title: document.title,
          url: window.location.href,
          imageUrl: getFirstImage()
        };
        sendResponse(pageContent);
        return true;
      }

      // Toujours retourner true
      sendResponse({});
      return true;
    });

    // ============================================
    // FONCTIONS UTILITAIRES
    // ============================================

    async function getClipboardContent(): Promise<ClipboardContent> {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          return {
            text: text || '',
            html: undefined,
            imageUrl: null
          };
        }

        const tempElement = document.createElement('textarea');
        tempElement.style.position = 'fixed';
        tempElement.style.left = '-9999px';
        tempElement.style.top = '-9999px';
        document.body.appendChild(tempElement);
        tempElement.focus();

        const result = document.execCommand('paste');
        const text = tempElement.value;

        document.body.removeChild(tempElement);

        if (result && text) {
          return {
            text: text,
            html: undefined,
            imageUrl: null
          };
        }

        return {
          text: '',
          html: undefined,
          imageUrl: null
        };
      } catch (error) {
        console.error('❌ Error reading clipboard:', error);
        return {
          text: '',
          html: undefined,
          imageUrl: null
        };
      }
    }

    function getSelectionHTML(selection: Selection | null): string | undefined {
      if (!selection || selection.rangeCount === 0) return undefined;

      const container = document.createElement('div');
      for (let i = 0; i < selection.rangeCount; i++) {
        container.appendChild(selection.getRangeAt(i).cloneContents());
      }
      return container.innerHTML;
    }

    function getFirstImage(): string | null {
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (img.width > 100 && img.height > 100) {
          return img.src;
        }
      }
      return null;
    }

    // ============================================
    // DÉTECTION AUTOMATIQUE
    // ============================================

    let lastClipboardText = '';

    async function checkClipboard() {
      try {
        const content = await getClipboardContent();
        if (content.text && content.text !== lastClipboardText) {
          lastClipboardText = content.text;

          browser.runtime.sendMessage({
            type: 'CLIPBOARD_CHANGED',
            content: content
          });
        }
      } catch (error) {
        console.log('Clipboard check failed:', error);
      }
    }

    // ============================================
    // CONTEXT MENU
    // ============================================

    document.addEventListener('contextmenu', (_event) => {
      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';

      if (selectedText) {
        browser.runtime.sendMessage({
          type: 'SAVE_SELECTION',
          content: {
            text: selectedText,
            html: getSelectionHTML(selection),
            url: window.location.href,
            title: document.title
          }
        });
      }
    });

    // ============================================
    // RACCOURCIS CLAVIER
    // ============================================

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();

        const selection = window.getSelection();
        const selectedText = selection?.toString() || '';

        if (selectedText) {
          browser.runtime.sendMessage({
            type: 'QUICK_CAPTURE',
            content: {
              text: selectedText,
              html: getSelectionHTML(selection),
              url: window.location.href,
              title: document.title
            }
          });
        } else {
          browser.runtime.sendMessage({
            type: 'QUICK_CAPTURE',
            content: {
              text: document.body.innerText.slice(0, 5000),
              html: document.documentElement.outerHTML.slice(0, 10000),
              url: window.location.href,
              title: document.title
            }
          });
        }
      }
    });

    // ============================================
    // INITIALISATION
    // ============================================

    async function init() {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'CHECK_CLIPBOARD_PERMISSION'
        }) as PermissionResponse;

        if (response && response.hasPermission && response.autoDetect) {
          console.log('✅ Auto clipboard detection enabled');
          setInterval(checkClipboard, 2000);
        }
      } catch (error) {
        console.log('Extension not ready or permissions not granted');
      }
    }

    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
});