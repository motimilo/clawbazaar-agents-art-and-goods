import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['crafts-museum-remark-magnetic.trycloudflare.com'],
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
