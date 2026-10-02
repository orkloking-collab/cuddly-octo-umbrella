/**
 * Romancha domain API. Mounted by both `vite` (dev/preview) and `server/index.mjs`
 * (production), so the app talks to the same routes in every mode.
 *
 *   GET    /api/health                     mode, storage engine, presence
 *   POST   /api/auth/register|login|logout GET /api/auth/me
 *   GET    /api/state                      everything the client needs on boot
 *   PUT    /api/profile                    dating profile + prefs
 *   GET    /api/deck                       server-side filtered + scored deck
 *   POST   /api/swipe                      like | pass | super  (quota enforced here)
 *   POST   /api/undo
 *   GET    /api/likes                      real accounts that liked me
 *   GET    /api/matches                    incl. unread counts + expiry
 *   GET    /api/matches/:id                thread
 *   POST   /api/matches/:id/messages       persisted + pushed to the other peer over SSE
 *   POST   /api/matches/:id/read
 *   POST   /api/blocks  DELETE /api/blocks/:id
 *   POST   /api/reports                     report + block
 *   POST   /api/verify/selfie               pending -> verified (manual queue in prod)
 *   POST   /api/verify/phone/request|confirm  OTP
 *   POST   /api/premium                     demo checkout (no payment provider)
 *   GET    /api/admin/queue                 reports + review flags (ADMIN_TOKEN only)
 */
import crypto from 'node:crypto';
import {
  createUser, authenticate, destroySession, sessionUser, openSession,
  sessionCookie, clearedCookie, csrfOk, normalisePhone,
} from './auth.mjs';
import { createRepo } from './repo.mjs';
import { createSmsProvider, requestOtp, confirmOtp } from './otp.mjs';
import { PLANS, FREE_PLAN } from '../src/data/plans.js';
import { googleEnabled, verifyIdToken } from './google.mjs';

const JSON_LIMIT = 2 * 1024 * 1024;
// An upload is a base64 data URL inside JSON, so the body is ~1.37x the file.
// 12 MB covers our 4 MB photo and 8 MB voice-note caps; video attachments need a
// chunked endpoint, which this build does not have (and says so).
const UPLOAD_JSON_LIMIT = 12 * 1024 * 1024;
const READ_ONLY = new Set(['GET', 'HEAD', 'OPTIONS']);

function readJson(req, { maxBytes = JSON_LIMIT, tooLarge = 'That is bigger than this server accepts.' } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error(tooLarge), { status: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(Object.assign(new Error('invalid JSON body'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

/** Very small in-process limiter for anonymous endpoints (register/login/OTP). */
function createLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map();
  return function limited(key) {
    const now = Date.now();
    const entry = hits.get(key) || { start: now, count: 0 };
    if (now - entry.start > windowMs) { entry.start = now; entry.count = 0; }
    entry.count += 1;
    hits.set(key, entry);
    if (hits.size > 5000) hits.clear();
    return entry.count > max;
  };
}

export function createApi({ db, getRealtime = () => null, log = () => {}, uploads = null } = {}) {
  const repo = createRepo(db);
  const sms = createSmsProvider({ log });
  const limitAuth = createLimiter({ windowMs: 60_000, max: 40 });
  const api = { repo, db, sms };

  api.handle = async function handle(req, res, next) {
    const url = new URL(req.url || '/', 'http://romancha.local');
    const route = url.pathname;
    if (!route.startsWith('/api/') || route.startsWith('/api/realtime/')) return next?.();

    // X-Forwarded-For is only trustworthy behind a proxy that overwrites it.
    const clientIp = req.socket?.remoteAddress || 'unknown';
    const ip = process.env.TRUST_PROXY === '1'
      ? (req.headers['x-forwarded-for']?.split(',').pop()?.trim() || clientIp)
      : clientIp;
    const secure = process.env.NODE_ENV === 'production';
    let session = null;
    let body = {};

    try {
      session = await sessionUser(db, req);

      // ---- public ----
      if (route === '/api/health' && READ_ONLY.has(req.method)) {
        return send(res, 200, {
          ok: true, mode: 'server', db: db.kind, authMode: 'session-cookie',
          sms: sms.provider?.name || process.env.SMS_PROVIDER || 'console',
          uploads: uploads ? Boolean(uploads.root) : false,
          google: googleEnabled(),
          plans: PLANS.map((p) => p.id),
          online: getRealtime()?.onlineUsers?.() || [],
          at: Date.now(),
        });
      }

      // Public: the price list the UI renders and the API enforces.
      if (route === '/api/plans' && READ_ONLY.has(req.method)) {
        return send(res, 200, { free: FREE_PLAN, plans: PLANS, currency: { usdBdt: Number(process.env.USD_BDT || 118) } });
      }

      if (route === '/api/ads' && READ_ONLY.has(req.method)) {
        const ads = await repo.listActiveAds(url.searchParams.get('placement') || 'banner');
        return send(res, 200, { ads, note: 'First-party placements only — no third-party ad networks in this app.' });
      }

      const adPing = route.match(/^\/api\/ads\/([\w-]+)\/ping$/);
      if (adPing && req.method === 'POST') {
        body = await readJson(req);
        const out = await repo.countAd(adPing[1], body.kind === 'click' ? 'click' : 'impression', session?.user?.id || null);
        return send(res, out.ok ? 200 : 404, out);
      }

      if (route === '/api/auth/google/config' && READ_ONLY.has(req.method)) {
        return send(res, 200, {
          enabled: googleEnabled(),
          clientId: googleEnabled() ? process.env.GOOGLE_CLIENT_ID.split(',')[0].trim() : null,
        });
      }

      // Google Identity Services: the browser hands us an ID token, we verify it.
      if (route === '/api/auth/google' && req.method === 'POST') {
        if (limitAuth(`goog:${ip}`)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' });
        // A cross-site login attempt (attacker logs the victim into *their* account)
        // is cheap to block: same-origin or nothing.
        const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
        if (origin && origin !== `${req.headers['x-forwarded-proto'] || 'http'}://${(req.headers.host || '').replace(/:\d+$/, '')}`) {
          const allowed = (process.env.PUBLIC_ORIGIN || '').split(',').map((v) => v.trim()).filter(Boolean);
          if (!allowed.includes(origin)) return send(res, 403, { error: 'That sign-in request came from another site.' });
        }
        body = await readJson(req);
        const verified = await verifyIdToken(body.credential);
        if (verified.error) return send(res, verified.status, { error: verified.error });
        let user = await db.get('SELECT * FROM users WHERE email = ?', [verified.email]);
        if (!user) {
          const created = await createUser(db, {
            email: verified.email,
            // No password exists for a Google account: random 32 bytes, never shown.
            password: crypto.randomBytes(24).toString('base64url'),
            displayName: verified.name || verified.email.split('@')[0],
          });
          if (created.error) return send(res, created.status || 500, { error: created.error });
          if (verified.picture) {
            await repo.saveProfile(created.user.id, { profile: { name: created.user.displayName, avatar: verified.picture } });
          }
          user = await db.get('SELECT * FROM users WHERE email = ?', [verified.email]);
        }
        const authed = await openSession(db, user, req.headers['user-agent']);
        res.setHeader('Set-Cookie', sessionCookie(authed.session.token, { secure }));
        return send(res, 200, { user: authed.user, csrf: authed.session.csrf, linkedGoogle: true });
      }

      if (route === '/api/auth/register' && req.method === 'POST') {
        if (limitAuth(`reg:${ip}`)) return send(res, 429, { error: 'Too many sign-ups from your network. Wait a minute.' });
        body = await readJson(req);
        const result = await createUser(db, {
          email: body.email,
          password: body.password,
          displayName: body.displayName || body.name || '',
        });
        if (result.error) return send(res, result.status || 400, { error: result.error });
        const authed = await authenticate(db, { email: body.email, password: body.password, userAgent: req.headers['user-agent'] });
        if (authed.error) return send(res, authed.status, { error: authed.error });
        res.setHeader('Set-Cookie', sessionCookie(authed.session.token, { secure }));
        await repo.saveProfile(result.user.id, { profile: { name: result.user.displayName || '', id: result.user.id }, prefs: {} });
        return send(res, 201, { user: authed.user, csrf: authed.session.csrf });
      }

      if (route === '/api/auth/login' && req.method === 'POST') {
        if (limitAuth(`login:${ip}`)) return send(res, 429, { error: 'Too many login attempts. Wait a minute.' });
        body = await readJson(req);
        const authed = await authenticate(db, { email: body.email, password: body.password, userAgent: req.headers['user-agent'] });
        if (authed.error) return send(res, authed.status, { error: authed.error });
        res.setHeader('Set-Cookie', sessionCookie(authed.session.token, { secure }));
        return send(res, 200, { user: authed.user, csrf: authed.session.csrf });
      }

      if (route === '/api/auth/logout' && req.method === 'POST') {
        await destroySession(db, session?.rawToken);
        res.setHeader('Set-Cookie', clearedCookie());
        return send(res, 200, { ok: true });
      }

      if (route === '/api/auth/me' && READ_ONLY.has(req.method)) {
        if (!session) return send(res, 200, { user: null });
        return send(res, 200, { user: session.user, csrf: session.csrf });
      }

      // ---- authenticated ----
      if (!session) return send(res, 401, { error: 'Sign in to continue.' });
      if (!READ_ONLY.has(req.method) && !csrfOk(req, session)) {
        return send(res, 403, { error: 'Missing or wrong CSRF token. Refresh the page.' });
      }
      const userId = session.user.id;

      if (route === '/api/state' && READ_ONLY.has(req.method)) {
        const [profile, deck, matches, blocks, reports, verification] = await Promise.all([
          repo.getProfile(userId),
          repo.deckFor(userId),
          repo.listMatches(userId),
          repo.listBlocks(userId),
          repo.listReports(userId),
          repo.verification(userId),
        ]);
        const [planInfo, calls, storageBytes, ads] = await Promise.all([
          repo.planFor(userId),
          repo.callStateFor(userId),
          repo.storageBytesUsed(userId),
          repo.listAdsFor(userId),
        ]);
        return send(res, 200, {
          user: session.user,
          profile: profile.profile,
          prefs: profile.prefs,
          decisions: deck.decisions,
          matches,
          blocks,
          reports,
          verification,
          quota: deck.quota,
          likedMeCount: deck.likedMeCount,
          premium: planInfo.active ? planInfo.plan.id : null,
          plan: { ...planInfo.plan, expiresAt: planInfo.expiresAt, active: planInfo.active },
          calls,
          storageBytes,
          myAds: ads,
        });
      }

      if (route === '/api/profile' && req.method === 'PUT') {
        body = await readJson(req);
        const saved = await repo.saveProfile(userId, { profile: body.profile, prefs: body.prefs });
        return send(res, 200, { ok: true, ...saved });
      }

      if (route === '/api/deck' && READ_ONLY.has(req.method)) {
        const out = await repo.deckFor(userId, {
          includeDecided: url.searchParams.get('all') === '1',
          limit: Number(url.searchParams.get('limit')) || 60,
        });
        return send(res, 200, out);
      }

      if (route === '/api/swipe' && req.method === 'POST') {
        body = await readJson(req);
        const kind = ['like', 'pass', 'super'].includes(body.kind) ? body.kind : null;
        if (!kind || !body.targetId) return send(res, 400, { error: 'targetId and kind (like|pass|super) are required' });
        if (await repo.isBlocked(body.targetId.startsWith('usr:') ? body.targetId.slice(4) : body.targetId, userId)) {
          return send(res, 403, { error: 'That account is blocked.' });
        }
        const result = await repo.evaluateSwipe({ userId, targetId: String(body.targetId).slice(0, 80), kind });
        if (result.ok && result.matched && result.matchId) {
          getRealtime()?.sendTo?.(userId, { type: 'match', matchId: result.matchId, at: Date.now() });
        }
        return send(res, result.ok ? 200 : 429, result);
      }

      if (route === '/api/undo' && req.method === 'POST') {
        body = await readJson(req);
        if (!body.targetId) return send(res, 400, { error: 'targetId is required' });
        await repo.undoDecision(userId, String(body.targetId).slice(0, 80));
        return send(res, 200, { ok: true });
      }

      if (route === '/api/likes' && READ_ONLY.has(req.method)) {
        return send(res, 200, { likes: await repo.incomingLikes(userId) });
      }

      if (route === '/api/matches' && READ_ONLY.has(req.method)) {
        return send(res, 200, { matches: await repo.listMatches(userId) });
      }

      const matchMsg = route.match(/^\/api\/matches\/([\w-]+)\/(messages|read)$/);
      if (matchMsg && req.method === 'POST') {
        const [, matchId, action] = matchMsg;
        const view = await repo.thread(matchId, userId);
        if (!view) return send(res, 404, { error: 'Match not found' });
        if (action === 'read') {
          await repo.markRead(matchId, userId);
          return send(res, 200, { ok: true });
        }
        body = await readJson(req);
        const kind = ['text', 'photo', 'voice'].includes(body.kind) ? body.kind : 'text';
        // eslint-disable-next-line no-control-regex -- zero-width and control junk is exactly what we strip
        const text = String(body.text || '').replace(/[\u0000-\u001F\u200B-\u200D]/g, '').trim().slice(0, 2000);
        // Media arrives as a path from /api/uploads, never as a URL the server fetches.
        const mediaUrl = typeof body.mediaUrl === 'string' && /^\/uploads\/[a-f0-9]{40}\.[a-z0-9]{2,4}$/.test(body.mediaUrl)
          ? body.mediaUrl
          : null;
        if (!text && !mediaUrl) return send(res, 400, { error: 'Empty message' });
        const saved = await repo.appendMessage({
          matchId,
          senderId: userId,
          // A media message still carries a caption so previews and search have text.
          body: text || (kind === 'voice' ? 'Voice note' : kind === 'photo' ? 'Photo' : ''),
          kind,
          mediaUrl,
          durationMs: body.durationMs,
        });
        // Push to the recipient's open stream so chat is live, not poll-then-pray.
        const delivered = getRealtime()?.sendTo?.(saved.recipient, {
          type: 'chat', matchId,
          message: {
            id: saved.id, from: 'them', text: saved.body, kind: saved.kind, ts: saved.ts,
            media: saved.mediaUrl, durationMs: saved.durationMs,
          },
          at: saved.ts,
        });
        return send(res, 201, { ...saved, delivered: Boolean(delivered) });
      }

      const matchGet = route.match(/^\/api\/matches\/([\w-]+)$/);
      if (matchGet && READ_ONLY.has(req.method)) {
        const view = await repo.thread(matchGet[1], userId);
        if (!view) return send(res, 404, { error: 'Match not found' });
        return send(res, 200, { match: view.match, messages: view.messages, counterpart: view.match.user_a === userId ? view.match.user_b : view.match.user_a });
      }

      if (route === '/api/blocks' && READ_ONLY.has(req.method)) {
        return send(res, 200, { blocks: await repo.listBlocks(userId) });
      }

      if (route === '/api/blocks' && req.method === 'POST') {
        body = await readJson(req);
        if (!body.blockedId) return send(res, 400, { error: 'blockedId is required' });
        await repo.block(userId, String(body.blockedId).slice(0, 80));
        return send(res, 201, { ok: true });
      }
      const unblock = route.match(/^\/api\/blocks\/([\w:-]+)$/);
      if (unblock && req.method === 'DELETE') {
        await repo.unblock(userId, unblock[1]);
        return send(res, 200, { ok: true });
      }

      if (route === '/api/reports' && req.method === 'POST') {
        body = await readJson(req);
        if (!body.targetId || !body.reason) return send(res, 400, { error: 'targetId and reason are required' });
        const id = await repo.fileReport({
          reporterId: userId, targetId: String(body.targetId).slice(0, 80), reason: body.reason, detail: body.detail,
        });
        log(`[safety] report ${id} against ${body.targetId}: ${body.reason}`);
        return send(res, 201, { ok: true, id, status: 'reviewing' });
      }

      if (route === '/api/verify/selfie' && req.method === 'POST') {
        const now = Date.now();
        const v = await repo.setVerification(userId, { status: 'pending', method: 'selfie', selfie_at: now });
        // A production build hands this to a human/moderation queue. Here we
        // approve only if the account also has a phone-verified number.
        if (v.phone_verified) {
          return send(res, 200, await repo.setVerification(userId, { status: 'verified', verified_at: Date.now() }));
        }
        return send(res, 200, { ...v, note: 'Selfie queued. Verify your phone number to complete it automatically.' });
      }

      if (route === '/api/verify/phone/request' && req.method === 'POST') {
        if (limitAuth(`otp:${ip}`)) return send(res, 429, { error: 'Too many codes from this device. Try later.' });
        body = await readJson(req);
        const phone = normalisePhone(body.phone);
        if (!phone) return send(res, 400, { error: 'Enter a phone number with country code, e.g. +8801712345678' });
        const taken = await db.get('SELECT id FROM users WHERE phone = ? AND id <> ?', [phone, userId]);
        if (taken) return send(res, 409, { error: 'That number is already used by another account.' });
        const out = await requestOtp(db, { phone, ip }, sms);
        if (out.error) return send(res, out.status, { error: out.error });
        return send(res, 200, { ...out, phone });
      }

      if (route === '/api/verify/phone/confirm' && req.method === 'POST') {
        body = await readJson(req);
        const phone = normalisePhone(body.phone);
        if (!phone) return send(res, 400, { error: 'Invalid phone number' });
        const out = await confirmOtp(db, { phone, code: body.code });
        if (out.error) return send(res, out.status, { error: out.error });
        await db.run('UPDATE users SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = ?)', [phone, userId, phone]);
        await repo.setVerification(userId, { phone_verified: true, phone_verified_at: Date.now() });
        const v = await repo.verification(userId);
        if (v.status === 'pending') {
          return send(res, 200, { ok: true, verification: await repo.setVerification(userId, { status: 'verified', verified_at: Date.now() }) });
        }
        return send(res, 200, { ok: true, verification: v });
      }

      if (route === '/api/premium' && req.method === 'POST') {
        body = await readJson(req);
        const requested = body.plan === null || body.plan === '' ? null : String(body.plan).slice(0, 20);
        if (requested && !PLANS.some((p) => p.id === requested)) {
          return send(res, 400, { error: `Unknown plan. Choose one of: ${PLANS.map((p) => p.id).join(', ')}` });
        }
        await repo.setPremium(userId, requested);
        const calls = await repo.callStateFor(userId);
        return send(res, 200, {
          ok: true, plan: requested, ...calls,
          note: 'Demo checkout — no payment provider is wired up, so nothing was charged. Set STRIPE_SECRET_KEY (or a bKash/Nagad merchant account) to make this real.',
        });
      }

      // ---- video-date minutes ----
      if (route === '/api/calls/state' && READ_ONLY.has(req.method)) {
        return send(res, 200, await repo.callStateFor(userId));
      }

      if (route === '/api/calls/history' && READ_ONLY.has(req.method)) {
        return send(res, 200, { calls: await repo.callHistory(userId) });
      }

      if (route === '/api/calls/start' && req.method === 'POST') {
        body = await readJson(req);
        const out = await repo.startCall(userId, body.matchId || null);
        return send(res, out.ok ? 201 : 429, out);
      }

      if (route === '/api/calls/heartbeat' && req.method === 'POST') {
        body = await readJson(req);
        if (!body.sessionId) return send(res, 400, { error: 'sessionId is required' });
        const out = await repo.heartbeatCall(userId, body.sessionId);
        return send(res, out.ok ? 200 : 404, out);
      }

      if (route === '/api/calls/end' && req.method === 'POST') {
        body = await readJson(req);
        if (!body.sessionId) return send(res, 400, { error: 'sessionId is required' });
        const out = await repo.endCall(userId, body.sessionId);
        return send(res, out.ok ? 200 : 404, { ...out, ...(out.ok ? await repo.callStateFor(userId) : {}) });
      }

      // ---- uploads ----
      if (route === '/api/uploads' && req.method === 'POST') {
        if (!uploads) return send(res, 503, { error: 'Upload storage is disabled on this server.' });
        if (limitAuth(`up:${ip}`)) return send(res, 429, { error: 'Too many uploads in a short window. Slow down.' });
        body = await readJson(req, {
          maxBytes: UPLOAD_JSON_LIMIT,
          tooLarge: 'That file is too big to upload here (4 MB per photo, 8 MB per voice note).',
        });
        const used = await repo.storageBytesUsed(userId);
        if (used > uploads.maxBytesPerUser) {
          return send(res, 507, { error: 'Your media storage is full. Delete something in Safety → Your data.' });
        }
        let saved;
        try {
          saved = await uploads.save({ data: body.dataUrl || body.data, kind: body.kind || 'image' });
        } catch (err) {
          return send(res, err.status || 400, { error: err.message });
        }
        const row = await repo.recordUpload({ userId, ...saved });
        return send(res, 201, { ...saved, id: row.id, usedBytes: used + saved.bytes });
      }

      if (route === '/api/uploads' && READ_ONLY.has(req.method)) {
        return send(res, 200, {
          files: await repo.uploadsOf(userId),
          usedBytes: await repo.storageBytesUsed(userId),
          quotaBytes: uploads?.maxBytesPerUser ?? 0,
        });
      }

      const uploadDelete = route.match(/^\/api\/uploads\/([\w-]+)$/);
      if (uploadDelete && req.method === 'DELETE') {
        const out = await repo.deleteUpload(userId, uploadDelete[1]);
        if (!out.ok) return send(res, 404, out);
        // Only unlink when no other account references the same bytes.
        if (!out.sharedByOthers && uploads) uploads.remove(out.path);
        return send(res, 200, { ok: true, freedBytes: true, shared: out.sharedByOthers });
      }

      if (route === '/api/uploads' && req.method === 'DELETE') {
        const out = await repo.deleteAllUploads(userId);
        if (uploads) {
          const keep = new Set(await repo.referencedUploadPaths());
          uploads.sweep(keep);
        }
        return send(res, 200, { ok: true, removed: out.removed });
      }

      // ---- ad manager (first-party placements) ----
      if (route === '/api/ads/mine' && READ_ONLY.has(req.method)) {
        return send(res, 200, { campaigns: await repo.listAdsFor(userId) });
      }

      if (route === '/api/ads' && req.method === 'POST') {
        body = await readJson(req);
        if (!body.title || !body.targetUrl) return send(res, 400, { error: 'title and targetUrl are required' });
        // Only http(s) targets: a `javascript:` or `data:` href is an XSS payload
        // with a friendly face.
        if (!/^https?:\/\//i.test(String(body.targetUrl))) return send(res, 400, { error: 'targetUrl must start with http:// or https://' });
        const out = await repo.createAd({
          ownerId: userId, title: body.title, imageUrl: body.imageUrl, targetUrl: body.targetUrl,
          placement: body.placement, impressionsBudget: body.impressionsBudget, startsAt: body.startsAt, endsAt: body.endsAt, cpmUsd: body.cpmUsd,
        });
        log(`[ads] campaign ${out.id} from ${userId} pending review`);
        return send(res, 201, { ...out, note: 'Campaigns go live after review. No payment is taken yet — pricing is an estimate.' });
      }

      if (route === '/api/admin/ads' && req.method === 'POST') {
        if (!process.env.ADMIN_TOKEN || url.searchParams.get('token') !== process.env.ADMIN_TOKEN) {
          return send(res, 403, { error: 'Set ADMIN_TOKEN and pass ?token= to moderate ads.' });
        }
        body = await readJson(req);
        const out = await repo.setAdStatus(body.id, body.status);
        return send(res, out.ok ? 200 : 400, out);
      }

      if (route === '/api/admin/queue' && READ_ONLY.has(req.method)) {
        if (!process.env.ADMIN_TOKEN || url.searchParams.get('token') !== process.env.ADMIN_TOKEN) {
          return send(res, 403, { error: 'Set ADMIN_TOKEN and pass ?token= to read the review queue.' });
        }
        const reports = await db.all('SELECT * FROM reports ORDER BY created_at DESC LIMIT 100');
        return send(res, 200, { reports, pendingVerifications: await db.all('SELECT * FROM verifications WHERE status = ?', ['pending']) });
      }

      return send(res, 404, { error: `No route for ${req.method} ${route}` });
    } catch (err) {
      if (err && err.status) return send(res, err.status, { error: err.message });
      log('[api] error', err?.message);
      return send(res, 500, { error: 'Internal error' });
    }
  };

  return api;
}
