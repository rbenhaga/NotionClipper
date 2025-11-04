import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configuration explicite pour éviter les erreurs de détection
      include: "**/*.{jsx,tsx}",
      jsxRuntime: 'automatic'
    })
  ],
  root: './',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Point d'entrée principal
        main: path.resolve(__dirname, 'index.html'),
        // Point d'entrée pour la bulle flottante
        bubble: path.resolve(__dirname, 'bubble.html')
      },
      output: {
        // Organisation des fichiers de sortie
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Optimisations
    minify: 'esbuild',
    sourcemap: false,
    // Compatibilité Electron
    target: 'esnext',
    // Limites de taille
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    strictPort: false,
    // HMR pour Electron
    watch: {
      usePolling: true
    },
    fs: {
      // Permettre l'accès aux fichiers en dehors du root
      allow: ['..', '../../../packages']
    },
    open: false
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react'
    ]
  }
}); 