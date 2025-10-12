// apps/notion-clipper-extension/wxt.config.ts - VERSION CORRIGÉE
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  manifest: {
    name: 'Notion Clipper Pro',
    description: 'Capture content to Notion quickly and easily',
    version: '1.0.0',
    permissions: [
      'storage',
      'clipboardWrite',
      'contextMenus',
      'activeTab',
      'tabs',
      'scripting',
      'notifications'   // ✅ Pour les notifications de fallback
    ],
    optional_permissions: [
      'clipboardRead'   // ✅ Demandé dynamiquement pour éviter les refus
    ],
    host_permissions: [
      '<all_urls>'      // Nécessaire pour lire le contenu des pages
    ],
    action: {
      default_title: 'Notion Clipper Pro',
      default_popup: 'popup.html',
      default_icon: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    },
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    // ✅ Pour Chrome/Edge
    minimum_chrome_version: "88",
    // ✅ Content Security Policy pour permettre les styles inline de Tailwind et les fonts externes
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    }
  },
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@notion-clipper/core-shared': new URL('../../packages/core-shared/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/core-web': new URL('../../packages/core-web/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/adapters-webextension': new URL('../../packages/adapters/webextension/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/notion-parser': new URL('../../packages/notion-parser/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/ui': new URL('../../packages/ui/src/index.ts', import.meta.url).pathname,
      }
    },
    build: {
      rollupOptions: {
        external: ['wxt/storage']
      }
    }
  })
});