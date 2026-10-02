/**
 * Render smoke test.
 *
 * `vite build` proves the module graph compiles; it does not prove App() renders.
 * This boots Vite in middleware mode, loads the real React tree through SSR and
 * fails loudly if any component throws on first render. Run: `npm run smoke`.
 */
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

const noopStorage = () => {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  };
};

globalThis.localStorage = noopStorage();
globalThis.addEventListener = () => {};
globalThis.BroadcastChannel = class { constructor() { this.onmessage = null; } postMessage() {} close() {} };
globalThis.EventSource = class { constructor() { throw new Error('no realtime server in smoke test'); } };
globalThis.window = globalThis;
globalThis.document = {
  body: { style: {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
};
// Node 22 exposes `navigator` as a read-only global; geolocation is optional here.
if (!globalThis.navigator?.geolocation) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { geolocation: null, userAgent: 'romancha-smoke' },
    configurable: true,
  });
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

const failures = [];
const cases = [];

async function render(label, factory) {
  try {
    const node = factory();
    const element = React.isValidElement(node) ? node : React.createElement(node);
    const html = renderToStaticMarkup(element);
    cases.push({ label, length: html.length, html });
    return html;
  } catch (err) {
    failures.push(`${label}: ${err.stack?.split('\n').slice(0, 4).join(' | ')}`);
    return '';
  }
}

try {
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
  const html = await render('App (full page)', () => App);
  for (const needle of ['ROMANCHA', 'Discover', '18', 'profile']) {
    if (!html.includes(needle)) failures.push(`App HTML is missing "${needle}"`);
  }

  for (const [name, path] of [
    ['SwipeDeck', '/src/components/SwipeDeck.jsx'],
    ['InboxList', '/src/components/InboxList.jsx'],
    ['LikesYou', '/src/components/LikesYou.jsx'],
    ['SafetyCentre', '/src/components/SafetyCentre.jsx'],
    ['OnboardingWizard', '/src/components/OnboardingWizard.jsx'],
    ['PremiumSheet', '/src/components/PremiumSheet.jsx'],
    ['ChatThread', '/src/components/ChatThread.jsx'],
    ['AgeGate', '/src/components/AgeGate.jsx'],
    ['MatchFilters', '/src/components/MatchFilters.jsx'],
    ['ReelsVideoFeed', '/src/components/ReelsVideoFeed.jsx'],
    ['LiveChatLounge', '/src/components/LiveChatLounge.jsx'],
    ['StoryGrid', '/src/components/StoryGrid.jsx'],
    ['AdBanner', '/src/components/AdBanner.jsx'],
    ['LiveOnlineLoveMatch', '/src/components/LiveOnlineLoveMatch.jsx'],
    ['Navbar', '/src/components/Navbar.jsx'],
    ['MobileBottomNav', '/src/components/MobileBottomNav.jsx'],
    ['Footer', '/src/components/Footer.jsx'],
    ['ProfileStrengthMeter', '/src/components/ProfileStrengthMeter.jsx'],
    ['SmartImage', '/src/components/SmartImage.jsx'],
  ]) {
    const mod = await vite.ssrLoadModule(path);
    const Comp = mod.default;
    const props = {
      SwipeDeck: { onOpenChat: () => {}, onOpenPremium: () => {}, onOpenProfile: () => {}, onOpenSafety: () => {} },
      InboxList: { onOpenLikes: () => {}, onSwipe: () => {} },
      LikesYou: {},
      SafetyCentre: { open: true, onClose: () => {} },
      OnboardingWizard: { open: true, onClose: () => {}, onComplete: () => {} },
      PremiumSheet: { open: true, onClose: () => {} },
      ChatThread: { matchId: 'dl-aisha_karim', onClose: () => {} },
      AgeGate: {},
      MatchFilters: { open: true, onClose: () => {}, prefs: { ageMin: 20, ageMax: 45, distanceKm: 500 } },
      ReelsVideoFeed: { followingAuthors: [], onToggleFollow: () => {}, userProfile: {} },
      LiveChatLounge: { userProfile: { name: 'T', gender: 'Woman', country: 'Bangladesh', countryFlag: '🇧🇩', id: 'u1' } },
      StoryGrid: { stories: [], onReadStory: () => {}, bookmarkedIds: [], onToggleBookmark: () => {}, likedIds: [], onToggleLike: () => {} },
      AdBanner: {},
      LiveOnlineLoveMatch: {},
      Navbar: { activeTab: 'discover', setActiveTab: () => {}, onOpenWriteModal: () => {}, bookmarksCount: 2, onOpenBookmarks: () => {}, soundState: null, toggleSound: () => {}, userProfile: {}, onOpenProfileModal: () => {}, onOpenAuthModal: () => {} },
      MobileBottomNav: { activeTab: 'discover', setActiveTab: () => {}, onOpenProfileModal: () => {}, onOpenLikes: () => {} },
      Footer: { onOpenWriteModal: () => {}, setActiveTab: () => {} },
      ProfileStrengthMeter: { strength: { score: 60, missing: [], complete: false } },
      SmartImage: { name: 'Aisha', alt: 'Aisha' },
    }[name];
    await render(name, () => (props ? React.createElement(Comp, props) : React.createElement(Comp)));
  }
  // Second pass with a seeded account: this is the path a real user lands on
  // (profile built, one match, unread message) and the only way to render the
  // populated deck in a headless check.
  try {
    const { datingStore } = await vite.ssrLoadModule('/src/utils/datingStore.js');
    datingStore.updateProfile({
      id: 'me-seeded', name: 'Aisha', age: 25, gender: 'Woman', seeking: ['Men'],
      lookingFor: 'long_term', city: 'Dhaka', country: 'Bangladesh', countryFlag: '🇧🇩',
      location: { lat: 23.8103, lng: 90.4125 }, interests: ['Poetry', 'Bookshops', 'Filter coffee'],
      prompts: [{ q: 'A perfect Sunday looks like…', a: 'bookshop then river' }],
      photos: ['seeded-photo'], bio: 'Teacher who reads too much and cooks dangerously well.',
    });
    datingStore.updatePrefs({ ageMin: 18, ageMax: 70, distanceKm: 5000 });
    const likedBack = (await vite.ssrLoadModule('/src/data/datingProfiles.js')).datingProfiles.find((x) => x.likesMe);
    datingStore.swipe(likedBack.id, 'like');
    datingStore.sendText(likedBack.id, 'Okay, settle this: tea with or without sugar?');

    const seededHtml = await render('App (seeded account)', () => App);
    // The app opens on the deck, so assert deck copy + the match's name — not
    // inbox copy (that is covered by the targeted component renders below).
    for (const needle of ['people fit your filters', likedBack.name.split(' ')[0], 'Profile strength', 'likes left today', 'Filters']) {
      if (!seededHtml.includes(needle)) failures.push(`seeded App HTML is missing "${needle}"`);
    }
  } catch (err) {
    failures.push(`seeded pass: ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
  }
} catch (err) {
  failures.push(`module load: ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
} finally {
  await vite.close();
}

if (failures.length) {
  console.error(`\n✗ smoke test failed (${failures.length}):\n`);
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log(`✓ ${cases.length} render targets produced HTML (${cases.map((c) => `${c.label}:${c.length}`).join(', ')})`);
