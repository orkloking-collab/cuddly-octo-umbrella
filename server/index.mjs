/**
 * Romancha production server: static SPA + realtime API + a couple of
 * hardening headers. No framework, no build step, ~2 requests/second is fine
 * for a prototype; put nginx or a CDN in front for anything bigger.
 *
 *   npm run build && npm start   ->  http://localhost:3000
 */
import http from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackend } from './backend.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  // Camera/mic are allowed for the origin itself: 1:1 video dates need
  // getUserMedia. Everything else (autoplay excluded) stays locked down.
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), display-capture=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export function createServer(backend) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const route = url.pathname;

    // /api/* is entirely the backend's business (realtime hub + domain routes).
    if (route.startsWith('/api/')) {
      if (!backend) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'backend unavailable' }));
        return undefined;
      }
      backend.handle(req, res, () => {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unknown endpoint' }));
      });
      return undefined;
    }

    if (backend && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
      res.writeHead(405, BASE_HEADERS);
      res.end();
      return undefined;
    }

    // Uploaded media is served from data/uploads, content-addressed and immutable.
    if (route.startsWith('/uploads/') && backend?.uploads?.serve(req, res, route)) return undefined;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, BASE_HEADERS);
      res.end();
      return;
    }

    // Resolve inside ROOT only — no ../ escapes.
    const clean = path.normalize(route).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(ROOT, clean);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, BASE_HEADERS);
      res.end('forbidden');
      return;
    }

    (async () => {
      if (await exists(filePath)) {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
      } else {
        filePath = path.join(ROOT, 'index.html'); // SPA fallback
      }

      const ext = path.extname(filePath);
      const isHtml = ext === '.html';
      res.writeHead(200, {
        ...BASE_HEADERS,
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
      });

      const stream = createReadStream(filePath);
      stream.on('error', () => {
        res.writeHead(500, BASE_HEADERS);
        res.end('server error');
      });
      stream.pipe(res);
    })();
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  if (!(await exists(path.join(ROOT, 'index.html')))) {
    console.error('\n  dist/index.html is missing — run `npm run build` first.\n');
    process.exit(1);
  }
  const backend = await createBackend();
  createServer(backend).listen(PORT, HOST, () => {
    const shown = HOST === '0.0.0.0' || HOST === '::' ? 'localhost' : HOST;
    console.log(`  Romancha serving ${ROOT}`);
    console.log(`  http://${shown}:${PORT}  (API: /api/*, storage: ${backend.db.kind})`);
  });
}
