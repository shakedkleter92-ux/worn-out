import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// media lives in /public/media (served at /media) — no symlink needed.
// On GitHub Pages the site is served from /worn-out/, so we set that
// base only for the production build; dev stays at root (/).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/worn-out/' : '/',
  plugins: [react()],
  server: {
    port: 5173
  }
}))
