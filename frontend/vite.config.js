import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      host: 'localhost',
    },
    proxy: {
      // SSE stream — must not be buffered; handle separately
      '/api/stream': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        xfwd: true,
        // Disable response buffering so event-stream messages flush immediately
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept', 'text/event-stream');
          });
        },
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        xfwd: true,
      },
    },
  },
});
