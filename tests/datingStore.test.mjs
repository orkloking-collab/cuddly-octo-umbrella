import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser surface so the store's persistence + broadcast paths run for real.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
globalThis.window = { localStorage: globalThis.localStorage, addEventListener: () => {} };
globalThis.BroadcastChannel = class { constructor() { this.onmessage = null; } postMessage() {} close() {} };

const { datingStore } = await import('../src/utils/datingStore.js');
const { replyTo, matchOpener, staleness, suggestedReplies } = await import('../src/utils/chatEngine.js');
const { datingProfiles } = await import('../src/data/datingProfiles.js');

const freshProfile = {
  name: 'Test Person', age: 27, gender: 'Woman', seeking: ['Men'], lookingFor: 'long_term',
  city: 'Dhaka', location: { lat: 23.8103, lng: 90.4125 },
  interests: ['Filter coffee', 'Bookshops', 'Poetry'],
  prompts: [{ q: 'x', a: 'y' }], photos: ['p1', 'p2'], bio: 'b'.repeat(60),
};

const reset = () => {
  datingStore.updatePrefs({ ageMin: 18, ageMax: 70, distanceKm: 5000, verifiedOnly: false, onlineOnly: false });
  datingStore.update({ ...datingStore.getState(), decisions: {}, history: [], matches: [], conversations: {}, blocked: [], reported: [], quota: { day: new Date().toISOString().slice(0, 10), likes: 0 } });
  datingStore.updateProfile(freshProfile);
};

test('swipe records the decision and stays undoable', () => {
  reset();
  const candidate = datingStore.deck()[0];
  const res = datingStore.swipe(candidate.id, 'pass');
  assert.equal(res.ok, true);
  assert.equal(datingStore.deck().some((c) => c.id === candidate.id), false, 'passed profile must leave the deck');
  const undo = datingStore.undo();
  assert.equal(undo.ok, true);
  assert.equal(datingStore.deck()[0].id, candidate.id, 'undo must restore it as the next card');
});

test('free tier stops at 25 likes; passes stay unlimited', () => {
  reset();
  const deck = datingStore.deck();
  assert.ok(deck.length >= 3, `deck too small to test anything (${deck.length})`);

  // Fast-forward the ledger instead of needing 25 candidates in the demo set.
  datingStore.update((s) => ({ ...s, quota: { day: new Date().toISOString().slice(0, 10), likes: 24 } }));
  const lastAllowed = datingStore.swipe(deck[0].id, 'like');
  assert.equal(lastAllowed.ok, true, '25th like must go through');
  assert.equal(datingStore.remainingLikes(), 0);

  const rejected = datingStore.swipe(deck[1].id, 'like');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'out-of-likes');
  assert.equal(datingStore.getState().decisions[deck[1].id], undefined, 'a rejected swipe must not consume the profile');

  const passed = datingStore.swipe(deck[1].id, 'pass');
  assert.equal(passed.ok, true, 'passing is never rate limited');
});

test('premium removes the daily cap', () => {
  reset();
  datingStore.setPremium('12m');
  assert.equal(datingStore.remainingLikes(), Infinity);
  const before = datingStore.deck().length;
  const r = datingStore.swipe(datingStore.deck()[0].id, 'like');
  assert.equal(r.ok, true);
  assert.ok(datingStore.deck().length < before);
  datingStore.setPremium(null);
});

test('a narrow radius really does shrink the deck', () => {
  reset();
  const wide = datingStore.deck().length;
  datingStore.updatePrefs({ distanceKm: 30 });
  const tight = datingStore.deck().length;
  datingStore.updatePrefs({ distanceKm: 5000 });
  assert.ok(wide > 3, `wide deck=${wide}`);
  assert.ok(tight < wide, `tight=${tight} wide=${wide}`);
});

test('super likes are rationed weekly', () => {
  reset();
  const deck = datingStore.deck();
  assert.equal(datingStore.swipe(deck[0].id, 'super').ok, true);
  assert.equal(datingStore.swipe(deck[1].id, 'super').ok, true);
  assert.equal(datingStore.swipe(deck[2].id, 'super').reason, 'no-super-likes');
});

test('a mutual like creates one match and a thread, and stops the expiry timer', () => {
  reset();
  const likeBack = datingProfiles.find((p) => p.likesMe);
  const res = datingStore.swipe(likeBack.id, 'like');
  assert.equal(res.matched, true);
  const matches = datingStore.getState().matches.filter((m) => m.profileId === likeBack.id);
  assert.equal(matches.length, 1, 'exactly one match row');
  assert.ok(matches[0].expiresAt > Date.now(), 'unanswered matches carry a deadline');
  datingStore.sendText(likeBack.id, 'Hello there');
  assert.equal(datingStore.getState().matches.find((m) => m.profileId === likeBack.id).expiresAt, null, 'first message kills the deadline');
  assert.equal(datingStore.thread(likeBack.id).messages.length, 1);
});

test('no double match on a repeated swipe', () => {
  reset();
  const likeBack = datingProfiles.find((p) => p.likesMe);
  datingStore.swipe(likeBack.id, 'like');
  datingStore.swipe(likeBack.id, 'like');
  assert.equal(datingStore.getState().matches.filter((m) => m.profileId === likeBack.id).length, 1);
});

test('report blocks, unmatches and files a record', () => {
  reset();
  const target = datingStore.deck()[0];
  datingStore.report(target.id, 'Asking for money (scam)', 'bKash request after 2 messages');
  const st = datingStore.getState();
  assert.ok(st.blocked.includes(target.id), 'must be blocked');
  assert.equal(st.matches.some((m) => m.profileId === target.id), false, 'must be unmatched');
  assert.equal(st.reported[0].reason, 'Asking for money (scam)');
  assert.equal(datingStore.deck().some((c) => c.id === target.id), false, 'reported people never reappear');
});

test('blocked profiles are excluded from the deck until unblocked', () => {
  reset();
  const target = datingStore.deck()[0];
  datingStore.block(target.id);
  assert.equal(datingStore.deck().some((c) => c.id === target.id), false);
  datingStore.unblock(target.id);
  // Decisions still hold, so clear it to prove the block (not the swipe) hid them.
  datingStore.update((s) => ({ ...s, decisions: {} }));
  assert.ok(datingStore.deck().some((c) => c.id === target.id));
});

test('pending likes exclude everyone I already answered', () => {
  reset();
  const before = datingStore.pendingLikes().length;
  assert.ok(before >= 1, 'dataset must contain incoming likes');
  const target = datingStore.pendingLikes()[0];
  datingStore.swipe(target.id, 'like');
  assert.equal(datingStore.pendingLikes().length, before - 1);
});

test('state persists to localStorage under a versioned key', async () => {
  reset();
  datingStore.updateProfile({ name: 'Persisted Name' });
  await new Promise((r) => setTimeout(r, 260)); // save() is debounced by 120ms
  const raw = mem.get('romancha_dating_v1');
  assert.ok(raw, 'nothing written');
  assert.equal(JSON.parse(raw).profile.name, 'Persisted Name');
});

test('exportData is valid JSON and resetAll clears it', () => {
  reset();
  JSON.parse(datingStore.exportData());
  datingStore.resetAll();
  assert.equal(datingStore.getState().profile.name, '');
  assert.equal(datingStore.getState().matches.length, 0);
});

test('verification state machine: none -> pending -> verified', () => {
  reset();
  assert.equal(datingStore.getState().verification.status, 'none');
  datingStore.startVerification();
  assert.equal(datingStore.getState().verification.status, 'pending');
  datingStore.completeVerification(true);
  assert.equal(datingStore.getState().verification.status, 'verified');
  assert.equal(datingStore.getProfile().verified, true);
});

test('profile strength feeds visibility: an empty profile is flagged', () => {
  reset();
  datingStore.updateProfile({ photos: [], bio: '', prompts: [], interests: [] });
  assert.ok(datingStore.strength().score < 40);
  datingStore.updateProfile(freshProfile);
  assert.ok(datingStore.strength().score > 70);
});

test('chat engine: harassment, scam and sexual requests become guardrails', () => {
  const them = datingProfiles[0];
  for (const [msg, code] of [
    ['you are a stupid ugly woman', 'harassment'],
    ['send me 500 tk on my bKash number', 'scam'],
    ['send nudes', 'boundary'],
    ['how old are you?', 'age'],
  ]) {
    const r = replyTo(msg, freshProfile, them, 2, { now: 1700000000000 });
    assert.equal(r.kind, 'guardrail', `"${msg}" -> ${r.kind}`);
    assert.equal(r.code, code);
  }
});

test('chat engine: a real question returns a reply sized like a message', () => {
  const them = datingProfiles.find((p) => p.city === 'Dhaka');
  // Clock pinned: a benign question must never come back as a guardrail, and when
  // it does answer, the answer has to look like a message.
  const minutes = [0, 1, 2, 3, 4, 5].map((m) =>
    replyTo('what do you do for work around here?', freshProfile, them, 1, { now: 1700000000000 + m * 60000 }));
  assert.ok(minutes.every((r) => r.kind === 'reply' || r.kind === 'silence'), JSON.stringify(minutes));
  const r = minutes.find((x) => x.kind === 'reply');
  assert.ok(r, 'a genuine question has to get a reply at least once across six minutes');
  assert.ok(r.text.length > 20);
  assert.ok(r.delayMs > 500 && r.delayMs < 9001);
});

test('chat engine: no reply contains contact details or money requests', () => {
  const them = datingProfiles[0];
  const probes = ['hi', 'how are you', 'meet tomorrow?', 'what is your number', 'send money', 'coffee sometime', 'kemon acho'];
  for (const p of probes) {
    for (let turn = 0; turn < 4; turn += 1) {
      const r = replyTo(p, freshProfile, them, turn, { now: 1700000000000 });
      if (r.kind !== 'reply') continue;
      assert.doesNotMatch(r.text, /\b(01\d{9}|\+8801\d{9})\b/, 'phone number leak');
      assert.doesNotMatch(r.text, /(send me money|i will pay you)/i, 'money request leak');
    }
  }
});

test('matchOpener is sparse and never empty strings', () => {
  const out = datingProfiles.map((p) => matchOpener(p, freshProfile)).filter(Boolean);
  assert.ok(out.length > 0 && out.length < datingProfiles.length, `openers=${out.length}`);
  for (const o of out) assert.ok(o.text.trim().length > 10 && o.delayMs >= 0);
});

test('suggestedReplies always offers something to say', () => {
  const list = suggestedReplies(freshProfile, datingProfiles[1]);
  assert.ok(list.length >= 1 && list.length <= 4);
  assert.ok(list.every((x) => x.length > 6));
});

test('staleness escalates with silence', () => {
  const now = Date.now();
  assert.equal(staleness([], now).level, 'fresh');
  assert.equal(staleness([{ ts: now - 3600_000 }], now).level, 'fresh');
  assert.equal(staleness([{ ts: now - 3 * 86400_000 }], now).level, 'stale');
  assert.equal(staleness([{ ts: now - 30 * 86400_000 }], now).level, 'cold');
});

test('a Boost measurably improves conversion, and only while it is live', async () => {
  reset();
  const { likeBackProbability } = await import('../src/utils/matching.js');
  const base = datingStore.deck().reduce((sum, c) => sum + likeBackProbability(datingStore.getProfile(), { ...c, match: c.match }, 'like'), 0);
  datingStore.boost(0.5);
  const boosted = datingStore.deck().reduce((sum, c) => sum + likeBackProbability({ ...datingStore.getProfile(), boosting: true }, { ...c, match: c.match }, 'like'), 0);
  assert.ok(boosted > base, `boosted=${boosted} base=${base}`);
  assert.ok(datingStore.isBoosting());
  datingStore.update((s) => ({ ...s, boostUntil: Date.now() - 1 }));
  assert.equal(datingStore.isBoosting(), false, 'boost must expire');
});

test('a match nobody spoke inside expires; one with a chat survives', async () => {
  reset();
  const target = datingProfiles.find((p) => p.likesMe);
  datingStore.swipe(target.id, 'like');
  const stored = datingStore.getState().matches.find((m) => m.profileId === target.id);
  assert.ok(stored.expiresAt > Date.now(), 'fresh match keeps its window');

  // Rewind the clock on that match, then reload the store from persistence.
  datingStore.update((s) => ({
    ...s,
    matches: s.matches.map((m) => (m.profileId === target.id ? { ...m, expiresAt: Date.now() - 1000 } : m)),
  }));
  datingStore.updateProfile({ name: 'Expiry Probe' }); // triggers a save
  await new Promise((r) => setTimeout(r, 260)); // save() is debounced
  const raw = JSON.parse(mem.get('romancha_dating_v1'));
  raw.matches = raw.matches.map((m) => (m.profileId === target.id ? { ...m, expiresAt: Date.now() - 1000 } : m));
  mem.set('romancha_dating_v1', JSON.stringify(raw));
  const reloaded = datingStore.normalise(raw);
  assert.equal(reloaded.matches.some((m) => m.profileId === target.id), false, 'expired, silent match must be dropped');

  // Same, but with a conversation -> kept.
  datingStore.sendText(target.id, 'before you go');
  const withChat = datingStore.getState();
  withChat.matches = withChat.matches.map((m) => (m.profileId === target.id ? { ...m, expiresAt: Date.now() - 1000 } : m));
  assert.ok(datingStore.normalise(withChat).matches.some((m) => m.profileId === target.id), 'a chatted match is history, not an expiry');
});
