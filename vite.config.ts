import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      /* Pinned rather than left to the default so the client build and the SSR build
         used by the prerender pass produce identical class names. A mismatch there
         would surface as a hydration diff on every styled element. */
      generateScopedName: '[name]_[local]_[hash:base64:5]',
    },
  },
  build: {
    target: 'es2022',
    /* One stylesheet, referenced from the prerendered <head>, so prerendered pages
       paint styled without waiting for a JS chunk to resolve its CSS import. */
    cssCodeSplit: false,
  },
});
