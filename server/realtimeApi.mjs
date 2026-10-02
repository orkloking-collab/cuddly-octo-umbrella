/**
 * Romancha realtime hub — shared by the Vite dev server and the prod server.
 *
 * It used to live inside vite.config.js, which meant the "backend" only existed
 * during `npm run dev`: a production build served the SPA and every /api/realtime/*
 * call 404'd (returning index.html). Same handler, two hosts, no drift.
 *
 * Storage is intentionally in-memory (Map/array) — this is a demo of the protocol,
 * not a chat platform. Swap these four collections for a DB and nothing else changes.
 */

export function createRealtimeStore({ maxHistory = 250, maxFeed = 60, presenceTimeoutMs = 35_000 } = {}) {
  const clients = new Set();
  /** userId -> Set<res>. Populated from the stream query (`?uid=`) so we can
   *  push a DM or a WebRTC offer to exactly one person, not to the whole room. */
  const byUser = new Map();
  const uidOf = new Map();

  const attachUser = (res, uid) => {
    if (!uid) return;
    uidOf.set(res, uid);
    if (!byUser.has(uid)) byUser.set(uid, new Set());
    byUser.get(uid).add(res);
  };
  const detachUser = (res) => {
    const uid = uidOf.get(res);
    if (!uid) return;
    byUser.get(uid)?.delete(res);
    if (!byUser.get(uid)?.size) byUser.delete(uid);
    uidOf.delete(res);
  };
  const sendTo = (uid, obj) => {
    const set = byUser.get(uid);
    if (!set?.size) return false;
    const frame = `data: ${JSON.stringify(obj)}\n\n`;
    for (const res of set) {
      try { res.write(frame); } catch { set.delete(res); }
    }
    return true;
  };
  const messageHistory = [];
  const liveStories = [];
  const liveReels = [];
  const liveFeedbacks = [];
  const livePhotoStories = [];
  const liveUserProfiles = new Map();
  const onlineLiveMembers = new Map();

  const broadcast = (obj) => {
    const frame = `data: ${JSON.stringify(obj)}\n\n`;
    for (const res of clients) {
      try {
        res.write(frame);
      } catch {
        clients.delete(res);
      }
    }
  };

  const initialPayload = () => ({
    type: 'history',
    messages: messageHistory.slice(-60),
    stories: liveStories,
    reels: liveReels,
    feedbacks: liveFeedbacks,
    photoStories: livePhotoStories,
    userProfiles: Array.from(liveUserProfiles.values()),
    onlineMembers: Array.from(onlineLiveMembers.values()),
  });

  const unshiftCapped = (arr, item, cap = maxFeed) => {
    arr.unshift(item);
    while (arr.length > cap) arr.pop();
  };

  const pushCapped = (arr, item, cap = maxHistory) => {
    arr.push(item);
    while (arr.length > cap) arr.shift();
  };

  const prunePresence = () => {
    const now = Date.now();
    for (const [id, member] of onlineLiveMembers) {
      if (now - member.lastSeen > presenceTimeoutMs) onlineLiveMembers.delete(id);
    }
  };

  const handlers = {
    stream(req, res) {
      const uid = new URL(req.url || '/api/realtime/stream', 'http://x').searchParams.get('uid');
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      });
      res.write(': open\n\n');
      clients.add(res);
      attachUser(res, uid);
      res.write(`data: ${JSON.stringify(initialPayload())}\n\n`);
      req.on('close', () => {
        clients.delete(res);
        detachUser(res);
      });
    },

    /**
     * WebRTC / DM signalling: relay an SDP offer, answer or ICE candidate to one
     * user. The server never sees media — only the opaque signal blobs two peers
     * exchange, and it is not persisted to history.
     */
    signal(req, res) {
      readJson(req)
        .then((payload) => {
          const to = String(payload.to || '');
          if (!to) return json(res, 400, { error: 'missing "to"' });
          const delivered = sendTo(to, {
            type: 'signal',
            from: String(payload.from || ''),
            signal: payload.signal || null,
            callId: payload.callId || null,
            at: Date.now(),
          });
          json(res, 200, { success: true, delivered });
        })
        .catch((err) => json(res, 400, { error: err.message }));
    },

    publish(req, res) {
      readJson(req)
        .then((payload) => {
          const eventType = payload.type || 'message';

          if (eventType === 'message') {
            const newMsg = {
              id: payload.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              channel: payload.channel || 'public',
              recipientId: payload.recipientId || null,
              sender: payload.sender || 'Anonymous',
              senderId: payload.senderId || 'anon',
              senderGender: payload.senderGender || 'Female',
              senderCountry: payload.senderCountry || 'Bangladesh',
              senderCountryFlag: payload.senderCountryFlag || '🇧🇩',
              avatar: typeof payload.avatar === 'string' && payload.avatar.length < 500_000 ? payload.avatar : '',
              time: payload.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: String(payload.text || '').slice(0, 4000),
              media: payload.media || null,
              createdAt: Date.now(),
            };
            pushCapped(messageHistory, newMsg);
            broadcast({ type: 'message', message: newMsg });
            return json(res, 200, { success: true, message: newMsg });
          }

          if (eventType === 'story') {
            const newStory = payload.story || payload;
            unshiftCapped(liveStories, newStory);
            broadcast({ type: 'story', story: newStory });
            return json(res, 200, { success: true, story: newStory });
          }

          if (eventType === 'reel') {
            const newReel = payload.reel || payload;
            unshiftCapped(liveReels, newReel);
            broadcast({ type: 'reel', reel: newReel });
            return json(res, 200, { success: true, reel: newReel });
          }

          if (eventType === 'photo_story') {
            const item = payload.photo_story || payload;
            unshiftCapped(livePhotoStories, item);
            broadcast({ type: 'photo_story', photoStory: item });
            return json(res, 200, { success: true, photoStory: item });
          }

          if (eventType === 'profile_update') {
            const updatedProfile = payload.profile || payload;
            const key = (updatedProfile.name || updatedProfile.id || updatedProfile.email || '').toLowerCase();
            if (key) liveUserProfiles.set(key, updatedProfile);
            broadcast({ type: 'profile_update', profile: updatedProfile });
            return json(res, 200, { success: true, profile: updatedProfile });
          }

          if (eventType === 'feedback') {
            const item = payload.feedback || payload;
            unshiftCapped(liveFeedbacks, item);
            broadcast({ type: 'feedback', feedback: item });
            return json(res, 200, { success: true, feedback: item });
          }

          if (eventType === 'gift') {
            const giftData = payload.gift || payload;
            broadcast({ type: 'gift', gift: giftData });
            return json(res, 200, { success: true, gift: giftData });
          }

          return json(res, 400, { error: `Unsupported event type: ${eventType}` });
        })
        .catch((err) => json(res, 400, { error: err.message }));
    },

    presence(req, res) {
      readJson(req)
        .then((user) => {
          if (user && user.id) {
            onlineLiveMembers.set(user.id, { ...user, lastSeen: Date.now() });
            prunePresence();
            broadcast({ type: 'presence', onlineMembers: Array.from(onlineLiveMembers.values()) });
          }
          json(res, 200, { success: true, online: onlineLiveMembers.size });
        })
        .catch(() => json(res, 400, { error: 'bad json' }));
    },

    health(_req, res) {
      json(res, 200, {
        ok: true,
        clients: clients.size,
        messages: messageHistory.length,
        stories: liveStories.length,
        online: onlineLiveMembers.size,
        uptimeSec: Math.round(process.uptime()),
      });
    },
  };

  return {
    handlers,
    sendTo,
    onlineUsers: () => Array.from(byUser.keys()),
    store: { messageHistory, liveStories, onlineLiveMembers },
  };
}

/** Wrap the handlers as connect-style middleware for `vite configureServer`. */
export function attachRealtime(server) {
  const { handlers } = createRealtimeStore();
  const route = (path, handler) => server.middlewares.use(path, handler);
  route('/api/realtime/stream', handlers.stream);
  route('/api/realtime/publish', requireMethod('POST', handlers.publish));
  route('/api/realtime/presence', requireMethod('POST', handlers.presence));
  route('/api/realtime/signal', requireMethod('POST', handlers.signal));
  route('/api/realtime/health', handlers.health);
  return { handlers };
}

function requireMethod(method, handler) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }
    if (req.method !== method) {
      res.writeHead(405, { Allow: method });
      res.end();
      return;
    }
    handler(req, res, next);
  };
}

function readJson(req, limitBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
