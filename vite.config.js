import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The API runs separately (backend/, port 4000); the dev server forwards /api so the app needs no CORS setup
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000' },
  },
})
