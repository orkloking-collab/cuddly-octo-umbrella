/**
 * DatingStore — the single source of truth for the dating half of Romancha.
 *
 * Why it exists: the app previously scattered everything across raw
 * `localStorage.setItem` calls inside components, with no schema, no migration,
 * and no way to keep two tabs in sync. This module owns state, persistence,
 * cross-tab broadcast, and all dating actions (swipe, match, chat, block,
 * report, verify, premium, boost, quota) so components stay presentational.
 *
 * NOTE: this is a client-side prototype store. Real deployments must move
 * matching, chat and auth behind a server with real auth + rate limits.
 */

import { buildDeck, FREE_DAILY_LIKES, SUPER_LIKES_PER_WEEK, profileStrength, likesBack } from './matching.js';
import { datingProfiles } from '../data/datingProfiles.js';
import { serverSync } from './serverSync.js';

const STORAGE_KEY = 'romancha_dating_v1';
const CHANNEL = 'romancha_dating_sync_v1';
const MATCH_WINDOW_HOURS = 24; // matches expire if neither person says hello

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_STATE = {
  version: 1,
  onboardedAt: null,
  profile: {
    id: 'me',
    name: '',
    age: null,
    pronouns: '',
    gender: '',
    seeking: [],
    lookingFor: '',
    bio: '',
    job: '',
    city: '',
    country: 'Bangladesh',
    countryFlag: '🇧🇩',
    location: { lat: 24.3745, lng: 88.6042 }, // Rajshahi default
    interests: [],
    prompts: [],
    photos: [],
    verified: false,
    createdAt: null,
  },
  prefs: {
    ageMin: 20,
    ageMax: 45,
    distanceKm: 500,
    verifiedOnly: false,
    onlineOnly: false,
    showMe: true,
    readReceipts: true,
    allowVideoCalls: true,
    incognito: false,
    hideDistance: false,
  },
  decisions: {}, // profileId -> 'like' | 'pass' | 'super' | 'skip'
  history: [], // for undo
  matches: [], // { profileId, matchedAt, expiresAt, initiatedBy }
  conversations: {}, // profileId -> { messages: [], unread, lastTyping }
  blocked: [],
  reported: [], // { profileId, reason, at }
  superLikes: { week: '', left: SUPER_LIKES_PER_WEEK },
  quota: { day: today(), likes: 0 },
  premium: null, // { plan, since }
  boostUntil: 0,
  verification: { status: 'none', at: null }, // none | pending | verified | rejected
  visitors: [],
  activity: [],
  settings: { sound: true, safetyNudge: true },
  // Server-backed additions. `people` holds every real account the API has shown
  // us (deck cards, matches, incoming likes) so a card id like `usr:<uuid>`
  // resolves the same way a seeded persona does.
  server: { mode: 'local', user: null, error: null, busy: 0 },
  people: {},
  incomingLikes: [],
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

class DatingStore {
  constructor() {
    this.listeners = new Set();
    this.tabId = Math.random().toString(36).slice(2);
    this.state = this.load();
    this.channel = null;
    this.saveTimer = null;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL);
        this.channel.onmessage = (e) => {
          if (e.data?.type === 'state' && e.data.origin !== this.tabId) {
            this.state = { ...this.state, ...e.data.state };
            this.emit();
          }
        };
      } catch {
        this.channel = null;
      }
    }
    // Multi-tab safety: also react to storage events (covers no BroadcastChannel)
    if (typeof window !== 'undefined') {
      window.addEventListener?.('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          const next = safeParse(e.newValue);
          if (next) {
            // Server mirrors are not persisted (see save()), so carry this tab's
            // copy forward instead of letting a sibling tab blank them out.
            this.state = this.normalise({
              ...next,
              people: next.people || this.state.people,
              incomingLikes: next.incomingLikes || this.state.incomingLikes,
              server: next.server || this.state.server,
            });
            this.emit();
          }
        }
      });
    }
  }

  load() {
    if (typeof window === 'undefined') return deepClone(DEFAULT_STATE);
    const saved = safeParse(window.localStorage?.getItem?.(STORAGE_KEY));
    return this.normalise(saved ? { ...deepClone(DEFAULT_STATE), ...saved } : deepClone(DEFAULT_STATE));
  }

  /** Migrate/patch partial state so an old save can never crash the app. */
  normalise(raw) {
    const state = {
      ...deepClone(DEFAULT_STATE),
      ...raw,
      profile: { ...DEFAULT_STATE.profile, ...(raw?.profile || {}) },
      prefs: { ...DEFAULT_STATE.prefs, ...(raw?.prefs || {}) },
      settings: { ...DEFAULT_STATE.settings, ...(raw?.settings || {}) },
      superLikes: { ...DEFAULT_STATE.superLikes, ...(raw?.superLikes || {}) },
      quota: { ...DEFAULT_STATE.quota, ...(raw?.quota || {}) },
      verification: { ...DEFAULT_STATE.verification, ...(raw?.verification || {}) },
    };
    state.version = 1;
    if (state.superLikes.week !== isoWeek()) state.superLikes = { week: isoWeek(), left: SUPER_LIKES_PER_WEEK };
    if (state.quota.day !== today()) state.quota = { day: today(), likes: 0 };

    // Expired matches: if nobody said hello inside the window, the match is gone.
    // Kept if a conversation exists, because a chat you already had is history.
    const now = Date.now();
    const before = state.matches.length;
    state.matches = (state.matches || []).filter((m) => {
      if (!m.expiresAt || m.expiresAt > now) return true;
      const thread = state.conversations?.[m.profileId];
      return Boolean(thread?.messages?.length);
    });
    if (state.matches.length !== before) {
      const removed = before - state.matches.length;
      state.activity = [
        { id: `a-expiry-${now}`, text: `${removed} unmatched ${removed === 1 ? 'match expired' : 'matches expired'} after 24h of silence. Say something first next time.`, at: now },
        ...(state.activity || []),
      ].slice(0, 25);
    }
    return state;
  }

  save() {
    if (typeof window === 'undefined') return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        // `people`, `incomingLikes` and `server` are deliberately *not* persisted:
        // they are mirrors of the backend, and a stale copy would outlive profile
        // edits and make a real member look like they never changed anything.
        const persist = { ...this.state };
        delete persist.people;
        delete persist.incomingLikes;
        delete persist.server;
        window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(persist));
        this.channel?.postMessage({ type: 'state', origin: this.tabId, state: this.state });
      } catch (err) {
        console.warn('[dating] persistence unavailable (private mode?)', err?.name);
      }
    }, 120);
  }

  emit() {
    this.listeners.forEach((cb) => {
      try { cb(this.state); } catch (err) { console.error('[dating] listener error', err); }
    });
  }

  update(patch, { silent = false } = {}) {
    this.state = typeof patch === 'function' ? patch(this.state) : { ...this.state, ...patch };
    if (!silent) this.save();
    this.emit();
    return this.state;
  }

  getState() {
    return this.state;
  }

  subscribe(cb) {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  // ---------------------------------------------------------------- profile
  getProfile() {
    return this.state.profile;
  }

  updateProfile(patch) {
    const profile = { ...this.state.profile, ...patch };
    if (patch.photos) profile.photos = dedupeUrls(patch.photos).slice(0, 6);
    const next = this.update({ profile, onboardedAt: this.state.onboardedAt || Date.now() });
    this.syncProfileToServer();
    return next;
  }

  updatePrefs(patch) {
    const next = this.update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
    this.syncProfileToServer();
    return next;
  }

  /** Debounced mirror of profile + prefs; the server is the source for other devices. */
  syncProfileToServer() {
    clearTimeout(this.profileSyncTimer);
    this.profileSyncTimer = setTimeout(() => {
      const { profile, prefs } = this.state;
      serverSync.saveProfile(profile, prefs);
    }, 400);
  }

  strength() {
    return profileStrength(this.state.profile);
  }

  isOnboarded() {
    return Boolean(this.state.onboardedAt) && this.strength().score >= 45;
  }

  isPremium() {
    return Boolean(this.state.premium);
  }

  // ------------------------------------------------------- server bridge
  /** A profile by card id: real account first, then the seeded personas. */
  personById(id) {
    return this.state.people?.[id] || datingProfiles.find((p) => p.id === id) || null;
  }

  isRemoteId(id) {
    return String(id || '').startsWith('usr:');
  }

  /** Fold the backend snapshot into local state without discarding local chats. */
  applyServerSnapshot(patch) {
    const localConversations = this.state.conversations || {};
    const conversations = { ...localConversations };
    for (const [id, remote] of Object.entries(patch.conversations || {})) {
      const local = localConversations[id];
      if (!local?.messages?.length) {
        conversations[id] = remote;
        continue;
      }
      const localLast = local.messages[local.messages.length - 1];
      const remoteExtra = (remote.messages || []).filter((m) => m.ts > (localLast?.ts || 0));
      conversations[id] = {
        ...local,
        unread: remote.unread ?? local.unread ?? 0,
        messages: remoteExtra.length ? [...local.messages, ...remoteExtra] : local.messages,
      };
    }

    // Matches seen on another device must survive; ones we only know locally stay.
    const seen = new Set((patch.matches || []).map((m) => m.profileId));
    const keptLocal = (this.state.matches || []).filter((m) => !seen.has(m.profileId));
    const matches = [...(patch.matches || []), ...keptLocal];

    const server = { ...this.state.server, mode: patch.serverMode ? 'server' : 'local' };
    delete patch.serverMode;

    this.update({
      ...this.state,
      ...patch,
      conversations,
      matches,
      profile: { ...this.state.profile, ...(patch.profile || {}) },
      prefs: { ...this.state.prefs, ...(patch.prefs || {}) },
      server,
    });
  }

  noteServerEvent(event) {
    const activity = [{ id: `a-srv-${event.at}-${Math.random().toString(36).slice(2, 6)}`, ...event }, ...(this.state.activity || [])].slice(0, 25);
    this.update({ ...this.state, activity }, { silent: true });
  }

  /** A message that arrived over SSE from the backend (not the local mock). */
  receiveRemoteMessage(profileId, message) {
    if (!profileId || !message) return;
    const thread = { ...this.thread(profileId) };
    if (thread.messages.some((m) => m.id && m.id === message.id)) return;
    thread.messages = [...thread.messages, { from: 'them', kind: 'text', ...message }];
    thread.unread = (thread.unread || 0) + 1;
    const matches = this.state.matches.map((m) => (m.profileId === profileId ? { ...m, expiresAt: null } : m));
    this.update({ ...this.state, matches, conversations: { ...this.state.conversations, [profileId]: thread } });
    this.noteServerEvent({ text: `${this.personById(profileId)?.name || 'Your match'} sent you a message.`, at: Date.now() });
  }

  setServerStatus(next) {
    this.update({ ...this.state, server: { ...this.state.server, ...next } }, { silent: true });
  }

  // --------------------------------------------------------------- deck
  candidates() {
    const extras = Object.values(this.state.people || {});
    if (!extras.length) return datingProfiles;
    const byId = new Map(datingProfiles.map((p) => [p.id, p]));
    for (const p of extras) byId.set(p.id, { ...byId.get(p.id), ...p, isRealUser: String(p.id).startsWith('usr:') });
    return Array.from(byId.values());
  }

  deck(options = {}) {
    const { prefs, decisions, blocked, profile } = this.state;
    const deck = buildDeck(this.candidates(), { ...profile, prefs }, {
      blockedIds: blocked,
      reportedIds: this.state.reported.map((r) => r.profileId),
      alreadyDecided: options.includeDecided ? {} : decisions,
      prioritiseLikes: options.prioritiseLikes,
      limit: options.limit ?? 40,
    });
    return deck;
  }

  /** Everyone who liked me but I have not answered yet. */
  pendingLikes() {
    const { decisions, matches, blocked } = this.state;
    const matched = new Set(matches.map((m) => m.profileId));
    const people = this.candidates();
    const remote = (this.state.incomingLikes || []).map((p) => ({ ...p, likesMe: true }));
    const byId = new Map(people.map((p) => [p.id, p]));
    for (const p of remote) byId.set(p.id, { ...byId.get(p.id), ...p, likesMe: true });
    return Array.from(byId.values()).filter(
      (p) => p.likesMe && !decisions[p.id] && !matched.has(p.id) && !blocked.includes(p.id),
    );
  }

  // --------------------------------------------------------------- swiping
  swipe(profileId, kind = 'like') {
    const profile = this.personById(profileId);
    if (!profile) return { ok: false, reason: 'unknown-profile' };

    if (kind === 'like' && !this.canLike()) return { ok: false, reason: 'out-of-likes' };
    if (kind === 'super' && this.state.superLikes.left <= 0) return { ok: false, reason: 'no-super-likes' };

    const decided = { ...this.state.decisions, [profileId]: kind };
    const history = [...this.state.history, { profileId, kind, prevDecisions: this.state.decisions }].slice(-40);

    let quota = this.state.quota;
    if (kind === 'like' && !this.isPremium()) quota = { day: today(), likes: quota.likes + 1 };
    let superLikes = this.state.superLikes;
    if (kind === 'super') superLikes = { ...superLikes, left: superLikes.left - 1 };

    let matched = false;
    let matches = this.state.matches;
    const remote = this.isRemoteId(profileId) && serverSync.mode === 'server';
    if (kind === 'like' || kind === 'super') {
      // Real accounts decide in the database. A pending like from them is enough
      // to match instantly; otherwise the server tells us a fraction of a second
      // later and we patch the deck then (see `promise` below).
      matched = remote
        ? Boolean(profile.likesMe)
        : likesBack({ ...this.state.profile, boosting: this.isBoosting() }, { ...profile, match: { sharedInterests: sharedWith(this.state.profile, profile) } }, kind);
      if (matched && !matches.some((m) => m.profileId === profileId)) {
        const now = Date.now();
        matches = [
          { profileId, matchedAt: now, expiresAt: now + MATCH_WINDOW_HOURS * 3600_000, initiatedBy: 'you', super: kind === 'super' },
          ...matches,
        ];
        matches = this.pruneMatches(matches);
        this.ensureConversation(profileId);
      }
    }

    this.update({ ...this.state, decisions: decided, history, quota, superLikes, matches });

    if (matched) this.pushActivity(`You matched with ${profile.name} — say something better than "hey".`);

    if (remote) {
      const promise = serverSync.swipe(profileId, kind).then((res) => {
        if (!res || res.error) {
          this.setServerStatus({ error: res?.error || 'swipe not saved' });
          if (res?.reason === 'out-of-likes') this.update({ ...this.state, quota: { ...this.state.quota, likes: FREE_DAILY_LIKES } });
          return res;
        }
        serverSync.matchIds.set(profileId, res.matchId);
        if (res.matched && !this.state.matches.some((m) => m.profileId === profileId)) {
          const now = Date.now();
          this.update({
            ...this.state,
            matches: [{ profileId, matchedAt: now, expiresAt: now + MATCH_WINDOW_HOURS * 3600_000, initiatedBy: 'you', person: res.counterpart }, ...this.state.matches],
          });
          this.ensureConversation(profileId);
          this.pushActivity(`You matched with ${profile.name} — say something better than "hey".`);
        }
        if (res.quota) this.update({ ...this.state, quota: { day: today(), likes: res.quota.used, limit: res.quota.limit } });
        return res;
      });
      return { ok: true, matched, profile, pending: true, promise };
    }
    return { ok: true, matched, profile };
  }

  undo() {
    const history = [...this.state.history];
    const last = history.pop();
    if (!last) return { ok: false, reason: 'nothing-to-undo' };
    const decisions = { ...(last.prevDecisions || {}) };
    delete decisions[last.profileId];
    this.update({ ...this.state, decisions, history });
    if (this.isRemoteId(last.profileId)) serverSync.undo(last.profileId);
    return { ok: true, profileId: last.profileId };
  }

  remainingLikes() {
    if (this.isPremium()) return Infinity;
    return Math.max(0, FREE_DAILY_LIKES - this.state.quota.likes);
  }

  canLike() {
    return this.remainingLikes() > 0;
  }

  // ---------------------------------------------------------- conversations
  ensureConversation(profileId) {
    const conversations = this.state.conversations;
    if (conversations[profileId]) return;
    this.update({ ...this.state, conversations: { ...conversations, [profileId]: { messages: [], unread: 0 } } });
  }

  thread(profileId) {
    return this.state.conversations[profileId] || { messages: [], unread: 0 };
  }

  appendMessage(profileId, message) {
    this.ensureConversation(profileId);
    const thread = { ...this.thread(profileId) };
    const msg = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      from: 'me',
      kind: 'text',
      ...message,
    };
    thread.messages = [...thread.messages, msg];
    if (msg.from === 'them') thread.unread = (thread.unread || 0) + 1;
    const match = this.state.matches.find((m) => m.profileId === profileId);
    // First message from either side stops the expiry clock.
    const matches = match && match.expiresAt
      ? this.state.matches.map((m) => (m.profileId === profileId ? { ...m, expiresAt: null } : m))
      : this.state.matches;
    this.update({ ...this.state, matches, conversations: { ...this.state.conversations, [profileId]: thread } });
    if (this.isRemoteId(profileId)) {
      serverSync.message(profileId, msg.text, msg.kind).then((res) => {
        if (res?.matchId) serverSync.matchIds.set(profileId, res.matchId);
        if (res?.error && res?.skipped) this.setServerStatus({ error: 'This chat is local only — the match is not saved on the server yet.' });
        else if (res?.error) this.setServerStatus({ error: res.error });
      });
    }
    return msg;
  }

  sendText(profileId, text, kind = 'text') {
    // eslint-disable-next-line no-control-regex -- pasted emoji/zero-width junk is exactly what we strip
    const clean = String(text || '').replace(/[\u0000-\u001F\u200B-\u200D]/g, '').slice(0, 1200).trim();
    if (!clean) return null;
    return this.appendMessage(profileId, { from: 'me', kind, text: clean });
  }

  markRead(profileId) {
    const thread = this.thread(profileId);
    if (!thread.unread) return;
    this.update({ ...this.state, conversations: { ...this.state.conversations, [profileId]: { ...thread, unread: 0 } } });
    if (this.isRemoteId(profileId)) serverSync.markRead(profileId);
  }

  unreadTotal() {
    return Object.values(this.state.conversations).reduce((sum, t) => sum + (t.unread || 0), 0);
  }

  setTyping(profileId, isTyping) {
    const thread = this.thread(profileId);
    this.update(
      { ...this.state, conversations: { ...this.state.conversations, [profileId]: { ...thread, typing: isTyping } } },
      { silent: true },
    );
  }

  inboxes() {
    const { matches, conversations, decisions } = this.state;
    const now = Date.now();
    const rows = matches
      .map((m) => {
        const person = this.personById(m.profileId) || m.person;
        const thread = conversations[m.profileId] || { messages: [], unread: 0 };
        const last = thread.messages[thread.messages.length - 1] || null;
        const hoursLeft = m.expiresAt ? Math.max(0, (m.expiresAt - now) / 3600_000) : null;
        return {
          ...m,
          person,
          lastMessage: last,
          unread: thread.unread || 0,
          typing: Boolean(thread.typing),
          hoursLeft,
          needsHello: !last,
          meDecided: decisions[m.profileId],
        };
      })
      .filter((r) => r.person)
      .sort((a, b) => {
        if (a.needsHello !== b.needsHello) return a.needsHello ? 1 : -1; // chats you can still save first
        const at = a.lastMessage?.ts || a.matchedAt;
        const bt = b.lastMessage?.ts || b.matchedAt;
        return bt - at;
      });
    return rows;
  }

  pruneMatches(matches) {
    const now = Date.now();
    return matches.filter((m) => !m.expiresAt || m.expiresAt > now - 3600_000);
  }

  unmatch(profileId) {
    const { matches, conversations } = this.state;
    const nextConvos = { ...conversations };
    delete nextConvos[profileId];
    this.update({
      ...this.state,
      matches: matches.filter((m) => m.profileId !== profileId),
      conversations: nextConvos,
      decisions: { ...this.state.decisions, [profileId]: 'unmatched' },
    });
  }

  block(profileId) {
    if (this.state.blocked.includes(profileId)) return;
    this.update({
      ...this.state,
      blocked: [...this.state.blocked, profileId],
      decisions: { ...this.state.decisions, [profileId]: 'blocked' },
    });
    serverSync.block(profileId);
  }

  unblock(profileId) {
    this.update({ ...this.state, blocked: this.state.blocked.filter((id) => id !== profileId) });
    serverSync.unblock(profileId);
  }

  report(profileId, reason, detail = '') {
    const entry = { profileId, reason, detail: String(detail || '').slice(0, 500), at: Date.now(), status: 'reviewing' };
    this.update({
      ...this.state,
      reported: [entry, ...this.state.reported],
      decisions: { ...this.state.decisions, [profileId]: 'reported' },
    });
    this.unmatch(profileId);
    this.block(profileId);
    serverSync.report({ targetId: profileId, reason, detail });
    return entry;
  }

  // --------------------------------------------------------------- trust
  startVerification() {
    this.update((s) => ({
      ...s,
      verification: { status: 'pending', at: Date.now() },
      profile: { ...s.profile, verificationPhoto: Date.now() },
    }));
    return this.state.verification;
  }

  /** Phone-number OTP: returns { ok } or { error } so the UI can show it inline. */
  async requestPhoneOtp(phone) {
    const res = await serverSync.requestPhoneOtp(phone);
    if (res?.error) return { ok: false, error: res.error, debugCode: res.debugCode };
    return { ok: true, phone: res.phone, expiresInSeconds: res.expiresInSeconds, debugCode: res.debugCode };
  }

  async confirmPhoneOtp(phone, code) {
    const res = await serverSync.confirmPhoneOtp(phone, code);
    if (res?.error) return { ok: false, error: res.error };
    this.update((s) => ({
      ...s,
      verification: { ...s.verification, phoneVerified: true, phoneVerifiedAt: Date.now() },
      server: { ...s.server, user: res.verification ? s.server.user : s.server.user },
    }));
    if (res.verification?.status === 'verified') this.completeVerification(true);
    await serverSync.hydrate();
    return { ok: true, verification: res.verification };
  }

  /**
   * Selfie check that works in both modes: the backend queues/reports a real
   * status, the local build falls back to "do you have a photo at all".
   */
  async verifySelfieNow() {
    this.startVerification();
    if (serverSync.mode === 'server') {
      const res = await serverSync.verifySelfie();
      if (res?.status === 'verified') {
        this.completeVerification(true);
        return { ok: true, verified: true };
      }
      if (res?.error) return { ok: false, error: res.error };
      return { ok: true, verified: false, pending: true, note: res?.note };
    }
    const approved = (this.state.profile.photos?.length || 0) >= 1;
    this.completeVerification(approved);
    return { ok: approved, verified: approved, error: approved ? null : 'Add one clear face photo and retry.' };
  }

  completeVerification(approved = true) {
    this.update((s) => ({
      ...s,
      verification: { status: approved ? 'verified' : 'rejected', at: Date.now() },
      profile: { ...s.profile, verified: approved },
    }));
    return this.state.verification;
  }

  setPremium(plan) {
    this.update({ ...this.state, premium: plan ? { plan, since: Date.now() } : null });
    serverSync.setPremium(plan);
  }

  boost(hours = 0.5) {
    this.update({ ...this.state, boostUntil: Date.now() + hours * 3600_000 });
  }

  isBoosting() {
    return this.state.boostUntil > Date.now();
  }

  /** Track profiles I opened, and leave a trace in the activity log. */
  recordVisit(profileId) {
    const visitors = [{ profileId, at: Date.now() }, ...this.state.visitors.filter((v) => v.profileId !== profileId)].slice(0, 30);
    this.update({ ...this.state, visitors });
    const name = this.personById(profileId)?.name;
    if (name) this.pushActivity(`You opened ${name}'s profile — they can see that visit if "last viewed" is on.`);
  }

  pushActivity(text) {
    const activity = [{ id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, at: Date.now() }, ...(this.state.activity || [])].slice(0, 25);
    this.update({ ...this.state, activity }, { silent: true });
  }

  activityFeed() {
    return this.state.activity || [];
  }

  /**
   * Live "someone nearby just did X" ticker. Deterministic per 90-second slot,
   * so it feels alive without inventing fake matches for the current user.
   */
  liveActivity(limit = 4) {
    const slot = Math.floor(Date.now() / 90_000);
    const verbs = [
      (p) => `${p.name}, ${p.age} · ${p.city} just boosted their profile`,
      (p) => `${p.name} added a new photo to their deck`,
      (p) => `${p.name} answered a fresh prompt`,
      (p) => `${p.name} is online and 3 profiles away from you`,
      (p) => `${p.name} verified their photos ✅`,
    ];
    const out = [];
    for (let i = 0; i < limit; i += 1) {
      const p = datingProfiles[(slot * 7 + i * 5) % datingProfiles.length];
      if (!p) continue;
      out.push({ id: `${slot}-${i}`, text: verbs[(slot + i) % verbs.length](p), minsAgo: ((slot + i * 3) % 47) + 1 });
    }
    return out;
  }

  exportData() {
    return JSON.stringify(this.state, null, 2);
  }

  resetAll() {
    if (typeof window === 'undefined') return;
    window.localStorage?.removeItem?.(STORAGE_KEY);
    this.state = deepClone(DEFAULT_STATE);
    this.save();
    this.emit();
  }
}

function sharedWith(me, candidate) {
  const mine = new Set((me?.interests || []).map((i) => String(i).toLowerCase()));
  return (candidate?.interests || []).filter((i) => mine.has(String(i).toLowerCase()));
}

function dedupeUrls(list) {
  const seen = new Set();
  return (list || []).filter((u) => {
    if (!u || seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

function isoWeek() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

export const datingStore = new DatingStore();
