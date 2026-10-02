/**
 * One place that wires the backend (realtime hub + domain API + database) so dev,
 * preview and production are provably the same code path.
 *
 *   createBackend() -> { handle(req, res, next), close() }
 *
 * `handle` claims every /api/* request and calls `next()` for anything else.
 */
import { createDb } from './db.mjs';
import { createRealtimeStore } from './realtimeApi.mjs';
import { createApi } from './api.mjs';

const REALTIME_ROUTES = new Map([
  ['/api/realtime/stream', 'stream'],
  ['/api/realtime/publish', 'publish'],
  ['/api/realtime/presence', 'presence'],
  ['/api/realtime/signal', 'signal'],
  ['/api/realtime/health', 'health'],
]);

export async function createBackend({ log = console.error } = {}) {
  const db = await createDb({ file: process.env.ROMANCHA_DB, url: process.env.DATABASE_URL });
  const { handlers, sendTo, onlineUsers } = createRealtimeStore();
  const api = createApi({ db, getRealtime: () => ({ sendTo, onlineUsers }), log });

  const handle = (req, res, next) => {
    let pathname;
    try {
      pathname = new URL(req.url || '/', 'http://romancha.local').pathname;
    } catch {
      pathname = '/';
    }

    if (pathname.startsWith('/api/realtime/')) {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'content-type,x-romancha-user',
        });
        res.end();
        return undefined;
      }
      const name = REALTIME_ROUTES.get(pathname);
      const handler = name && handlers[name];
      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'unknown endpoint' }));
        return undefined;
      }
      // history/health take (req, res); stream/publish/presence/signal too.
      return handler(req, res);
    }

    if (pathname === '/api/health') return api.handle(req, res, next);
    if (pathname.startsWith('/api/')) return api.handle(req, res, next);
    return next?.();
  };

  return {
    handle,
    db,
    sendTo,
    onlineUsers,
    close: () => db.close?.(),
  };
}
