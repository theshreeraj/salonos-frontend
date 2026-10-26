import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Business rules in ../shared are imported by both the app and the API
    fs: { allow: [repoRoot] },
    // The API runs separately (backend/, port 4000); the dev server forwards /api so the app needs no CORS setup
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000' },
  },
})
