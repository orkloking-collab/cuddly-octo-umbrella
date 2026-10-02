import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distanceKm, compatibility, buildDeck, profileStrength, likesBack, remainingLikes,
  formatDistance, genderMatch, likeBackProbability, FREE_DAILY_LIKES,
} from '../src/utils/matching.js';
import { CITIES } from '../src/data/datingProfiles.js';

const datingCities = () => CITIES;
import { datingProfiles, nearestCity } from '../src/data/datingProfiles.js';

const me = {
  id: 'me', name: 'Aisha', age: 25, gender: 'Woman', seeking: ['Men'],
  location: { lat: 23.8103, lng: 90.4125 }, city: 'Dhaka',
  interests: ['Poetry', 'Bookshops', 'Filter coffee'],
  lookingFor: 'long_term', photos: ['a', 'b', 'c'], verified: true,
  bio: 'x'.repeat(40), prompts: [{ q: 'a', a: 'b' }, { q: 'c', a: 'd' }],
  prefs: { ageMin: 22, ageMax: 34, distanceKm: 500 },
};

test('haversine: Dhaka -> Chattogram is ~240km', () => {
  const km = distanceKm({ lat: 23.8103, lng: 90.4125 }, { lat: 22.3569, lng: 91.7832 });
  assert.ok(km > 200 && km < 230, `got ${km}`); // straight line, road is ~240km
});

test('distance is symmetric and zero for the same point', () => {
  const a = { lat: 24.3745, lng: 88.6042 };
  const b = { lat: 41.0082, lng: 28.9784 };
  assert.equal(distanceKm(a, a), 0);
  assert.ok(Math.abs(distanceKm(a, b) - distanceKm(b, a)) < 0.001);
});

test('bad coordinates return null instead of NaN', () => {
  assert.equal(distanceKm({ lat: 'x', lng: 1 }, { lat: 1, lng: 1 }), null);
  assert.equal(distanceKm(null, { lat: 1, lng: 1 }), null);
});

test('compatibility is bounded 3-99 and explains itself', () => {
  for (const p of datingProfiles) {
    const { score, reasons } = compatibility(me, p);
    assert.ok(score >= 3 && score <= 99, `${p.id}: ${score}`);
    assert.ok(Array.isArray(reasons));
  }
});

test('shared interests raise the score for the same person', () => {
  const plain = compatibility({ ...me, interests: [] }, datingProfiles[1]).score;
  const tuned = compatibility({ ...me, interests: datingProfiles[1].interests }, datingProfiles[1]).score;
  assert.ok(tuned > plain, `${tuned} !> ${plain}`);
});

test('deck respects gender, age, verified and block filters', () => {
  const woman = datingProfiles.find((p) => p.gender === 'Woman' && p.seeking.includes('Men'));
  const deck = buildDeck(datingProfiles, me, { blockedIds: [woman.id] });
  assert.ok(deck.every((c) => genderMatch(me, c)), 'every card must match my preference');
  assert.ok(!deck.some((c) => c.id === woman.id), 'blocked profile must not appear');
  assert.ok(deck.every((c) => c.age >= 22 && c.age <= 34), 'age range must be enforced');
  assert.ok(deck.every((c) => c.match.score >= 3));
});

test('decided profiles drop out of the deck, undo data is separate', () => {
  const withDecisions = buildDeck(datingProfiles, me, { alreadyDecided: { 'dl-noor_rahman': 'like' } });
  assert.ok(!withDecisions.some((c) => c.id === 'dl-noor_rahman'));
});

test('verifiedOnly filter shrinks or matches the deck', () => {
  const all = buildDeck(datingProfiles, { ...me, prefs: { ...me.prefs, verifiedOnly: false } });
  const verified = buildDeck(datingProfiles, { ...me, prefs: { ...me.prefs, verifiedOnly: true } });
  assert.ok(verified.length <= all.length);
  assert.ok(verified.every((c) => c.verified));
});

test('profileStrength is monotone in the things it measures', () => {
  const bare = profileStrength({ name: 'A', age: 25 });
  const full = profileStrength({
    name: 'Aisha Rahman', age: 25, photos: [1, 2, 3], bio: 'y'.repeat(60),
    interests: [1, 2, 3], prompts: [{}, {}], lookingFor: 'long_term',
  });
  assert.ok(bare.score < 45, `bare=${bare.score}`);
  assert.equal(full.score, 100);
  assert.ok(full.complete);
  assert.ok(bare.missing.some((m) => m.key === 'photos'));
});

test('likesBack is deterministic per pair', () => {
  const target = datingProfiles.find((p) => !p.likesMe);
  const a = likesBack(me, target, 'like');
  const b = likesBack(me, target, 'like');
  assert.equal(a, b);
});

test('likeBackProbability rewards effort and stays bounded', () => {
  const target = datingProfiles[0];
  const bare = likeBackProbability({ id: 'e', name: '', interests: [], photos: [] }, target, 'like');
  const strong = likeBackProbability(me, target, 'like');
  assert.ok(strong > bare, `strong=${strong} bare=${bare}`);
  assert.ok(strong <= 0.78 && strong >= 0.02);
  assert.equal(likeBackProbability(me, { ...target, likesMe: true }, 'like'), 1);
  assert.ok(likeBackProbability(me, target, 'super') > strong);
});

test('a super like never converts worse than a plain like', () => {
  let superWins = 0;
  let likeWins = 0;
  for (const p of datingProfiles) {
    const cand = { ...p, match: compatibility(me, p) };
    if (likesBack(me, cand, 'like')) likeWins += 1;
    if (likesBack(me, cand, 'super')) superWins += 1;
  }
  assert.ok(superWins >= likeWins, `super=${superWins} like=${likeWins}`);
});

test('complete profiles get more matches than empty ones', () => {
  const empty = { id: 'x', name: '', interests: [], photos: [] };
  let s1 = 0;
  let s2 = 0;
  for (const p of datingProfiles) {
    const cand = { ...p, match: compatibility(empty, p) };
    if (likesBack(empty, cand, 'like')) s1 += 1;
    if (likesBack(me, { ...p, match: compatibility(me, p) }, 'like')) s2 += 1;
  }
  assert.ok(s2 > s1, `empty=${s1} complete=${s2}`);
  assert.ok(s2 >= 1, 'a complete profile must match with someone in this dataset');
});

test('free tier caps likes, premium does not', () => {
  assert.equal(remainingLikes(0, false), FREE_DAILY_LIKES);
  assert.equal(remainingLikes(FREE_DAILY_LIKES, false), 0);
  assert.equal(remainingLikes(999, false), 0);
  assert.equal(remainingLikes(999, true), Infinity);
});

test('distance copy never prints NaN', () => {
  assert.equal(formatDistance(null), 'Distance hidden');
  assert.equal(formatDistance(0.4), '<1 km away');
  assert.equal(formatDistance(12.34), '12.3 km away');
  assert.equal(formatDistance(900), '900 km away');
});

test('nearestCity resolves a Rajshahi Division coordinate and never throws', () => {
  assert.equal(nearestCity(24.37, 88.60).name, 'Rajshahi');
  const nullIsland = nearestCity(0, 0);
  assert.ok(datingCities().some((c) => c.name === nullIsland.name));
  assert.equal(nearestCity(undefined, undefined).name, 'Rajshahi'); // fallback
});

test('dataset integrity: unique ids, sane ages, real coordinates', () => {
  const ids = new Set(datingProfiles.map((p) => p.id));
  assert.equal(ids.size, datingProfiles.length);
  for (const p of datingProfiles) {
    assert.ok(p.age >= 18 && p.age <= 80, `${p.id} age ${p.age}`);
    assert.ok(Number.isFinite(p.location.lat) && Math.abs(p.location.lat) <= 90);
    assert.ok(Number.isFinite(p.location.lng) && Math.abs(p.location.lng) <= 180);
    assert.ok(p.interests.length >= 3, `${p.id} needs interests to score against`);
    assert.ok(p.bio.length > 40, `${p.id} bio too short`);
  }
});
