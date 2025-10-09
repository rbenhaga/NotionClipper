// apps/notion-clipper-extension/wxt.config.ts
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
      'clipboardRead',
      'contextMenus',
      'activeTab'
    ],
    host_permissions: [
      '<all_urls>'
    ],
    action: {
      default_title: 'Notion Clipper Pro',
      default_popup: 'popup.html'
    }
  },
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@notion-clipper/core-shared': new URL('../../packages/core-shared/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/core-web': new URL('../../packages/core-web/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/adapters-webextension': new URL('../../packages/adapters/webextension/src/index.ts', import.meta.url).pathname,
        '@notion-clipper/ui': new URL('../../packages/ui/src/index.ts', import.meta.url).pathname,
      }
    },
    build: {
      rollupOptions: {
        external: ['wxt/storage'] // ✅ NE PAS bundler wxt/storage
      }
    }
  })
});