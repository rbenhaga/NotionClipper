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
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@notion-clipper/i18n': path.resolve(__dirname, '../../../../packages/i18n/src'),
      '@notion-clipper/ui': path.resolve(__dirname, '../../../../packages/ui/src'),
      '@notion-clipper/core-shared': path.resolve(__dirname, '../../../../packages/core-shared/src'),
      '@notion-clipper/notion-parser': path.resolve(__dirname, '../../../../packages/notion-parser/src'),
    },
  },
  
  // Optimisations des dépendances
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
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