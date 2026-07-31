import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so the dev server is reachable from outside a container
    proxy: {
      '/api': {
        // Overridden to the compose service name (e.g. http://backend:8000)
        // when running inside Docker; defaults to localhost for local dev.
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
