// apps/notion-clipper-app/src/react/vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Charger les variables d'environnement depuis le dossier courant
  const env = loadEnv(mode, __dirname, '');
  
  return {
    plugins: [react()],
    
    root: __dirname,
    
    base: './',
    
    // Exposer les variables d'environnement
    envDir: __dirname,
  
  // ✅ Configuration pour multi-page (index + bubble)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        bubble: path.resolve(__dirname, 'bubble.html'), // ✅ Entry point pour bubble
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Optimisations
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: false,
  },
  
  server: {
    port: 3000,
    strictPort: true,
    
    // ✅ CORS permissif pour Electron
    cors: true,
    
    headers: {
      'Access-Control-Allow-Origin': '*',
      // 🔧 FIX: Allow connections to backend API in dev mode
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* ws://localhost:* https://api.notion.com https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com;",
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@notion-clipper/i18n': path.resolve(__dirname, '../../../../packages/i18n/src'),
      '@notion-clipper/ui': path.resolve(__dirname, '../../../../packages/ui/src'),
      '@notion-clipper/core-shared': path.resolve(__dirname, '../../../../packages/core-shared/src'),
      '@notion-clipper/notion-parser': path.resolve(__dirname, '../../../../packages/notion-parser/src'),
      '@notion-clipper/plate-adapter': path.resolve(__dirname, '../../../../packages/plate-adapter/src'),
    },
  },
  
  // Optimisations des dépendances
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
      // Slate editor dependencies
      'slate',
      'slate-react',
      'slate-history',
    ],
  },
  
  // Configuration CSS
  css: {
    devSourcemap: true,
  },
  
    // Mode de développement
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  };
});