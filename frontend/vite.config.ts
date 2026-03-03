import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        status: 'status.html',
      },
    },
  },
  define: {
    // VITE_WS_URL must be set at build time, e.g. ws://localhost:4000
    // Falls back to same-host port 4000 if not set
  },
});
