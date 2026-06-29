import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// media now lives in /public/media (served at /media) — no symlink needed
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})
