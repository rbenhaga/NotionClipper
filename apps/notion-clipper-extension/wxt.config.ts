import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  
  vite: () => ({
    resolve: {
      alias: {
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
        external: ['crypto', 'wxt/storage']
      }
    }
  })
});