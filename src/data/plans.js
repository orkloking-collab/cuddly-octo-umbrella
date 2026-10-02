/**
 * The pricing + entitlement catalogue, imported by BOTH the client (PremiumSheet,
 * quota copy) and the server (enforcement). One file, so a price shown in the UI
 * can never disagree with the limit the API applies.
 *
 * Product shape, deliberately cheap-first:
 *   - a free tier that is genuinely usable but time-limited on video calls
 *   - a $1 day pass, which is the real ask: "let me talk to this one person today"
 *   - longer plans that add reach and privacy controls, not just more of the same
 *
 * Prices are USD with a BDT anchor because the app is Bangladesh-first. A payment
 * provider is still NOT wired up: buying a plan sets a flag on the account and the
 * checkout says so out loud. Nothing here charges anybody.
 */

export const MINUTE = 60;
export const HOUR = 3600;

export const FREE_PLAN = {
  id: 'free',
  label: 'Free',
  priceUsd: 0,
  priceBdt: 0,
  days: null,
  blurb: 'Everything that makes a match talk, with a clock on video dates.',
  dailyCallSeconds: 20 * MINUTE,
  dailyLikes: 25,
  superLikesPerWeek: 3,
  revealsPerDay: 2,
  noAds: false,
  incognito: false,
  hideDistance: false,
  boostsPerPeriod: 0,
  readReceipts: true,
  perks: [
    '25 likes a day, 3 super likes a week',
    '20 minutes of video calling per 24 hours',
    'Unlimited text chat with every match',
    'Photo + voice notes in chat',
    'Report, block and the safety centre',
  ],
};

export const PLANS = [
  {
    id: 'day',
    label: 'Day Pass',
    priceUsd: 1,
    priceBdt: 120,
    days: 1,
    badge: 'start here',
    blurb: 'One evening, no clock in the middle of a good conversation.',
    dailyCallSeconds: 2 * HOUR,
    dailyLikes: 100,
    superLikesPerWeek: 7,
    revealsPerDay: 5,
    noAds: true,
    incognito: false,
    hideDistance: false,
    boostsPerPeriod: 1,
    readReceipts: true,
    perks: [
      '2 hours of video calling today',
      '100 likes, 7 super likes',
      'No ads while it runs',
      '1 boost',
    ],
  },
  {
    id: 'week',
    label: 'Week',
    priceUsd: 4,
    priceBdt: 480,
    days: 7,
    blurb: 'A week of talking properly — 3 hours of calls a day.',
    dailyCallSeconds: 3 * HOUR,
    dailyLikes: 150,
    superLikesPerWeek: 14,
    revealsPerDay: 10,
    noAds: true,
    incognito: true,
    hideDistance: false,
    boostsPerPeriod: 3,
    readReceipts: true,
    perks: [
      '3 hours of video calling per day',
      'Incognito: you only appear to people you like',
      '3 boosts, no ads',
    ],
  },
  {
    id: 'month',
    label: 'Month',
    priceUsd: 8,
    priceBdt: 950,
    days: 30,
    badge: 'best value',
    blurb: 'The full toolkit, 4 hours of calls a day.',
    dailyCallSeconds: 4 * HOUR,
    dailyLikes: 300,
    superLikesPerWeek: 30,
    revealsPerDay: null,
    noAds: true,
    incognito: true,
    hideDistance: true,
    boostsPerPeriod: 8,
    readReceipts: true,
    perks: [
      '4 hours of video calling per day',
      'Unlimited Likes-You reveals',
      'Hide distance, incognito, 8 boosts',
    ],
  },
  {
    id: 'season',
    label: 'Season',
    priceUsd: 15,
    priceBdt: 1750,
    days: 90,
    blurb: 'Nine months of the Month plan for five — for slow burners.',
    dailyCallSeconds: 5 * HOUR,
    dailyLikes: 300,
    superLikesPerWeek: 30,
    revealsPerDay: null,
    noAds: true,
    incognito: true,
    hideDistance: true,
    boostsPerPeriod: 24,
    readReceipts: true,
    perks: [
      'Everything in Month, for 90 days',
      '5 hours of calls a day',
      'Cheapest per day we sell',
    ],
  },
];

export const AD_CPM_USD = 0.4;

export function planById(id) {
  if (!id) return FREE_PLAN;
  return PLANS.find((p) => p.id === id) || FREE_PLAN;
}

/**
 * A paid plan expires. `premium_since` is when it was bought; the day count runs
 * from there, so nobody can buy a Day Pass and keep "premium" forever.
 */
export function effectivePlan(user, now = Date.now()) {
  const plan = planById(user?.premiumPlan || user?.premium_plan);
  if (plan.id === 'free') return { plan, active: false, expiresAt: null };
  const since = user?.premiumSince ?? user?.premium_since ?? now;
  const expiresAt = since + plan.days * 24 * 3600_000;
  if (expiresAt <= now) return { plan: FREE_PLAN, active: false, expiresAt: null, expiredId: plan.id };
  return { plan, active: true, expiresAt };
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / HOUR);
  const m = Math.floor((s % HOUR) / MINUTE);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function priceLabel(plan) {
  if (!plan.priceUsd) return 'Free';
  return `$${plan.priceUsd}${plan.priceBdt ? ` · ৳${plan.priceBdt.toLocaleString('en-US')}` : ''}`;
}
