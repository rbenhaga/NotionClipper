import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['src/__tests__/**/*'],
    }),
  ],
  resolve: {
    // Dedupe to prevent multiple instances of core packages (critical for Plate v52)
    dedupe: [
      'react',
      'react-dom',
      'slate',
      'slate-react',
      'slate-dom',
      'platejs',
      '@platejs/core',
      '@platejs/slate',
      '@platejs/utils',
    ],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PlateAdapter',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@notion-clipper/notion-parser',
        // Plate v52 packages (all @platejs/*)
        /^@platejs\/.*/,
        /^platejs.*/,
        // Slate (transitive dep of Plate)
        /^slate.*/,
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
