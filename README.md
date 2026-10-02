# Romancha

An 18+ dating app with a literature problem: it is built around romance writers, so
the profile deck, the conversations and the community feed all pull in the same
direction — *say something specific or get passed on*.

This repo is a **client-side prototype**. It is deliberately honest about which parts
are real and which are simulated (see [What is real](#what-is-real)).

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  — dev server + realtime API
npm run build      # production bundle into dist/
npm start          # serve dist/ + the same realtime API on :3000
npm test           # 39 unit tests (matching engine + dating store + chat engine)
npm run smoke      # renders 21 real components through React SSR and fails on any throw
npm run lint       # oxlint over src/, server/, tests/, scripts/
```

Requires Node ≥ 20.11 (uses `node --test` and Web Crypto-free code paths).

---

## The dating core

| Surface | File | What it does |
| --- | --- | --- |
| Age gate | `src/components/AgeGate.jsx` | DOB entry, real age computation, 18+ only, remembered locally |
| Onboarding | `src/components/OnboardingWizard.jsx` | 7 steps: identity → intent → city (geolocation or manual) → interests → bio & prompts → photos → review, with a live preview of your own card |
| Deck | `src/components/SwipeDeck.jsx` | Pointer-drag cards with rotation, photo carousel, prompts on the card, compatibility ring, Like / Nope / Super Like / Rewind / Report, full keyboard control, "It's a match" flow that seeds the first message |
| Nearby radar | `src/components/LiveOnlineLoveMatch.jsx` | The same people as the deck, grid view; "Send love" performs a real like |
| Matches / inbox | `src/components/InboxList.jsx` | Unread pressure, expiring-match warnings, activity + live ticker |
| 1:1 chat | `src/components/ChatThread.jsx` | Typing indicator, quick replies built from *their* profile, photo/voice stubs, safe-check timer, video-date handoff, unmatch/report |
| Likes you | `src/components/LikesYou.jsx` | Incoming likes, blurred until revealed (2 free/day), like-back = instant match |
| Filters | `src/components/MatchFilters.jsx` | Age range, distance, verified-only, online-only, hide-me, incognito (Gold), hide-distance, video-call consent |
| Trust & Safety | `src/components/SafetyCentre.jsx` | Photo verification state machine, date-safety playbook, report+block (blocks are real and enforced in the deck), privacy controls, export/delete my data |
| Gold | `src/components/PremiumSheet.jsx` | Plans + perks, clearly-labelled demo checkout (no payment code) |

State lives in `src/utils/datingStore.js` (single versioned key `romancha_dating_v1`,
debounced persistence, `BroadcastChannel` + `storage` cross-tab sync) and scoring lives in
`src/utils/matching.js` (pure functions: haversine distance, weighted compatibility with
human-readable reasons, deck filtering, profile strength, deterministic like-back).

The 24-hour "say something or it expires" rule is enforced on load: an unanswered,
silent match disappears; a match you already talked to becomes history and stays.

## Architecture

```
index.html                     entry, meta, fonts only — no third-party scripts
public/                        favicon, og image
src/
  main.jsx  App.jsx  index.css
  components/  *.jsx           presentation + interaction
  utils/       datingStore.js matching.js chatEngine.js authStore.js
               realtimeHub.js useDating.js imageResize.js photoFallback.js ageVerification.js
  data/        datingProfiles.js mockData.js mockCommunityData.js
server/
  realtimeApi.mjs              SSE hub: /api/realtime/{stream,publish,presence,health}
  index.mjs                    static + API production server, hardening headers, SPA fallback
tests/                          node --test, no framework
scripts/ssr-smoke.mjs           Vite SSR render pass over the real component tree
```

`server/realtimeApi.mjs` is imported by **both** `vite.config.js` (dev + preview) and
`server/index.mjs` (production), so the API exists in every mode. It used to live inside
`vite.config.js`, which meant a production build shipped with no backend at all.

## What is real

Real, working behaviour:

- age gate, onboarding, profile persistence, profile-strength scoring
- deck ordering by weighted compatibility, filters, like budget, super-like rationing, rewind
- mutual-like matching, match expiry, inbox with unread counts, blocks, reports, verification state
- photos: files are resized in-browser (canvas, 720 px max) and stored locally — nothing is uploaded
- cross-tab realtime sync; the dev/prod server relays to other devices on the same origin

Simulated on purpose (and labelled as such in the UI):

- the people in `src/data/datingProfiles.js` are fictional, and their replies come from
  `src/utils/chatEngine.js` — persona-driven, not an LLM
- Gold checkout is a demo; there is no payment provider
- "video call" and voice notes are UI stubs (no WebRTC yet)
- accounts, sessions and "passwords" live in `localStorage`. `authStore` now salts and hashes
  them and rate-limits failed logins, which stops plaintext leaks — it is **not**
  authentication. A real launch needs a server: sessions in httpOnly cookies, argon2id,
  rate limits, moderation queue, photo review.

## Safety model (why some of the code looks opinionated)

- Guardrails run before personality: harassment, money requests, sexual pressure and age
  probes are intercepted in `replyTo()` and turn into a boundary + a Report path, never a flirty reply
- Report = report + block + unmatch, and blocked profiles are removed from the deck at the
  `buildDeck()` level (unit-tested), not just hidden in the UI
- No popunders, no ad networks, no trackers. `AdBanner.jsx` serves first-party placements only.
  The previous build injected third-party `document.write` ad iframes and a popunder script
  into an adult dating app — that is the fastest way to lose both users and ad networks.
- Every `<img>` goes through `SmartImage`, which falls back to a locally generated portrait
  tile, so a dead remote URL never shows a broken image

## Notes

- `index.css` previously requested a Bengali font stack (`Hind Siliguri`, `Noto Serif Bengali`)
  that was never loaded and whose `.font-serif-bn` class was unused. All copy is English, so
  the stack is now Plus Jakarta Sans / Playfair Display / Cinzel, matching what `index.html` loads.
- Dead files removed: `App.css`, `FloatingChatWidget.jsx`, `GmailAuthModal.jsx`,
  `StrategyGuideView.jsx` (an internal business note rendered as a user tab),
  `SwipeMatchDeck.jsx` (replaced by `SwipeDeck.jsx`), `proxy3000.mjs`.
- `.oxlintrc.json` was committed as `oxlintrc.json` (missing dot), so the config was never
  read and `oxlint` linted `node_modules` — 19,078 warnings. Now: 0 errors.
- The old `.gitignore` was committed as a file named `download`.
