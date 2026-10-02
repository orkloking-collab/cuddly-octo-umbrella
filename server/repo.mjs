/**
 * Data access for Romancha's dating domain, on top of the SQL layer.
 *
 * The persona dataset (src/data/datingProfiles.js) powers the deck so a single
 * visitor still has a usable app; **real accounts on this server are merged into
 * the same deck**, which is what makes two browsers able to actually match and
 * chat. Both paths go through the same filtering, matching and expiry rules.
 */
import crypto from 'node:crypto';
import { buildDeck, likesBack, compatibility } from '../src/utils/matching.js';
import { effectivePlan, FREE_PLAN } from '../src/data/plans.js';
import { datingProfiles } from '../src/data/datingProfiles.js';

const MATCH_WINDOW_HOURS = 24;
// The like ceiling is not a constant any more: it comes from the plan catalogue in
// src/data/plans.js, which the API and the paywall both read.

const parse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const rows = (result) => (Array.isArray(result) ? result : result?.rows ?? []);
const one = (result) => (Array.isArray(result) ? result[0] ?? null : result);

export function createRepo(db) {
  const all = async (sql, params) => rows(await db.all(sql, params));
  const get = async (sql, params) => one(await db.get(sql, params));

  // ------------------------------------------------------------- profile
  async function getProfile(userId) {
    const row = await get('SELECT data FROM profiles WHERE user_id = ?', [userId]);
    const data = parse(row?.data, { profile: {}, prefs: {} });
    return { profile: data.profile || {}, prefs: data.prefs || {}, updatedAt: row ? row.updated_at : null };
  }

  async function saveProfile(userId, { profile, prefs }) {
    const existing = await getProfile(userId);
    const payload = {
      profile: { ...existing.profile, ...(profile || {}) },
      prefs: { ...existing.prefs, ...(prefs || {}) },
    };
    const now = Date.now();
    const changed = await db.run(
      'UPDATE profiles SET data = ?, updated_at = ? WHERE user_id = ?',
      [JSON.stringify(payload), now, userId],
    );
    if (!changed?.changes) {
      await db.run('INSERT INTO profiles (user_id, data, updated_at) VALUES (?, ?, ?)', [userId, JSON.stringify(payload), now]);
    }
    if (profile?.name !== undefined) {
      await db.run('UPDATE users SET display_name = ? WHERE id = ?', [String(profile.name).slice(0, 40), userId]);
    }
    return payload;
  }

  // ------------------------------------------------------------- decisions
  async function decisionsOf(userId) {
    const list = await all('SELECT target_id, kind, created_at FROM decisions WHERE user_id = ?', [userId]);
    return Object.fromEntries(list.map((d) => [d.target_id, d.kind]));
  }

  /** The account's live plan: paid plans expire, so this is recomputed each time. */
  async function planFor(userId) {
    const user = await get('SELECT premium_plan, premium_since FROM users WHERE id = ?', [userId]);
    const { plan, active, expiresAt } = effectivePlan(user || {});
    return { plan, active, expiresAt, user };
  }

  async function quotaFor(userId) {
    const used = await likesToday(userId);
    const { plan, active } = await planFor(userId);
    const limit = plan.dailyLikes ?? FREE_PLAN.dailyLikes;
    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      premium: active,
      plan: plan.id,
    };
  }

  async function likesToday(userId) {
    const row = await get(
      'SELECT COUNT(*) AS n FROM decisions WHERE user_id = ? AND kind IN (?, ?) AND created_at > ?',
      [userId, 'like', 'super', startOfToday()],
    );
    return Number(row?.n ?? 0);
  }

  async function superLikesThisWeek(userId) {
    const weekAgo = Date.now() - 7 * 24 * 3600_000;
    const row = await get('SELECT COUNT(*) AS n FROM decisions WHERE user_id = ? AND kind = ? AND created_at > ?', [userId, 'super', weekAgo]);
    return Number(row?.n ?? 0);
  }

  async function recordDecision(userId, targetId, kind) {
    const now = Date.now();
    // The `likes` table is account-to-account, so a card id (`usr:<uuid>`) has to
    // be resolved before it is stored — otherwise "who liked me" never matches.
    const likeKey = String(targetId).startsWith('usr:') ? String(targetId).slice(4) : String(targetId);
    await db.run(
      'INSERT INTO decisions (user_id, target_id, kind, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, target_id) DO UPDATE SET kind = excluded.kind, created_at = excluded.created_at',
      [userId, String(targetId), String(kind), now],
    );
    if (kind === 'like' || kind === 'super') {
      await db.run(
        'INSERT INTO likes (user_id, target_id, kind, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, target_id) DO UPDATE SET kind = excluded.kind, created_at = excluded.created_at',
        [userId, likeKey, kind, now],
      );
    } else if (kind === 'pass') {
      await db.run('DELETE FROM likes WHERE user_id = ? AND target_id = ?', [userId, likeKey]);
    }
  }

  async function undoDecision(userId, targetId) {
    const likeKey = String(targetId).startsWith('usr:') ? String(targetId).slice(4) : String(targetId);
    await db.run('DELETE FROM decisions WHERE user_id = ? AND target_id = ?', [userId, String(targetId)]);
    await db.run('DELETE FROM likes WHERE user_id = ? AND target_id = ?', [userId, likeKey]);
  }

  // ------------------------------------------------------------- matches
  async function findMatch(userId, targetId) {
    const otherKey = String(targetId).startsWith('usr:') ? String(targetId).slice(4) : null;
    const personaId = otherKey ? null : String(targetId);
    return get(
      `SELECT * FROM matches
       WHERE (user_a = ? AND (user_b = ? OR persona_id = ?))
          OR (user_b = ? AND (user_a = ? OR persona_id = ?))`,
      [userId, otherKey, personaId, userId, otherKey, personaId],
    );
  }

  async function createMatch(userId, { personaId = null, otherUserId = null }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.run(
      'INSERT INTO matches (id, user_a, user_b, persona_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, otherUserId || `persona:${personaId}`, personaId, now, now + MATCH_WINDOW_HOURS * 3600_000],
    );
    return id;
  }

  async function touchFirstContact(matchId) {
    await db.run('UPDATE matches SET expires_at = NULL, first_contact_at = ? WHERE id = ?', [Date.now(), matchId]);
  }

  async function listMatches(userId) {
    const list = await all(
      'SELECT * FROM matches WHERE (user_a = ? OR user_b = ?) AND (expires_at IS NULL OR expires_at > ? OR first_contact_at IS NOT NULL) ORDER BY created_at DESC',
      [userId, userId, Date.now()],
    );
    const out = [];
    for (const m of list) {
      const counterpart = m.user_a === userId ? m.user_b : m.user_a;
      const persona = m.persona_id ? datingProfiles.find((p) => p.id === m.persona_id) || null : null;
      let real = null;
      if (!m.persona_id && counterpart && !String(counterpart).startsWith('persona:')) {
        const userRow = await get('SELECT id, display_name, phone FROM users WHERE id = ?', [counterpart]);
        const prof = await getProfile(counterpart);
        real = { id: counterpart, ...(userRow || {}), ...prof.profile };
      }
      const last = await get('SELECT * FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1', [m.id]);
      const unread = await get(
        'SELECT COUNT(*) AS n FROM messages WHERE match_id = ? AND sender_id <> ? AND read_at IS NULL',
        [m.id, userId],
      );
      out.push({
        id: m.id,
        personaId: m.persona_id,
        counterpartId: counterpart,
        matchedAt: m.created_at,
        expiresAt: m.expires_at,
        person: persona || real || { id: counterpart, name: real?.displayName || 'Someone' },
        kind: persona ? 'persona' : 'user',
        lastMessage: last ? {
          id: last.id, from: last.sender_id === userId ? 'me' : 'them', text: last.body, kind: last.kind,
          ts: last.created_at, media: last.media_url || null, durationMs: last.duration_ms || 0,
        } : null,
        unread: Number(unread?.n ?? 0),
        needsHello: !last,
      });
    }
    return out;
  }

  async function thread(matchId, userId) {
    const match = await get('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!match) return null;
    // Only the two participants may read a thread.
    if (![match.user_a, match.user_b].includes(userId)) return null;
    const messages = await all('SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT 400', [matchId]);
    return {
      match,
      messages: messages.map((m) => ({
        id: m.id,
        from: m.sender_id === userId ? 'me' : 'them',
        text: m.body,
        kind: m.kind,
        ts: m.created_at,
        readAt: m.read_at,
        media: m.media_url || null,
        durationMs: m.duration_ms || 0,
      })),
    };
  }

  async function appendMessage({ matchId, senderId, body, kind = 'text', mediaUrl = null, durationMs = 0 }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.run(
      'INSERT INTO messages (id, match_id, sender_id, kind, body, created_at, media_url, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id, matchId, senderId, String(kind).slice(0, 20), String(body).slice(0, 4000), now,
        mediaUrl ? String(mediaUrl).slice(0, 500) : null, Math.max(0, Math.round(Number(durationMs) || 0)),
      ],
    );
    await touchFirstContact(matchId);
    const match = await get('SELECT * FROM matches WHERE id = ?', [matchId]);
    const recipient = match.user_a === senderId ? match.user_b : match.user_a;
    return {
      id, matchId, senderId, body, kind, ts: now, recipient,
      mediaUrl: mediaUrl || null, durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
    };
  }

  async function markRead(matchId, userId) {
    await db.run('UPDATE messages SET read_at = ? WHERE match_id = ? AND sender_id <> ? AND read_at IS NULL', [Date.now(), matchId, userId]);
  }

  // ------------------------------------------------------------- blocks/reports
  // Card ids for real members are `usr:<account id>`; blocks may be filed with
  // either spelling, so both sides are compared in their stripped form.
  const stripUsr = (v) => String(v || '').replace(/^usr:/, '');
  async function blockedSetOf(userId) {
    const found = await all('SELECT blocked_id FROM blocks WHERE user_id = ?', [userId]);
    return new Set(found.map((r) => stripUsr(r.blocked_id)).filter(Boolean));
  }
  async function isBlocked(a, b) {
    const [mine, theirs] = await Promise.all([blockedSetOf(a), blockedSetOf(b)]);
    return mine.has(stripUsr(b)) || theirs.has(stripUsr(a));
  }
  async function block(userId, blockedId) {
    await db.run('INSERT INTO blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, blocked_id) DO NOTHING', [userId, String(blockedId), Date.now()]);
  }
  async function unblock(userId, blockedId) {
    await db.run('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?', [userId, String(blockedId)]);
  }
  async function listBlocks(userId) {
    return (await all('SELECT blocked_id, created_at FROM blocks WHERE user_id = ? ORDER BY created_at DESC', [userId])).map((b) => ({
      id: b.blocked_id,
      accountId: stripUsr(b.blocked_id),
      at: b.created_at,
    }));
  }
  async function fileReport({ reporterId, targetId, reason, detail }) {
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO reports (id, reporter_id, target_id, reason, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, reporterId, String(targetId), String(reason).slice(0, 80), String(detail).slice(0, 500), Date.now()],
    );
    await block(reporterId, targetId);
    return id;
  }
  async function listReports(userId) {
    return (await all('SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC LIMIT 50', [userId])).map((r) => ({
      id: r.id, targetId: r.target_id, reason: r.reason, detail: r.detail, status: r.status, at: r.created_at, resolvedAt: r.resolved_at,
    }));
  }

  // ------------------------------------------------------------- trust
  async function verification(userId) {
    const row = await get('SELECT * FROM verifications WHERE user_id = ?', [userId]);
    const verifiedAt = row?.verified_at || null;
    const phoneAt = row?.phone_verified_at || null;
    // camelCase for the client, snake_case for the SQL-backed patches.
    return {
      status: row?.status || 'none',
      method: row?.method || null,
      phoneVerified: Boolean(row?.phone_verified),
      phone_verified: Boolean(row?.phone_verified),
      phoneVerifiedAt: phoneAt,
      phone_verified_at: phoneAt,
      selfie: Boolean(row?.selfie_at),
      selfie_at: row?.selfie_at || null,
      verifiedAt,
      verified_at: verifiedAt,
      expiresAt: row?.expires_at || null,
      expires_at: row?.expires_at || null,
    };
  }
  async function setVerification(userId, patch) {
    const current = await get('SELECT user_id FROM verifications WHERE user_id = ?', [userId]);
    if (!current) {
      await db.run('INSERT INTO verifications (user_id, status, created_at) VALUES (?, ?, ?)', [userId, patch.status || 'pending', Date.now()]);
    }
    const keys = Object.keys(patch);
    if (!keys.length) return verification(userId);
    const setSql = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => (typeof patch[k] === 'boolean' ? (patch[k] ? 1 : 0) : patch[k]));
    await db.run(`UPDATE verifications SET ${setSql} WHERE user_id = ?`, [...values, userId]);
    return verification(userId);
  }

  async function setPremium(userId, plan) {
    if (plan) {
      await db.run('UPDATE users SET premium_plan = ?, premium_since = ? WHERE id = ?', [String(plan).slice(0, 20), Date.now(), userId]);
    } else {
      await db.run('UPDATE users SET premium_plan = NULL, premium_since = NULL WHERE id = ?', [userId]);
    }
  }

  // ------------------------------------------------------------- candidates
  /** Real accounts on this server, in the same shape as the persona dataset. */
  async function realCandidates(userId) {
    const list = await all('SELECT user_id, data FROM profiles WHERE user_id <> ?', [userId]);
    const out = [];
    for (const row of list) {
      if (await isBlocked(userId, row.user_id)) continue;
      const data = parse(row.data, {});
      const p = data.profile || {};
      if (!p.name || p.showMe === false || data.prefs?.showMe === false) continue;
      out.push({
        ...p,
        id: `usr:${row.user_id}`,
        realUserId: row.user_id,
        isRealUser: true,
        age: Number(p.age) || null,
        verified: Boolean(p.verified) || (await verification(row.user_id)).status === 'verified',
        online: Date.now() - (row.updated_at || 0) < 5 * 60_000,
        lastActiveMins: Math.max(0, Math.round((Date.now() - (row.updated_at || 0)) / 60000)),
        city: p.city || '',
        interests: p.interests || [],
        photos: p.photos || [],
        prompts: p.prompts || [],
        openers: [],
        lookingFor: p.lookingFor || '',
        seeking: p.seeking || [],
        bio: p.bio || '',
        job: p.job || '',
        drink: p.drink || '',
        smoke: p.smoke || '',
        exercise: p.exercise || '',
        education: p.education || '',
        kids: p.kids || '',
        heightCm: p.heightCm || 0,
        languages: p.languages || ['English'],
        astro: p.astro || '',
      });
    }
    return out;
  }

  /** Incoming likes from real accounts (personas are scored, not stored). */
  async function incomingLikes(userId) {
    const list = await all('SELECT user_id, created_at FROM likes WHERE target_id = ? AND user_id <> ?', [userId, userId]);
    const out = [];
    for (const row of list) {
      const prof = await getProfile(row.user_id);
      const p = prof.profile || {};
      if (!p.name) continue;
      if (await isBlocked(userId, row.user_id)) continue;
      out.push({ ...p, id: `usr:${row.user_id}`, realUserId: row.user_id, isRealUser: true, likedAt: row.created_at, likesMe: true });
    }
    return out;
  }

  async function deckFor(userId, { includeDecided = false, limit = 60 } = {}) {
    const [{ profile, prefs }, decisions, blocked, realUsers, likedMe] = await Promise.all([
      getProfile(userId),
      decisionsOf(userId),
      listBlocks(userId),
      realCandidates(userId),
      incomingLikes(userId),
    ]);
    const me = { ...profile, prefs };
    const deck = buildDeck([...datingProfiles, ...realUsers], me, {
      blockedIds: blocked.map((b) => b.id),
      alreadyDecided: includeDecided ? {} : decisions,
      limit,
      prioritiseLikes: true,
    });
    const likedMeIds = new Set(likedMe.map((p) => p.id));
    return {
      // `demo` is what the UI labels a seeded persona with, so nobody mistakes a
      // scripted character for a real member.
      deck: deck.map((c) => ({
        ...c,
        demo: !c.isRealUser,
        likesMe: likedMeIds.has(c.id) || Boolean(c.likesMe),
      })),
      decisions,
      likedMeCount: likedMe.length,
      quota: await quotaFor(userId),
    };
  }

  /** Decide whether a swipe converts, using the shared engine + cross-account likes. */
  async function evaluateSwipe({ userId, targetId, kind }) {
    if (kind === 'like' || kind === 'super') {
      const quota = await quotaFor(userId);
      if (kind === 'like' && quota.remaining <= 0) {
        return { ok: false, reason: 'out-of-likes', remaining: 0, plan: quota.plan };
      }
      if (kind === 'super') {
        const { plan } = await planFor(userId);
        const used = await superLikesThisWeek(userId);
        if (used >= plan.superLikesPerWeek) return { ok: false, reason: 'no-super-likes', left: 0, plan: plan.id };
      }
    }

    const personaId = String(targetId).startsWith('usr:') ? null : targetId;
    const otherUserId = String(targetId).startsWith('usr:') ? String(targetId).slice(4) : null;
    const { profile: meProfile } = await getProfile(userId);

    let matched = false;
    let matchId = null;
    let counterpart = null;

    if (personaId) {
      const persona = datingProfiles.find((p) => p.id === personaId);
      if (!persona) return { ok: false, reason: 'unknown-profile' };
      const me = { ...meProfile, prefs: (await getProfile(userId)).prefs };
      matched = kind !== 'pass' && likesBack(me, { ...persona, match: compatibility(me, persona) }, kind === 'super' ? 'super' : 'like');
      if (matched) matchId = await createMatch(userId, { personaId });
      counterpart = persona;
    } else if (otherUserId) {
      const them = await getProfile(otherUserId);
      const theyLikedMe = await get('SELECT kind FROM likes WHERE user_id = ? AND target_id = ?', [otherUserId, userId]);
      // Real people only match when they actually liked you back. The `likesBack`
      // heuristic is for seeded personas; letting it fire here fabricated a match
      // out of a one-sided swipe (and made "It's a match!" a lie roughly once a
      // minute, which is exactly how this test flaked before it was pinned).
      matched = Boolean(theyLikedMe) && kind !== 'pass';
      const existing = await get('SELECT * FROM matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)', [userId, otherUserId, otherUserId, userId]);
      if (matched && !existing) matchId = await createMatch(userId, { otherUserId });
      counterpart = { ...them.profile, id: `usr:${otherUserId}`, isRealUser: true };
    }

    await recordDecision(userId, targetId, kind);

    // Reconcile the reverse edge: if they already liked me, their match exists too.
    if (otherUserId && matched && !matchId) {
      const existing = await get('SELECT id FROM matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)', [otherUserId, userId, userId, otherUserId]);
      matchId = existing?.id || null;
    }

    return {
      ok: true,
      matched,
      matchId,
      targetId,
      kind,
      counterpart,
      quota: await quotaFor(userId),
    };
  }

  // ------------------------------------------------------------- video calls
  /*
   * Call minutes are metered server-side, because "20 free minutes a day" is the
   * product. A session is alive while the client heartbeats; its cost is
   * (last_seen_at - started_at), so a tab that is closed mid-call stops charging
   * within a heartbeat interval instead of burning the rest of the day.
   */
  const CALL_LEASE_MS = 90_000;

  async function secondsUsedToday(userId) {
    const row = await get(
      'SELECT COALESCE(SUM(seconds), 0) AS n FROM call_sessions WHERE user_id = ? AND started_at > ?',
      [userId, startOfToday()],
    );
    let live = 0;
    const open = await all(
      'SELECT * FROM call_sessions WHERE user_id = ? AND ended_at IS NULL AND started_at > ?',
      [userId, startOfToday()],
    );
    const now = Date.now();
    for (const session of open) {
      // Close stale sessions lazily: no heartbeat for a minute and a half = over.
      const billed = Math.max(0, Math.min(now, session.last_seen_at) - session.started_at) / 1000;
      live += Math.round(billed);
      if (now - session.last_seen_at > CALL_LEASE_MS) {
        await db.run('UPDATE call_sessions SET ended_at = ?, seconds = seconds + ? WHERE id = ?', [
          session.last_seen_at, Math.round(billed), session.id,
        ]);
      }
    }
    return Number(row?.n ?? 0) + live;
  }

  async function callStateFor(userId) {
    const { plan, active, expiresAt } = await planFor(userId);
    const used = await secondsUsedToday(userId);
    const limit = plan.dailyCallSeconds ?? FREE_PLAN.dailyCallSeconds;
    return {
      plan: plan.id,
      planLabel: plan.label,
      active,
      expiresAt,
      limitSeconds: limit,
      usedSeconds: used,
      secondsLeft: Math.max(0, limit - used),
      resetsAt: startOfTomorrow(),
      priceUsd: plan.priceUsd,
    };
  }

  async function startCall(userId, matchId = null) {
    const state = await callStateFor(userId);
    if (state.secondsLeft <= 0) return { ok: false, reason: 'call-quota', ...state };
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.run(
      'INSERT INTO call_sessions (id, user_id, match_id, started_at, last_seen_at, seconds) VALUES (?, ?, ?, ?, ?, 0)',
      [id, userId, matchId ? String(matchId).slice(0, 80) : null, now, now],
    );
    return { ok: true, sessionId: id, ...state };
  }

  async function heartbeatCall(userId, sessionId) {
    const session = await get('SELECT * FROM call_sessions WHERE id = ? AND user_id = ?', [String(sessionId), userId]);
    if (!session || session.ended_at) return { ok: false, reason: 'no-such-session' };
    const now = Date.now();
    const delta = Math.max(0, Math.round((now - session.last_seen_at) / 1000));
    await db.run('UPDATE call_sessions SET last_seen_at = ?, seconds = seconds + ? WHERE id = ?', [now, delta, session.id]);
    const state = await callStateFor(userId);
    return { ok: true, secondsLeft: state.secondsLeft, usedSeconds: state.usedSeconds, limitSeconds: state.limitSeconds };
  }

  async function endCall(userId, sessionId) {
    const session = await get('SELECT * FROM call_sessions WHERE id = ? AND user_id = ?', [String(sessionId), userId]);
    if (!session) return { ok: false, reason: 'no-such-session' };
    const now = Date.now();
    const delta = Math.max(0, Math.round((now - session.last_seen_at) / 1000));
    await db.run('UPDATE call_sessions SET ended_at = ?, seconds = seconds + ?, last_seen_at = ? WHERE id = ?', [
      now, delta, now, session.id,
    ]);
    return { ok: true, seconds: session.seconds + delta, billed: true };
  }

  async function callHistory(userId, limit = 20) {
    const list = await all('SELECT * FROM call_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?', [userId, limit]);
    return list.map((c) => ({
      id: c.id, matchId: c.match_id, startedAt: c.started_at, endedAt: c.ended_at, seconds: c.seconds,
    }));
  }

  // ------------------------------------------------------------------- ads
  /*
   * First-party placements only. Third-party ad networks on an 18+ dating app
   * means trackers in the URL bar, malvertising and a policy fight with every
   * payment provider, so ads here are campaigns the app itself serves and counts.
   */
  async function listActiveAds(placement = 'banner', limit = 8) {
    const now = Date.now();
    const list = await all(
      `SELECT * FROM ad_campaigns
       WHERE status = 'active' AND placement = ?
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (ends_at IS NULL OR ends_at > ?)
         AND impressions < impressions_budget
       ORDER BY cpm_usd DESC, created_at DESC LIMIT ?`,
      [placement, now, now, limit],
    );
    return list.map((a) => ({
      id: a.id, title: a.title, imageUrl: a.image_url, targetUrl: a.target_url, placement: a.placement,
      cpmUsd: a.cpm_usd, impressions: a.impressions, clicks: a.clicks, ownerId: a.owner_id,
    }));
  }

  async function createAd({ ownerId, title, imageUrl, targetUrl, placement = 'banner', impressionsBudget = 1000, startsAt = null, endsAt = null, cpmUsd = 0.4 }) {
    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO ad_campaigns (id, owner_id, title, image_url, target_url, placement, status, impressions_budget, created_at, starts_at, ends_at, cpm_usd)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        id, ownerId, String(title).slice(0, 120), imageUrl ? String(imageUrl).slice(0, 500) : null,
        String(targetUrl).slice(0, 500), String(placement).slice(0, 20), Math.max(1, Math.round(Number(impressionsBudget) || 1000)),
        Date.now(), startsAt || null, endsAt || null, Math.max(0.05, Number(cpmUsd) || 0.4),
      ],
    );
    return { id, status: 'pending', estimatedCostUsd: round2((Math.max(1, Number(impressionsBudget) || 1000) / 1000) * (Number(cpmUsd) || 0.4)) };
  }

  async function listAdsFor(ownerId) {
    const list = await all('SELECT * FROM ad_campaigns WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50', [ownerId]);
    return list.map((a) => ({
      id: a.id, title: a.title, imageUrl: a.image_url, targetUrl: a.target_url, placement: a.placement,
      status: a.status, impressions: a.impressions, clicks: a.clicks, impressionsBudget: a.impressions_budget,
      cpmUsd: a.cpm_usd, estimatedCostUsd: round4((a.impressions / 1000) * a.cpm_usd),
      createdAt: a.created_at, startsAt: a.starts_at, endsAt: a.ends_at,
    }));
  }

  async function countAd(id, kind, ownerId = null) {
    const column = kind === 'click' ? 'clicks' : 'impressions';
    if (kind !== 'click' && kind !== 'impression') return { ok: false, reason: 'unknown-kind' };
    const ad = await get('SELECT id, owner_id, status FROM ad_campaigns WHERE id = ?', [String(id)]);
    if (!ad || ad.status !== 'active') return { ok: false, reason: 'not-active' };
    if (ownerId && ad.owner_id === ownerId) return { ok: true, ignored: 'own-view' };
    await db.run(`UPDATE ad_campaigns SET ${column} = ${column} + 1 WHERE id = ?`, [ad.id]);
    return { ok: true, kind };
  }

  async function setAdStatus(id, status) {
    if (!['pending', 'active', 'paused', 'rejected'].includes(status)) return { ok: false, reason: 'unknown-status' };
    await db.run('UPDATE ad_campaigns SET status = ? WHERE id = ?', [status, String(id)]);
    return { ok: true, id, status };
  }

  // ---------------------------------------------------------------- uploads
  async function recordUpload({ userId, path, mime, bytes, kind }) {
    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO uploads (id, user_id, path, mime, bytes, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, String(path).slice(0, 500), String(mime).slice(0, 60), Math.round(Number(bytes) || 0), String(kind).slice(0, 20), Date.now()],
    );
    return { id, path, mime, bytes: Number(bytes) || 0 };
  }

  async function uploadsOf(userId, limit = 40) {
    const list = await all('SELECT * FROM uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
    return list.map((u) => ({ id: u.id, url: `/uploads/${u.path}`, mime: u.mime, bytes: u.bytes, kind: u.kind, at: u.created_at }));
  }

  /**
   * Forget an upload from the account. The blob is only unlinked when no other row
   * still points at it (uploads are content-addressed, so two people can share one
   * file) — that check happens in the route, which owns the filesystem.
   */
  async function deleteUpload(userId, id) {
    const row = await get('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [String(id), userId]);
    if (!row) return { ok: false, reason: 'not-yours' };
    await db.run('DELETE FROM uploads WHERE id = ?', [row.id]);
    const others = await get('SELECT COUNT(*) AS n FROM uploads WHERE path = ?', [row.path]);
    return { ok: true, path: row.path, sharedByOthers: Number(others?.n ?? 0) > 0 };
  }

  async function deleteAllUploads(userId) {
    const mine = await all('SELECT path FROM uploads WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM uploads WHERE user_id = ?', [userId]);
    return { ok: true, removed: mine.length, paths: mine.map((r) => r.path) };
  }

  async function referencedUploadPaths() {
    const allPaths = await all('SELECT DISTINCT path FROM uploads');
    return allPaths.map((r) => r.path);
  }

  async function storageBytesUsed(userId) {
    const row = await get('SELECT COALESCE(SUM(bytes), 0) AS n FROM uploads WHERE user_id = ?', [userId]);
    return Number(row?.n ?? 0);
  }

  return {
    planFor,
    callStateFor,
    startCall,
    heartbeatCall,
    endCall,
    callHistory,
    listActiveAds,
    createAd,
    listAdsFor,
    countAd,
    setAdStatus,
    recordUpload,
    uploadsOf,
    deleteUpload,
    deleteAllUploads,
    referencedUploadPaths,
    storageBytesUsed,
    getProfile,
    saveProfile,
    decisionsOf,
    likesToday,
    undoDecision,
    findMatch,
    listMatches,
    thread,
    appendMessage,
    markRead,
    block,
    unblock,
    listBlocks,
    fileReport,
    listReports,
    isBlocked,
    verification,
    setVerification,
    setPremium,
    quotaFor,
    deckFor,
    evaluateSwipe,
    incomingLikes,
    realCandidates,
    createMatch,
  };
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
// Ad billing accumulates per impression, so a whole-cent rounding here would be a
// real amount of money given away on every campaign.
const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
function startOfTomorrow() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
