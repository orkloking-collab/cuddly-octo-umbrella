/**
 * Matching engine — pure, framework-free, unit-testable.
 * No side effects, no DOM, no randomness without a seed (so a user's
 * "results" are stable across reloads instead of feeling like a slot machine).
 */

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km between two {lat,lng} points. */
export function distanceKm(a, b) {
  if (!isCoord(a) || !isCoord(b)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isCoord(p) {
  return (
    p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

/** Deterministic 32-bit string hash (FNV-1a). Same input -> same output, always. */
export function hashKey(str) {
  let h = 0x811c9dc5;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Stable pseudo-random float in [0,1) derived from a seed string. */
export function seededUnit(seed) {
  return (hashKey(seed) % 100000) / 100000;
}

export function formatDistance(km) {
  if (km == null) return 'Distance hidden';
  if (km < 1) return '<1 km away';
  if (km < 20) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/**
 * Mutual gender preference: does this candidate fit who I am seeking, and do I
 * fit what they are seeking? Plural ("Men") and singular ("Man") spellings are
 * normalised, because a mismatch here hides the whole deck.
 */
export function genderMatch(me, candidate) {
  const mySeeking = (me?.seeking?.length ? me.seeking : ['Anyone']).map(normGender);
  const candGender = normGender(candidate?.gender);
  const openToMe = mySeeking.includes('Anyone') || (candGender && mySeeking.includes(candGender));

  const theirSeeking = (candidate?.seeking?.length ? candidate.seeking : ['Anyone']).map(normGender);
  const myGender = normGender(me?.gender);
  // If I have not stated a gender, do not silently filter me out of everyone's deck.
  const iAmOpenToThem =
    !myGender || theirSeeking.includes('Anyone') || theirSeeking.includes(myGender);

  return Boolean(openToMe) && iAmOpenToThem;
}

const GENDER_ALIASES = {
  woman: 'Woman', women: 'Woman', female: 'Woman',
  man: 'Man', men: 'Man', male: 'Man',
  'non-binary': 'Non-binary', nonbinary: 'Non-binary', 'non binary': 'Non-binary', nb: 'Non-binary', genderqueer: 'Non-binary',
  anyone: 'Anyone', everybody: 'Anyone', everyone: 'Anyone', all: 'Anyone',
};

export function normGender(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return GENDER_ALIASES[raw.replace(/[^a-z-]/g, '')] || (raw.charAt(0).toUpperCase() + raw.slice(1));
}
/**
 * Compatibility score, 0-100, weighted and explainable.
 * Interests carry the most weight, then preference fit, then intent alignment.
 */
export function compatibility(me, candidate) {
  const reasons = [];
  let score = 0;

  // 1. Shared interests — up to 45 pts
  const mine = new Set((me?.interests || []).map(normalise));
  const theirs = candidate?.interests || [];
  const shared = theirs.filter((i) => mine.has(normalise(i)));
  if (theirs.length) {
    const overlap = shared.length / Math.max(3, Math.min(theirs.length, 8));
    score += Math.round(clamp(overlap, 0, 1) * 45);
    if (shared.length) reasons.push({ label: `${shared.length} shared interest${shared.length > 1 ? 's' : ''}`, icon: '✨' });
  }

  // 2. Base affinity from the seeded pairing — 12 pts, but *stable*
  const affinity = 0.35 + seededUnit(`${me?.id || 'guest'}::${candidate?.id}`) * 0.65;
  score += Math.round(affinity * 12);

  // 3. Age preference fit — up to 15 pts
  const prefs = me?.prefs || {};
  if (candidate?.age) {
    const min = prefs.ageMin ?? 18;
    const max = prefs.ageMax ?? 99;
    if (candidate.age >= min && candidate.age <= max) {
      score += 15;
      reasons.push({ label: `Within your age range (${min}-${max})`, icon: '🎂' });
    } else {
      const drift = candidate.age < min ? min - candidate.age : candidate.age - max;
      score += Math.max(0, 10 - drift * 4);
    }
  }

  // 4. Same intent ("looking for") — 12 pts
  if (me?.lookingFor && candidate?.lookingFor) {
    if (me.lookingFor === candidate.lookingFor) {
      score += 12;
      reasons.push({ label: `Both looking for: ${LABELS[me.lookingFor] || me.lookingFor}`, icon: '🎯' });
    } else if (PAIRABLE.has(`${me.lookingFor}>${candidate.lookingFor}`)) {
      score += 7;
      reasons.push({ label: 'Compatible intentions', icon: '🤝' });
    } else {
      score -= 8;
      reasons.push({ label: 'Different relationship goals', icon: '⚠️' });
    }
  }

  // 5. Proximity — up to 16 pts
  const km = distanceKm(me?.location, candidate?.location);
  if (km != null) {
    const proximity = clamp(1 - km / 120, 0, 1);
    score += Math.round(proximity * 16);
    if (km <= 25) reasons.push({ label: formatDistance(km), icon: '📍' });
  } else if (candidate?.city) {
    score += 6;
    reasons.push({ label: `In ${candidate.city}`, icon: '📍' });
  }

  // 6. Trust signals
  if (candidate?.verified) {
    score += 5;
    reasons.push({ label: 'Photo verified', icon: '✅' });
  }
  if (candidate?.respondsUsually === 'slowly') score -= 3;

  // 7. Blocked / reported candidates are never surfaced (handled by caller)
  return { score: Math.round(clamp(score, 3, 99)), reasons, sharedInterests: shared, distanceKm: km };
}

const PAIRABLE = new Set([
  'long_term>dates',
  'dates>long_term',
  'long_term>life_partner',
  'life_partner>long_term',
  'new_friends>dates',
  'dates>short_term',
  'short_term>dates',
  'long_term>short_term',
]);

const LABELS = {
  life_partner: 'Life partner',
  long_term: 'Long-term relationship',
  dates: 'Dating first, see where it goes',
  short_term: 'Something casual',
  new_friends: 'New friends',
  networking: 'Creative collaborators',
};

export function intentLabel(value) {
  return LABELS[value] || 'Still figuring it out';
}

function normalise(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[.!]$/, '');
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Sort deck: intent + gender + age + distance + verified filters first, then compatibility desc. */
export function buildDeck(candidates, me, options = {}) {
  const { blockedIds = [], reportedIds = [], alreadyDecided = {}, limit = 60 } = options;
  const prefs = me?.prefs || {};
  const excluded = new Set([...blockedIds, ...reportedIds]);

  return candidates
    .filter((c) => !excluded.has(c.id))
    .filter((c) => !alreadyDecided[c.id])
    .filter((c) => genderMatch(me, c))
    // Age is a hard filter (legal + intent), not just a scoring nudge.
    .filter((c) => {
      if (!c.age) return false;
      if (c.age < 18) return false;
      const min = prefs.ageMin ?? 18;
      const max = prefs.ageMax ?? 99;
      return c.age >= min && c.age <= max;
    })
    .filter((c) => {
      if (prefs.verifiedOnly && !c.verified) return false;
      if (prefs.onlineOnly && !(c.online || c.lastActiveMins < 60)) return false;
      if (c.hidden) return false;
      const km = distanceKm(me?.location, c.location);
      if (km != null && prefs.distanceKm && km > prefs.distanceKm) return false;
      return true;
    })
    .map((c) => ({ ...c, match: compatibility(me, c) }))
    .sort((a, b) => {
      if (options.prioritiseLikes && a.likesMe !== b.likesMe) return a.likesMe ? -1 : 1;
      return b.match.score - a.match.score;
    })
    .slice(0, limit);
}

/** Free-tier like budget. Premium removes the cap. */
export const FREE_DAILY_LIKES = 25;
export const SUPER_LIKES_PER_WEEK = 2;

export function remainingLikes(todayCount, isPremium) {
  if (isPremium) return Infinity;
  return Math.max(0, FREE_DAILY_LIKES - (todayCount || 0));
}

/**
 * Profile strength: real dating apps gate reach behind a complete profile,
 * because thin profiles get ~2x fewer matches. 7 weighted signals, 0-100.
 */
export function profileStrength(profile) {
  const checks = [
    { key: 'name', weight: 10, label: 'Add your name', done: Boolean(profile?.name && profile.name.trim().length > 1) },
    {
      key: 'age',
      weight: 10,
      label: 'Confirm you are 18+',
      done: Number.isInteger(profile?.age) && profile.age >= 18,
    },
    { key: 'photos', weight: 25, label: 'Add at least 2 photos', done: (profile?.photos?.length || 0) >= 2 },
    { key: 'bio', weight: 15, label: 'Write a short bio', done: (profile?.bio || '').trim().length >= 30 },
    { key: 'interests', weight: 15, label: 'Pick 3+ interests', done: (profile?.interests?.length || 0) >= 3 },
    { key: 'prompts', weight: 15, label: 'Answer 2 prompts', done: (profile?.prompts?.length || 0) >= 2 },
    { key: 'intent', weight: 10, label: 'Say what you want', done: Boolean(profile?.lookingFor) },
  ];
  const score = checks.reduce((acc, c) => acc + (c.done ? c.weight : 0), 0);
  const missing = checks.filter((c) => !c.done);
  return {
    score,
    complete: missing.length === 0,
    missing,
    headline:
      score >= 95
        ? 'Standout profile'
        : score >= 70
          ? 'Almost there — one more step'
          : score >= 45
            ? 'Good start, keep going'
            : 'Barely visible to others',
  };
}

/**
 * Would this person like me back? Deterministic per pair, but nudged by how
 * complete and trustworthy my own profile is — so effort actually pays off.
 */
/**
 * Probability that this person likes you back, then compared against a stable
 * per-pair draw. Effort is what moves the number: photos, prompts, verification
 * and shared interests all raise it; a super like raises it a lot. Deliberately
 * capped so swiping everything still performs badly — that is the point of a
 * like budget.
 */
export function likeBackProbability(me, candidate, kind = 'like') {
  const strength = profileStrength(me).score / 100;
  const sharedCount =
    candidate.match?.sharedInterests?.length ?? intersectionCount(me?.interests, candidate?.interests);
  const photoCount = me?.photos?.length || 0;
  const promptCount = me?.prompts?.length || 0;
  const bioLen = (me?.bio || '').trim().length;

  let p = 0.06; // cold baseline for an empty profile
  p += strength * 0.26; // complete profile
  p += Math.min(0.12, sharedCount * 0.04); // genuine overlap
  p += Math.min(0.09, photoCount * 0.03); // showing your face
  p += Math.min(0.05, promptCount * 0.02); // giving them something to reply to
  p += bioLen >= 120 ? 0.03 : 0;
  p += me?.verified ? 0.05 : 0;
  p += me?.boosting ? 0.05 : 0; // an active Boost puts you at the top of local decks
  p -= Math.min(0.12, (candidate.ageGapPenalty || 0) * 0.02);
  if (kind === 'super') p *= 1.9; // super likes convert far better
  if (candidate.likesMe) return 1; // they already said yes
  return clamp(p, 0.02, 0.78);
}

export function likesBack(me, candidate, kind = 'like') {
  const draw = seededUnit(`${candidate.id}::${me?.id || 'guest'}::back`);
  return draw < likeBackProbability(me, candidate, kind);
}

function intersectionCount(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  const setA = new Set(a.map((v) => normalise(v)));
  return b.filter((v) => setA.has(normalise(v))).length;
}

/** Small public helper used by the UI to explain a score. */
export function scoreBand(score) {
  if (score >= 82) return { label: 'Exceptional match', tone: 'emerald' };
  if (score >= 68) return { label: 'Strong match', tone: 'rose' };
  if (score >= 50) return { label: 'Worth a hello', tone: 'amber' };
  return { label: 'Long shot', tone: 'slate' };
}
