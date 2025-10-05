import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Notion Clipper Pro',
    description: 'Capturez rapidement du contenu vers vos pages Notion',
    version: '1.0.0',
    permissions: [
      'storage',
      'contextMenus',
      'activeTab',
      'scripting',
      'notifications'
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Notion Clipper Pro'
    },
    icons: {
      16: '/icon/16.png',
      48: '/icon/48.png',
      128: '/icon/128.png'
    }
  }
});