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
      }
    },
    build: {
      rollupOptions: {
        // ✅ CRITIQUE: Tout bundler pour le service worker
        external: [],
        output: {
          globals: {}
        }
      }
    },
    optimizeDeps: {
      include: [
        'webextension-polyfill',
        'react',
        'react-dom',
        'framer-motion',
        'lucide-react'
      ]
    }
  })
});