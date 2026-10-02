/**
 * serverSync — the bridge between the browser store and the Romancha backend.
 *
 * The UI keeps reading and writing `datingStore` (synchronously, so nothing
 * stutters), and every mutation is mirrored to the API in the background. On boot
 * we hydrate from `/api/state` so a match made on a phone shows up on the laptop.
 *
 * If there is no API (a static build on GitHub Pages, `file://`, an old preview),
 * `mode` becomes 'local' and the whole module turns into a no-op — the app still
 * works exactly as it did before, just without cross-device sync.
 */
import { api, getMode, setMode } from './apiClient.js';
import { realtimeHub } from './realtimeHub.js';

const NOOP = { ok: true, ignored: true };

/** profileId (client) <-> server match/card identifiers */
export const cardIdFor = (userId) => (String(userId).startsWith('usr:') ? userId : `usr:${userId}`);

class ServerSync {
  constructor() {
    this.mode = null; // 'server' | 'local'
    this.user = null;
    this.csrf = '';
    this.error = null;
    this.store = null;
    this.unsubscribers = [];
    this.matchIds = new Map(); // profileId -> server match id (needed for REST paths)
    this.pending = new Set();
    this.listeners = new Set();
  }

  isLive() {
    return this.mode === 'server' && Boolean(this.user);
  }

  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit() {
    this.listeners.forEach((cb) => { try { cb({ mode: this.mode, user: this.user, error: this.error }); } catch { /* listener */ } });
  }

  /** Ask the server who we are. Called once on boot and after every sign-in. */
  async detect() {
    const health = await api.quiet('GET', '/api/health');
    if (health?.error || health?.mode !== 'server') {
      this.mode = 'local';
      setMode('local');
      this.emit();
      return { mode: 'local', user: null };
    }
    const me = await api.quiet('GET', '/api/auth/me');
    this.mode = 'server';
    setMode('server');
    this.user = me?.user || null;
    this.csrf = me?.csrf || '';
    this.emit();
    return { mode: this.mode, user: this.user };
  }

  /**
   * Wire the dating store to the backend: hydrate, then keep both in step.
   * Safe to call twice (login, tab resume).
   */
  async bootstrap(store) {
    this.store = store;
    await this.detect();
    if (this.mode !== 'server') return { mode: 'local' };
    if (this.user) await this.hydrate();
    this.listenToRealtime();
    return { mode: this.mode, user: this.user };
  }

  async hydrate() {
    if (this.mode !== 'server' || !this.store) return NOOP;
    try {
      // /api/state is the account snapshot; the deck is fetched separately so the
      // client can rebuild cards (and real profiles) with its own filters.
      const [state, likes, deck] = await Promise.all([
        api.get('/api/state'),
        api.quiet('GET', '/api/likes').catch(() => ({ likes: [] })),
        api.quiet('GET', '/api/deck?limit=80&all=1').catch(() => ({ deck: [] })),
      ]);
      this.applyState(state, likes?.likes || [], deck?.deck || []);
      return state;
    } catch (err) {
      this.error = err.message;
      return { error: err.message };
    }
  }

  /** Map the server snapshot onto the client state. */
  applyState(state, incomingLikes = [], deckCards = []) {
    const store = this.store;
    if (!store || !state) return;
    const serverPrefs = state.prefs || {};
    const matches = (state.matches || []).map((m) => {
      const profileId = m.personaId || cardIdFor(m.counterpartId);
      this.matchIds.set(profileId, m.id);
      return {
        profileId,
        serverId: m.id,
        matchedAt: m.matchedAt,
        expiresAt: m.expiresAt,
        initiatedBy: 'you',
        person: m.person,
        unread: m.unread || 0,
        lastMessage: m.lastMessage ? { ...m.lastMessage, from: m.lastMessage.from === 'me' ? 'me' : 'them' } : null,
      };
    });

    const conversations = {};
    for (const m of matches) {
      conversations[m.profileId] = {
        messages: m.lastMessage ? [m.lastMessage] : [],
        unread: 0,
      };
    }

    this.matchIds.clear();
    for (const m of matches) this.matchIds.set(m.profileId, m.serverId);

    store.applyServerSnapshot({
      serverMode: true,
      profile: { ...(state.profile || {}), id: state.user?.id || 'me' },
      prefs: {
        ...serverPrefs,
        distanceKm: serverPrefs.maxDistanceKm ?? serverPrefs.distanceKm ?? 500,
      },
      decisions: state.decisions || {},
      matches,
      conversations,
      blocked: (state.blocks || []).map((b) => b.id),
      reported: (state.reports || []).map((r) => ({ profileId: r.targetId, reason: r.reason, detail: r.detail, at: r.at, status: r.status })),
      verification: {
        status: state.verification?.status || 'none',
        at: state.verification?.verifiedAt || null,
        phoneVerified: Boolean(state.verification?.phoneVerified),
        phoneVerifiedAt: state.verification?.phoneVerifiedAt || null,
      },
      quota: { day: new Date().toISOString().slice(0, 10), likes: state.quota?.used ?? 0, limit: state.quota?.limit ?? null },
      premium: state.premium ? { plan: state.premium, since: Date.now() } : null,
      // Entitlements the server owns: which plan is live, and how much of today's
      // video-call allowance is left. The UI renders these; it never decides them.
      plan: state.plan || null,
      calls: state.calls || null,
      storageBytes: state.storageBytes ?? 0,
      myAds: state.myAds || [],
      call: { ...(store.getState().call || {}), secondsLeft: state.calls?.secondsLeft ?? null, resetsAt: state.calls?.resetsAt ?? null },
      incomingLikes,
      people: this.collectPeople([...deckCards, ...incomingLikes, ...matches.map((m) => m.person).filter(Boolean)], matches),
    });
    this.emit();
  }

  /** Every profile object the server handed us, indexed by client card id. */
  collectPeople(cards, matches) {
    const people = {};
    const put = (p) => {
      if (!p?.id) return;
      const copy = { ...p };
      delete copy.match; // server scoring detail, rebuilt locally by buildDeck
      people[p.id] = { ...people[p.id], ...copy };
    };
    for (const c of cards) put(c);
    for (const m of matches) put(m.person ? { ...m.person, id: m.profileId } : null);
    return people;
  }

  listenToRealtime() {
    if (this.unsubscribers.length) return;
    const offDomain = realtimeHub.onDomain((payload) => this.handlePush(payload));
    const offAuth = this.onChange(() => {});
    this.unsubscribers = [
      () => { try { offDomain(); } catch { /* already off */ } },
      () => { try { offAuth(); } catch { /* already off */ } },
    ];
  }

  handlePush(payload) {
    const store = this.store;
    if (!store || !payload?.type) return;
    if (payload.type === 'chat' && payload.matchId) {
      const profileId = this.profileIdForMatch(payload.matchId);
      if (!profileId) return;
      store.receiveRemoteMessage(profileId, payload.message);
    } else if (payload.type === 'match' && payload.matchId) {
      store.noteServerEvent({ text: 'Someone liked you back — a match just landed from another device.', at: Date.now() });
      this.hydrate();
    }
  }

  profileIdForMatch(matchId) {
    for (const [profileId, id] of this.matchIds) if (id === matchId) return profileId;
    return null;
  }

  matchIdFor(profileId) {
    return this.matchIds.get(profileId) || null;
  }

  /** Fire-and-forget mutation with one retry; never blocks or rejects. */
  async push(method, path, body, { label = path } = {}) {
    if (this.mode !== 'server') return NOOP;
    this.pending.add(label);
    try {
      const out = await api.quiet(method, path, body);
      if (out?.error) this.error = out.error;
      return out;
    } catch (err) {
      this.error = err?.message || 'network error';
      return { error: this.error };
    } finally {
      this.pending.delete(label);
      this.emit();
    }
  }

  // -------------------------------------------------------------- mutations
  swipe(targetId, kind) {
    return this.push('POST', '/api/swipe', { targetId, kind }, { label: `swipe:${targetId}` });
  }

  undo(targetId) {
    return this.push('POST', '/api/undo', { targetId }, { label: 'undo' });
  }

  saveProfile(profile, prefs) {
    return this.push('PUT', '/api/profile', {
      profile,
      prefs: { ...prefs, maxDistanceKm: prefs?.distanceKm ?? prefs?.maxDistanceKm ?? 500 },
    }, { label: 'profile' });
  }

  message(profileId, text, kind = 'text', extra = {}) {
    const matchId = this.matchIdFor(profileId);
    if (!matchId) return Promise.resolve({ error: 'match not on server', skipped: true });
    return this.push('POST', `/api/matches/${matchId}/messages`, {
      text, kind, mediaUrl: extra.mediaUrl || null, durationMs: extra.durationMs || 0,
    }, { label: `msg:${matchId}` });
  }

  /** The server match id for a card, so media uploads can reference the thread. */
  rememberMatch(profileId, matchId) {
    if (profileId && matchId) this.matchIds.set(profileId, matchId);
  }

  // ------------------------------------------------------------- call minutes
  async callState() {
    if (this.mode !== 'server') return { mode: 'local' };
    return api.quiet('GET', '/api/calls/state');
  }

  async startCall(matchId) {
    if (this.mode !== 'server') return { ok: true, local: true };
    return api.quiet('POST', '/api/calls/start', { matchId });
  }

  heartbeatCall(sessionId) {
    if (this.mode !== 'server' || !sessionId) return Promise.resolve({ ok: false });
    return api.quiet('POST', '/api/calls/heartbeat', { sessionId });
  }

  endCall(sessionId) {
    if (this.mode !== 'server' || !sessionId) return Promise.resolve({ ok: false });
    return api.quiet('POST', '/api/calls/end', { sessionId });
  }

  plans() {
    return api.quiet('GET', '/api/plans');
  }

  // ------------------------------------------------------------------ media
  uploads() {
    return api.quiet('GET', '/api/uploads');
  }

  deleteUpload(id) {
    return this.push('DELETE', `/api/uploads/${encodeURIComponent(id)}`, null, { label: `upload:${id}` });
  }

  deleteAllUploads() {
    return this.push('DELETE', '/api/uploads', null, { label: 'uploads:all' });
  }

  ads(placement = 'banner') {
    return api.quiet('GET', `/api/ads?placement=${encodeURIComponent(placement)}`);
  }

  adPing(id, kind) {
    return api.quiet('POST', `/api/ads/${encodeURIComponent(id)}/ping`, { kind });
  }

  createAd(campaign) {
    return this.push('POST', '/api/ads', campaign, { label: 'ad-create' });
  }

  myAds() {
    return api.quiet('GET', '/api/ads/mine');
  }

  googleConfig() {
    return api.quiet('GET', '/api/auth/google/config');
  }

  async googleSignIn(credential) {
    const out = await api.quiet('POST', '/api/auth/google', { credential });
    if (out?.error) return { success: false, error: out.error, status: out.status };
    this.csrf = out.csrf || this.csrf;
    this.user = out.user || null;
    realtimeHub.setUser(this.user);
    if (this.user) await this.hydrate();
    this.emit();
    return { success: true, account: this.user, server: true };
  }

  markRead(profileId) {
    const matchId = this.matchIdFor(profileId);
    if (!matchId) return Promise.resolve(NOOP);
    return this.push('POST', `/api/matches/${matchId}/read`, {}, { label: 'read' });
  }

  block(targetId) {
    return this.push('POST', '/api/blocks', { blockedId: targetId }, { label: 'block' });
  }

  unblock(targetId) {
    return this.push('DELETE', `/api/blocks/${encodeURIComponent(targetId)}`, undefined, { label: 'unblock' });
  }

  report({ targetId, reason, detail }) {
    return this.push('POST', '/api/reports', { targetId, reason, detail }, { label: 'report' });
  }

  verifySelfie() {
    return this.push('POST', '/api/verify/selfie', {}, { label: 'selfie' });
  }

  requestPhoneOtp(phone) {
    return this.push('POST', '/api/verify/phone/request', { phone }, { label: 'otp-request' });
  }

  confirmPhoneOtp(phone, code) {
    return this.push('POST', '/api/verify/phone/confirm', { phone, code }, { label: 'otp-confirm' });
  }

  setPremium(plan) {
    return this.push('POST', '/api/premium', { plan }, { label: 'premium' }).then(async (out) => {
      await this.hydrate();
      return out;
    });
  }

  likes() {
    return api.quiet('GET', '/api/likes');
  }

  // ------------------------------------------------------------------- auth
  async register({ email, password, displayName }) {
    const out = await api.quiet('POST', '/api/auth/register', { email, password, displayName });
    if (out?.error) return { success: false, error: out.error, status: out.status };
    this.csrf = out.csrf || this.csrf;
    this.user = out.user || null;
    realtimeHub.setUser(this.user);
    if (this.user) await this.hydrate();
    this.emit();
    return { success: true, account: this.user, server: true };
  }

  async login({ email, password }) {
    const out = await api.quiet('POST', '/api/auth/login', { email, password });
    if (out?.error) return { success: false, error: out.error, status: out.status };
    this.csrf = out.csrf || this.csrf;
    this.user = out.user || null;
    realtimeHub.setUser(this.user);
    if (this.user) await this.hydrate();
    this.emit();
    return { success: true, account: this.user, server: true };
  }

  async logout() {
    const out = await api.quiet('POST', '/api/auth/logout', {});
    this.user = null;
    this.matchIds.clear();
    this.store?.applyServerSnapshot?.({ serverMode: this.mode === 'server', incomingLikes: [] });
    this.emit();
    return out;
  }

  status() {
    return { mode: this.mode || getMode(), user: this.user, error: this.error, busy: this.pending.size };
  }
}

export const serverSync = new ServerSync();
