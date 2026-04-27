// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/image_capture/api': {
        target: 'https://flasherp.in',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://flasherp.in',
        changeOrigin: true,
      },
      '/media': {
        target: 'https://flasherp.in',
        changeOrigin: true,
      },
    },
  },
})