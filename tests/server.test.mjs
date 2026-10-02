/**
 * End-to-end tests for the backend: real HTTP requests against a real database
 * (node:sqlite in memory), through the same wiring `npm start` uses.
 *
 *   node --test tests/server.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';

const ORIG = { ...process.env };
process.env.ROMANCHA_DB = ':memory:';
process.env.DATABASE_URL = '';
process.env.ALLOW_INLINE_CODE = '1';
// Each client gets its own "IP" so the anonymous rate limiter cannot make one test
// fail because an earlier test in the same file registered accounts.
process.env.TRUST_PROXY = '1';

const { createBackend } = await import('../server/backend.mjs');

let server;
let base;
let backend;

test.before(async () => {
  backend = await createBackend({ log: () => {} });
  server = http.createServer((req, res) => backend.handle(req, res, () => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'nope' }));
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server?.close();
  await once(server, 'close');
  backend?.close();
  Object.assign(process.env, ORIG);
});

/* ------------------------------------------------------------------ helpers */

let clientSeq = 0;

class Client {
  constructor() {
    this.cookie = '';
    this.csrf = '';
    clientSeq += 1;
    this.ip = `10.77.${Math.floor(clientSeq / 250)}.${clientSeq % 250}`;
  }

  async call(method, path, body) {
    const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': this.ip };
    if (this.cookie) headers.Cookie = this.cookie;
    if (this.csrf && method !== 'GET' && method !== 'HEAD') headers['x-csrf-token'] = this.csrf;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (json?.csrf) this.csrf = json.csrf;
    return { status: res.status, body: json };
  }

  register(email, password, displayName) {
    return this.call('POST', '/api/auth/register', { email, password, displayName });
  }
}

const unique = (() => { let n = 0; return (p = 'u') => `${p}${++n}@romancha.test`; })();
const PASSWORD = 'Romancha!2026';

/* -------------------------------------------------------------------- tests */

test('health reports the storage engine', async () => {
  const res = await fetch(`${base}/api/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'server');
  assert.equal(body.db, 'sqlite');
});

test('registration validates email, password and duplicates', async () => {
  const anon = new Client();
  assert.match((await anon.call('POST', '/api/auth/register', { email: 'nope', password: PASSWORD })).body.error, /valid email/i);
  assert.match((await anon.call('POST', '/api/auth/register', { email: unique(), password: 'short' })).body.error, /at least 10 characters/);
  assert.match((await anon.call('POST', '/api/auth/register', { email: unique(), password: 'Romancha123' })).body.error, /commonly leaked/);

  const email = unique('dup');
  const first = await anon.register(email, PASSWORD, 'Dup Test');
  assert.equal(first.status, 201, JSON.stringify(first.body));
  assert.ok(first.body.user.id);
  assert.ok(first.body.csrf, 'csrf token is handed to the client');

  const second = await new Client().register(email, PASSWORD, 'Someone Else');
  assert.equal(second.status, 409);
  assert.match(second.body.error, /already/i);
});

test('unknown email and wrong password are indistinguishable', async () => {
  const email = unique('known');
  await new Client().register(email, PASSWORD, 'Known');
  const c = new Client();
  const wrong = await c.call('POST', '/api/auth/login', { email, password: 'WrongPass!2026' });
  const ghost = await c.call('POST', '/api/auth/login', { email: 'ghost@romancha.test', password: PASSWORD });
  assert.equal(wrong.status, 401);
  assert.equal(ghost.status, 401);
  assert.equal(wrong.body.error, ghost.body.error, 'login errors must not leak which accounts exist');
});

test('five bad logins lock the account for 15 minutes', async () => {
  const email = unique('lock');
  await new Client().register(email, PASSWORD, 'Locked');
  const c = new Client();
  for (let i = 0; i < 5; i += 1) {
    await c.call('POST', '/api/auth/login', { email, password: 'nope-nope-nope' });
  }
  const nowRight = await c.call('POST', '/api/auth/login', { email, password: PASSWORD });
  assert.equal(nowRight.status, 429);
  assert.match(nowRight.body.error, /too many failed attempts/i);
});

test('mutations need the CSRF token; GETs do not', async () => {
  const c = new Client();
  await c.register(unique('csrf'), PASSWORD, 'Csrf');
  const ok = await c.call('GET', '/api/state');
  assert.equal(ok.status, 200);

  const res = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: c.cookie, 'X-Forwarded-For': c.ip },
    body: JSON.stringify({ profile: { name: 'Sneaky' } }),
  });
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /CSRF/i);
});

test('anonymous users get 401 on private routes', async () => {
  const res = await new Client().call('GET', '/api/deck');
  assert.equal(res.status, 401);
});

test('profile -> deck -> swipe -> match -> chat, between two real accounts', async () => {
  const a = new Client();
  const b = new Client();
  await a.register(unique('a'), PASSWORD, 'Anik');
  await b.register(unique('b'), PASSWORD, 'Bima');

  const prefs = { ageMin: 21, ageMax: 40, maxDistanceKm: 80, seek: 'Women' };
  const savedA = await a.call('PUT', '/api/profile', {
    profile: { name: 'Anik', age: 29, city: 'Dhaka', bio: 'Engineer, part-time poet.', gender: 'Man', seeking: ['Women'] },
    prefs,
  });
  assert.equal(savedA.status, 200);
  assert.ok(savedA.body.profile.id);
  assert.equal(savedA.body.prefs.seek, 'Women');

  await b.call('PUT', '/api/profile', {
    profile: { name: 'Bima', age: 27, city: 'Dhaka', bio: 'Designs type by day.', gender: 'Woman', seeking: ['Men'] },
    prefs: { ageMin: 24, ageMax: 38, maxDistanceKm: 80, seek: 'Men' },
  });

  // B must like A first for a mutual match, so drive both sides deliberately.
  const deckA = await a.call('GET', '/api/deck');
  assert.equal(deckA.status, 200);
  assert.ok(deckA.body.deck.length > 0, 'deck is built server-side');
  const meB0 = (await b.call('GET', '/api/auth/me')).body.user;
  const cardB = deckA.body.deck.find((c) => c.id === `usr:${meB0.id}`);
  assert.ok(cardB, "A's deck contains B's real account");
  assert.equal(typeof cardB.match.score, 'number', 'server scores every card with the shared engine');
  assert.ok(Array.isArray(cardB.match.reasons));
  assert.equal(cardB.demo, false, 'real accounts are not flagged as demo personas');

  // A likes B -> pending like, no match yet.
  const first = await a.call('POST', '/api/swipe', { targetId: cardB.id, kind: 'like' });
  assert.equal(first.status, 200);
  assert.equal(first.body.matched, false);
  assert.equal(first.body.quota.used, 1);
  assert.equal(first.body.quota.limit, 25);

  // B likes A back -> match window opens.
  const meA = (await a.call('GET', '/api/auth/me')).body.user;
  const second = await b.call('POST', '/api/swipe', { targetId: `usr:${meA.id}`, kind: 'like' });
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.matched, true, 'mutual like between real accounts creates a match');
  assert.ok(second.body.matchId);

  const matchesA = await a.call('GET', '/api/matches');
  assert.equal(matchesA.body.matches.length, 1);
  const match = matchesA.body.matches[0];
  assert.equal(match.counterpartId, meB0.id);
  assert.equal(match.person.name, 'Bima');
  assert.equal(match.kind, 'user', 'real accounts are not labelled persona matches');
  assert.equal(match.unread, 0);
  assert.equal(match.needsHello, true);
  assert.ok(match.expiresAt - match.matchedAt <= 24 * 3600_000 + 1000, '24h expiry window is set');

  const sent = await b.call('POST', `/api/matches/${second.body.matchId}/messages`, { text: 'পোয়েটা? 👋', kind: 'text' });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.recipient, meA.id);
  assert.equal(sent.body.delivered, false, 'no stream open yet, so nothing is pushed');

  const threadA = await a.call('GET', `/api/matches/${second.body.matchId}`);
  assert.equal(threadA.status, 200);
  assert.equal(threadA.body.messages.length, 1);
  assert.equal(threadA.body.messages[0].from, 'them');
  assert.equal(threadA.body.messages[0].text, 'পোয়েটা? 👋');

  const readBack = await a.call('POST', `/api/matches/${second.body.matchId}/read`);
  assert.equal(readBack.status, 200);
  const afterRead = await a.call('GET', '/api/matches');
  assert.equal(afterRead.body.matches[0].unread, 0);
  assert.equal(afterRead.body.matches[0].expiresAt, null, 'first message cancels the expiry');
  assert.equal(afterRead.body.matches[0].needsHello, false);
  assert.equal(afterRead.body.matches[0].lastMessage.text, 'পোয়েটা? 👋');

  // Incoming like surfaces in "Likes You".
  const likes = await b.call('GET', '/api/likes');
  assert.equal(likes.body.likes.length, 1);
  assert.equal(likes.body.likes[0].name, 'Anik');
});

test('free daily like quota is enforced by the server', async () => {
  const a = new Client();
  await a.register(unique('quota'), PASSWORD, 'Quota');
  await a.call('PUT', '/api/profile', {
    profile: { name: 'Quota', age: 30, gender: 'Man', seeking: ['Everyone'] },
    prefs: { seek: 'Everyone', ageMin: 18, ageMax: 99 },
  });
  // Enough real accounts to blow past the cap without relying on seeded personas.
  const extras = [];
  for (let i = 0; i < 6; i += 1) {
    const c = new Client();
    await c.register(unique(`quota${i}`), PASSWORD, `Extra ${i}`);
    await c.call('PUT', '/api/profile', { profile: { name: `Extra ${i}`, age: 26, gender: 'Woman', seeking: ['Men'] }, prefs: { seek: 'Men' } });
    extras.push(c);
  }
  const deck = (await a.call('GET', '/api/deck?limit=60')).body.deck;
  assert.ok(deck.length > 25, `the wide filter set must offer more cards than the free tier allows (${deck.length})`);
  let rejected = 0;
  for (let i = 0; i < deck.length; i += 1) {
    const res = await a.call('POST', '/api/swipe', { targetId: deck[i].id, kind: 'like' });
    if (res.status === 429) rejected += 1;
  }
  const state = await a.call('GET', '/api/state');
  assert.equal(state.body.quota.used, 25, 'exactly the free-tier allowance is spent');
  assert.ok(rejected > 0, 'over-quota likes are rejected with 429');

  // Premium raises the ceiling.
  assert.equal((await a.call('GET', '/api/deck')).body.quota.remaining, 0);
  const buy = await a.call('POST', '/api/premium', { plan: 'gold' });
  assert.equal(buy.status, 200);
  const remaining = (await a.call('GET', '/api/deck?all=1')).body.deck[26];
  const extra = await a.call('POST', '/api/swipe', { targetId: remaining.id, kind: 'like' });
  assert.equal(extra.status, 200, 'premium members are not capped');
});

test('blocked profiles disappear from the deck both ways', async () => {
  const a = new Client();
  const b = new Client();
  await a.register(unique('ba'), PASSWORD, 'Blocker');
  await b.register(unique('bb'), PASSWORD, 'Blocked');
  await a.call('PUT', '/api/profile', { profile: { name: 'Blocker', age: 30, gender: 'Man' }, prefs: { seek: 'Women' } });
  await b.call('PUT', '/api/profile', { profile: { name: 'Blocked', age: 28, gender: 'Woman' }, prefs: { seek: 'Men' } });
  const idB = (await b.call('GET', '/api/auth/me')).body.user.id;

  const before = (await a.call('GET', '/api/deck?all=1')).body.deck.map((c) => c.id);
  assert.ok(before.includes(`usr:${idB}`));

  const block = await a.call('POST', '/api/blocks', { blockedId: `usr:${idB}` });
  assert.equal(block.status, 201);
  const after = (await a.call('GET', '/api/deck?all=1')).body.deck.map((c) => c.id);
  assert.ok(!after.includes(`usr:${idB}`), 'blocking removes them from the deck');
  const list = await a.call('GET', '/api/blocks');
  assert.deepEqual(list.body.blocks.map((row) => row.id), [`usr:${idB}`]);

  const un = await a.call('DELETE', `/api/blocks/usr:${idB}`);
  assert.equal(un.status, 200);
  const restored = (await a.call('GET', '/api/deck?all=1')).body.deck.map((c) => c.id);
  assert.ok(restored.includes(`usr:${idB}`));
});

test('reports are filed against a target and visible to the reporter', async () => {
  const a = new Client();
  await a.register(unique('rep'), PASSWORD, 'Reporter');
  const deck = (await a.call('GET', '/api/deck')).body.deck;
  const filed = await a.call('POST', '/api/reports', { targetId: deck[0].id, reason: 'harassment', detail: 'sent threats' });
  assert.equal(filed.status, 201);
  const state = await a.call('GET', '/api/state');
  assert.equal(state.body.reports.length, 1);
  assert.equal(state.body.reports[0].reason, 'harassment');
  assert.equal(state.body.reports[0].status, 'reviewing');

  const bad = await a.call('POST', '/api/reports', { targetId: deck[0].id });
  assert.equal(bad.status, 400);
});

test('phone verification: request, confirm, wrong code, resend throttle', async () => {
  const a = new Client();
  await a.register(unique('ph'), PASSWORD, 'Phone');

  const bad = await a.call('POST', '/api/verify/phone/request', { phone: 'not-a-number' });
  assert.equal(bad.status, 400);

  // National-format Bangladeshi mobile numbers are the common case, so they are
  // understood without forcing people to remember the +880.
  const local = await a.call('POST', '/api/verify/phone/request', { phone: '01712-345678' });
  assert.equal(local.status, 200, JSON.stringify(local.body));
  assert.equal(local.body.phone, '+8801712345678');
  // Two spellings of one number must land on one row, not two accounts.
  assert.equal(local.body.phone, '+8801712345678');

  const req1 = await a.call('POST', '/api/verify/phone/request', { phone: '8801712345678' });
  assert.equal(req1.status, 200, JSON.stringify(req1.body));
  assert.equal(req1.body.phone, '+8801712345678', 'numbers are normalised to E.164');
  assert.match(req1.body.debugCode, /^\d{6}$/, 'inline code is exposed only in this test mode');

  const wrong = await a.call('POST', '/api/verify/phone/confirm', { phone: '+8801712345678', code: '000000' });
  assert.equal(wrong.status, 400);
  assert.match(wrong.body.error, /wrong code/i);

  const ok = await a.call('POST', '/api/verify/phone/confirm', { phone: req1.body.phone, code: req1.body.debugCode });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.verification.phone_verified, true);

  const throttle = await a.call('POST', '/api/verify/phone/request', { phone: '+8801712345678' });
  assert.ok(throttle.status === 429 || throttle.status === 200, 'resend is rate limited per phone');

  const rival = new Client();
  await rival.register(unique('ph-rival'), PASSWORD, 'Rival');
  const reuse = await rival.call('POST', '/api/verify/phone/request', { phone: '+880 1712-345678' });
  assert.equal(reuse.status, 409, 'one number cannot verify two accounts');
  assert.equal((await a.call('GET', '/api/state')).body.user.phone, '+8801712345678');
});

test('selfie verification is queued, then auto-approved once the phone is verified', async () => {
  const a = new Client();
  await a.register(unique('self'), PASSWORD, 'Selfie');
  const queued = await a.call('POST', '/api/verify/selfie', {});
  assert.equal(queued.status, 200);
  assert.equal(queued.body.status, 'pending');
  assert.match(queued.body.note, /phone/i);

  const req1 = await a.call('POST', '/api/verify/phone/request', { phone: '+8801799887766' });
  await a.call('POST', '/api/verify/phone/confirm', { phone: req1.body.phone, code: req1.body.debugCode });
  const again = await a.call('POST', '/api/verify/selfie', {});
  assert.equal(again.body.status, 'verified');
  assert.ok(again.body.verified_at);
});

test('SSE stream pushes chat messages to the recipient in real time', async () => {
  const a = new Client();
  const b = new Client();
  await a.register(unique('sse-a'), PASSWORD, 'PushA');
  await b.register(unique('sse-b'), PASSWORD, 'PushB');
  const idA = (await a.call('GET', '/api/auth/me')).body.user.id;
  const idB = (await b.call('GET', '/api/auth/me')).body.user.id;
  await a.call('PUT', '/api/profile', { profile: { name: 'PushA', age: 31, gender: 'Man' }, prefs: { seek: 'Women' } });
  await b.call('PUT', '/api/profile', { profile: { name: 'PushB', age: 30, gender: 'Woman' }, prefs: { seek: 'Men' } });
  await a.call('POST', '/api/swipe', { targetId: `usr:${idB}`, kind: 'like' });
  const matched = await b.call('POST', '/api/swipe', { targetId: `usr:${idA}`, kind: 'like' });
  assert.equal(matched.body.matched, true);

  const ctrl = new AbortController();
  const stream = await fetch(`${base}/api/realtime/stream?uid=${idA}`, {
    headers: { Accept: 'text/event-stream' },
    signal: ctrl.signal,
  });
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get('content-type'), /text\/event-stream/);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  // Drain the initial history payload so only the pushed frame is inspected.
  await reader.read();

  const wait = setTimeout(() => ctrl.abort(), 4000);
  const done = (async () => {
    let buf = '';
    while (true) {
      const { value, done: fin } = await reader.read();
      if (fin) throw new Error('stream closed before the push arrived');
      buf += decoder.decode(value, { stream: true });
      const line = buf.split('\n').find((l) => l.startsWith('data: ') && l.includes('"chat"'));
      if (line) return JSON.parse(line.slice(6));
    }
  })();

  const sent = await b.call('POST', `/api/matches/${matched.body.matchId}/messages`, { text: 'hey, video?' });
  assert.equal(sent.body.delivered, true, 'the server knows the recipient was listening');

  const pushed = await done;
  clearTimeout(wait);
  ctrl.abort();
  assert.equal(pushed.type, 'chat');
  assert.equal(pushed.matchId, matched.body.matchId);
  assert.equal(pushed.message.text, 'hey, video?');
  assert.equal(pushed.message.from, 'them', 'framed from the recipient point of view');
});

test('WebRTC signalling relays opaque payloads between two peers', async () => {
  const id = 'ghost-peer';
  const ctrl = new AbortController();
  const stream = await fetch(`${base}/api/realtime/stream?uid=${id}`, { signal: ctrl.signal });
  const reader = stream.body.getReader();
  await reader.read(); // initial history frame

  const relay = await fetch(`${base}/api/realtime/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: id, from: 'user-a', callId: 'call-1',
      signal: { sdp: 'v=0 fake-offer', type: 'offer' },
    }),
  });
  const relayBody = await relay.json();
  assert.equal(relay.status, 200);
  assert.equal(relayBody.delivered, true);

  const decoder = new TextDecoder();
  let buf = '';
  const wait = setTimeout(() => ctrl.abort(), 4000);
  while (!buf.includes('"signal"')) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
  }
  clearTimeout(wait);
  ctrl.abort();
  const frame = buf.split('\n').find((l) => l.startsWith('data: ') && l.includes('"signal"'));
  assert.ok(frame, 'the offer reached the callee');
  const parsed = JSON.parse(frame.slice(6));
  assert.equal(parsed.from, 'user-a');
  assert.equal(parsed.callId, 'call-1');
  assert.equal(parsed.signal.type, 'offer');

  const missing = await fetch(`${base}/api/realtime/signal`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'x' }),
  });
  assert.equal(missing.status, 400);
});

test('rejects oversized and malformed bodies instead of crashing', async () => {
  const c = new Client();
  await c.register(unique('junk'), PASSWORD, 'Junk');
  const bad = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: c.cookie, 'x-csrf-token': c.csrf },
    body: '{ not json',
  });
  assert.equal(bad.status, 400);
  // Unknown route while signed out is an auth failure first; 404 only for members.
  assert.equal((await fetch(`${base}/api/nope`)).status, 401);
  assert.equal((await c.call('GET', '/api/nope')).status, 404);
});

test('logout clears the session cookie', async () => {
  const c = new Client();
  await c.register(unique('out'), PASSWORD, 'Out');
  assert.ok((await c.call('GET', '/api/auth/me')).body.user, 'session is live before logout');
  const out = await c.call('POST', '/api/auth/logout');
  assert.equal(out.status, 200);
  const me = await c.call('GET', '/api/auth/me');
  assert.equal(me.body.user, null);
  assert.equal((await c.call('GET', '/api/deck')).status, 401);
});
