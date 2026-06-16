import { defineConfig } from 'vite';
import vue2 from '@vitejs/plugin-vue2';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
    extensions: ['.vue', '.js', '.json']
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Vue2Viewerjs',
      formats: ['umd', 'es']
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'vue2-viewerjs.css';
          }
          return assetInfo.name || 'assets';
        },
        entryFileNames: 'vue2-viewerjs.[format].js'
      }
    },
    cssCodeSplit: false,
    minify: false
  },
  server: {
    port: 3000,
    open: true
  }
});
