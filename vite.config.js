import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { attachRealtime } from './server/realtimeApi.mjs'

/**
 * Romancha dev/preview config.
 *
 * The realtime hub lives in server/realtimeApi.mjs so the exact same API exists
 * in dev (`vite`), in preview (`vite preview`) and in production (`npm start`).
 * It used to be copy-pasted middleware inside this file, which meant a production
 * build had no backend at all.
 */
function realtimePlugin() {
  return {
    name: 'romancha-realtime-hub',
    configureServer(server) {
      attachRealtime(server)
    },
    configurePreviewServer(server) {
      attachRealtime(server)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), realtimePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    cors: true,
    allowedHosts: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    // Vite 8 (rolldown) wants a function for manualChunks; `advancedChunks` is
    // the new knob. Left off: the app is small enough that one entry chunk is
    // ~230 kB gz, which is fine, and splitting added zero measurable wins.
  }
})
