import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  
  manifest: {
    permissions: [
      'storage',
      'contextMenus',
      'activeTab',
      'clipboardRead',
      'clipboardWrite'
    ],
    host_permissions: [
      'https://*/*'
    ]
  },
  
  vite: () => ({
    resolve: {
      alias: {
        '@notion-clipper/ui': new URL(
          '../../packages/ui/src',
          import.meta.url
        ).pathname,
        '@notion-clipper/adapters-webextension': new URL(
          '../../packages/adapters/webextension/src',
          import.meta.url
        ).pathname,
        '@notion-clipper/core': new URL(
          '../../packages/core/dist',
          import.meta.url
        ).pathname,
        events: 'eventemitter3'
      }
    },
    build: {
      rollupOptions: {
        external: ['crypto', 'wxt/storage'],
        // ✅ AJOUTER: Ne pas marquer webextension-polyfill comme externe
        output: {
          globals: {}
        }
      }
    },
    // ✅ AJOUTER: Optimiser les dépendances
    optimizeDeps: {
      include: ['webextension-polyfill']
    }
  })
});