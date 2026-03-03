import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [react(), cssInjectedByJs()],
  build: {
    // Merge into the main dist without clearing it
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/widget.ts',
      name: 'McpChat',
      formats: ['iife'],
      fileName: () => 'widget/mcp-chat.js',
    },
  },
});
