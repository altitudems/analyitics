import { resolve } from 'node:path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/ingest': 'http://localhost:8787',
      '/stats': 'http://localhost:8787',
      '/events': 'http://localhost:8787',
      '/stream': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/health': 'http://localhost:8787',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
})
