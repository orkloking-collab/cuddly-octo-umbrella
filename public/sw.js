/* Romancha service worker — installable app shell + offline fallback.
 *
 * Rules, in order of how much they matter:
 *  1. /api/* and /uploads/* are NEVER cached. They are per-user, authenticated
 *     responses and dating photos; a shared HTTP cache must not hold either.
 *  2. Navigations are network-first, and fall back to the cached shell with an
 *     `x-romancha-offline` header so the UI can say "offline" honestly.
 *  3. Other same-origin GETs (hashed JS/CSS/images) are cache-first, since a
 *     hashed filename never changes content.
 *  4. Cross-origin fonts are stale-while-revalidate; nothing else cross-origin
 *     is touched — this app loads no ad or tracker scripts to keep offline-safe.
 */
const VERSION = 'romancha-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const REMOTE = `${VERSION}-remote`;
const PRECACHE = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then(async (cache) => {
        // Individual failures (a missing offline.html in dev) must not veto the SW.
        await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isPrivate = (url) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/signal');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isPrivate(url)) return; // always hit the network, never store

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/', copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match('/')) || offlinePage()),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    if (!/fonts\.(googleapis|gstatic)\.com$/.test(url.host)) return;
    event.respondWith(staleWhileRevalidate(req, REMOTE));
    return;
  }

  event.respondWith(cacheFirst(req, ASSETS));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: false });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic' && !res.headers.get('set-cookie')) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // A chunk that is not cached and cannot be fetched: be explicit, not silent.
    return new Response('offline', { status: 503, headers: { 'x-romancha-offline': '1' } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || refresh;
}

function offlinePage() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Romancha — offline</title><body style="background:#0d0714;color:#f5e6eb;font-family:system-ui,sans-serif;padding:32px"><h1 style="font-size:20px">You are offline</h1><p style="color:#c9a7b2;font-size:14px">Reconnect to load your matches. Nothing was sent, and nothing was cached from your chats.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'x-romancha-offline': '1' } },
  );
}
