import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createBackend } from './server/backend.mjs'

/**
 * Romancha dev/preview config.
 *
 * The backend (realtime hub + domain API + SQLite/Postgres) lives in server/ and is
 * mounted identically here and in `server/index.mjs`, so `npm run dev`, `npm run
 * preview` and `npm start` exercise the same routes instead of the app silently
 * falling back to mock mode in production.
 *
 * configureServer is async on purpose: Vite awaits it, which lets the database
 * finish migrating before the first request is served.
 */
function romanchaBackend() {
  const mount = async (server) => {
    const backend = await createBackend({ log: (msg, err) => server.config.logger.error(msg, err || '') })
    server.middlewares.use((req, res, next) => backend.handle(req, res, next))
    server.httpServer?.on('close', () => backend.close())
    // Vite treats anything *returned* from configureServer as a post hook, so
    // this hook must resolve to undefined (returning the backend broke startup).
    server.__romancha = backend
  }
  return { name: 'romancha-backend', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), romanchaBackend()],
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
