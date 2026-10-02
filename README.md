# Romancha

An 18+ dating app with a literature problem: it is built around romance writers, so
the profile deck, the conversations and the community feed all pull in the same
direction — *say something specific or get passed on*.

It runs in two modes, and both are honest about what they are:

- **Server mode** (`npm run dev` / `npm start`) — real accounts, sessions, matches, chats,
  blocks, reports, phone verification, chat photo/voice uploads, metered video dates and
  WebRTC signalling, backed by SQLite (or Postgres).
- **Local mode** (a static build with no API) — the same UI on `localStorage`, no accounts.

It is also an installable web app: `public/manifest.webmanifest`, generated icons and a service
worker, so "Add to home screen" on Android/iOS gives a standalone window with an offline shell.
There is no Play Store or App Store build — that needs a signed bundle, a developer account and
an 18+ content review, none of which a code change can fake.

Which parts are simulated is stated in [What is real](#what-is-real). Nothing here pretends a
demo persona is a human being.


---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  — dev server + realtime API
npm run build      # production bundle into dist/
npm start          # serve dist/ + the same realtime API on :3000
npm test           # 73 tests: matching engine, dating store, WebRTC call state machine, HTTP API end-to-end
npm run smoke      # renders 33 component targets through React SSR, asserts UI copy, fails on any throw
npm run lint       # oxlint over src/, server/, tests/, scripts/
npm run icons      # regenerate public/icons/*.png for the PWA manifest
```

Requires Node ≥ 20.11. The database driver is `node:sqlite` (built into Node), so a fresh clone
has a working backend with zero extra installs — no Docker, no Postgres, no API keys.

```bash
npm install pg                     # only if you want Postgres instead of SQLite
DATABASE_URL=postgres://… npm run dev
```

---

## The dating core

| Surface | File | What it does |
| --- | --- | --- |
| Age gate | `src/components/AgeGate.jsx` | DOB entry, real age computation, 18+ only, remembered locally |
| Onboarding | `src/components/OnboardingWizard.jsx` | 7 steps: identity → intent → city (geolocation or manual) → interests → bio & prompts → photos → review, with a live preview of your own card |
| Deck | `src/components/SwipeDeck.jsx` | Pointer-drag cards with rotation, photo carousel, prompts on the card, compatibility ring, Like / Nope / Super Like / Rewind / Report, full keyboard control, "It's a match" flow that seeds the first message |
| Nearby radar | `src/components/LiveOnlineLoveMatch.jsx` | The same people as the deck, grid view; "Send love" performs a real like |
| Matches / inbox | `src/components/InboxList.jsx` | Unread pressure, expiring-match warnings, activity + live ticker |
| 1:1 chat | `src/components/ChatThread.jsx` | Typing indicator, quick replies built from *their* profile, **real** photo picker + in-thread camera + microphone-recorded voice notes (uploaded, stored, playable, deletable), safe-check timer, video-date handoff, unmatch/report |
| Likes you | `src/components/LikesYou.jsx` | Incoming likes, blurred until revealed (2 free/day), like-back = instant match |
| Filters | `src/components/MatchFilters.jsx` | Age range, distance, verified-only, online-only, hide-me, incognito (Gold), hide-distance, video-call consent |
| Trust & Safety | `src/components/SafetyCentre.jsx` | Photo verification state machine, date-safety playbook, report+block (blocks are real and enforced in the deck), privacy controls, export/delete my data |
| Premium | `src/components/PremiumSheet.jsx` | Plans from $1/day with the exact perks each one buys, rendered from the same catalogue the API enforces; labelled demo checkout (no payment code) |
| Video-date minutes | `src/components/VideoCallModal.jsx` | 20 free minutes per 24 h, metered by the server; countdown in the call, auto-wrap-up, upsell at zero |
| Reels | `src/components/ReelsVideoFeed.jsx` + `MobileBottomNav.jsx` | Vertical feed, now reachable from the phone tab bar (it used to exist only in the desktop navbar) |
| Ads | `src/components/AdManagerSheet.jsx` + `AdBanner.jsx` | First-party campaign creation, review states, impression/click counters |
| Install | `src/components/InstallAppPrompt.jsx`, `src/utils/pwa.js` | Manifest + service worker + native install prompt (iOS gets the manual instructions) |

State lives in `src/utils/datingStore.js` (single versioned key `romancha_dating_v1`,
debounced persistence, `BroadcastChannel` + `storage` cross-tab sync, mirrored to the API through
`src/utils/serverSync.js`) and scoring lives in
`src/utils/matching.js` (pure functions: haversine distance, weighted compatibility with
human-readable reasons, deck filtering, profile strength, deterministic like-back).

The 24-hour "say something or it expires" rule is enforced on load: an unanswered,
silent match disappears; a match you already talked to becomes history and stays.

## Architecture

```
index.html                     entry, meta, fonts only — no third-party scripts
public/                        favicon, og image, manifest.webmanifest, sw.js, offline.html, icons/
src/
  main.jsx  App.jsx  index.css
  components/  *.jsx           presentation + interaction
  utils/       datingStore.js matching.js chatEngine.js authStore.js
               realtimeHub.js useDating.js imageResize.js photoFallback.js ageVerification.js
               mediaApi.js googleAuth.js pwa.js serverSync.js webrtcCall.js apiClient.js
  data/        datingProfiles.js mockData.js mockCommunityData.js plans.js
server/
  db.mjs                       schema + migrations; node:sqlite or pg behind one interface
  repo.mjs                     domain data access: profiles, deck, swipes, matches, chat, blocks
  auth.mjs                     scrypt passwords, httpOnly session cookies, CSRF, lockouts
  otp.mjs                      6-digit codes: hashed at rest, expiry, attempt + send limits, providers
  uploads.mjs                  content-addressed media store: type + size validation, immutable serving, sweep
  google.mjs                   Google ID-token verification (never a Google password)
  api.mjs                      the HTTP API (routes below)
  realtimeApi.mjs              SSE hub: /api/realtime/{stream,publish,presence,signal,health}
  backend.mjs                  wires db + api + realtime into one middleware (dev and prod share it)
  index.mjs                    static + API production server, hardening headers, SPA fallback
tests/                          node --test, no framework
scripts/ssr-smoke.mjs           Vite SSR render pass over the real component tree
```

`src/utils/serverSync.js` is the client half: it hydrates `datingStore` from `/api/state`,
mirrors every mutation to the API in the background, and folds SSE pushes back in. If the API
is missing it becomes a no-op, which is what makes local mode safe rather than broken.

`server/backend.mjs` is mounted by **both** `vite.config.js` (dev + preview) and
`server/index.mjs` (production), so the API exists in every mode and there is only one place to
change it. It used to live inside `vite.config.js`, which meant a production build shipped with
no backend at all.

## Backend

| Area | Route |
| --- | --- |
| session | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| state | `GET /api/state` (profile, prefs, decisions, matches, blocks, reports, verification, quota) |
| dating | `GET /api/deck`, `POST /api/swipe`, `POST /api/undo`, `GET /api/likes`, `PUT /api/profile` |
| chat | `GET /api/matches`, `GET/POST /api/matches/:id[/messages]`, `POST /api/matches/:id/read` |
| safety | `POST/DELETE /api/blocks`, `POST /api/reports`, `GET /api/admin/queue` |
| trust | `POST /api/verify/selfie`, `POST /api/verify/phone/request`, `POST /api/verify/phone/confirm` |
| billing | `GET /api/plans`, `POST /api/premium` (demo: sets a flag, no payment provider) |
| calls | `GET /api/calls/state`, `POST /api/calls/{start,heartbeat,end}`, `GET /api/calls/history` |
| media | `POST/GET/DELETE /api/uploads`, `DELETE /api/uploads/:id`, `GET /uploads/<hash>.<ext>` |
| ads | `GET /api/ads`, `POST /api/ads`, `GET /api/ads/mine`, `POST /api/ads/:id/ping`, `POST /api/admin/ads` |
| google | `GET /api/auth/google/config`, `POST /api/auth/google` (needs `GOOGLE_CLIENT_ID`) |
| realtime | `GET /api/realtime/stream?uid=`, `POST /api/realtime/{publish,presence,signal}` |

Environment:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ROMANCHA_DB` | `data/romancha.db` | SQLite file; `:memory:` for throwaway runs |
| `DATABASE_URL` | — | Set it (and `npm install pg`) to use Postgres instead |
| `SMS_PROVIDER` | `console` | `console` prints codes to the server log; `twilio` or `http` send for real |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | — | required by the Twilio adapter |
| `SMS_HOOK_URL` | — | `POST`s `{phone, code}` to your own SMS gateway |
| `ALLOW_INLINE_CODE` | off | dev only: returns the code in the API response so UI flows can be tested without an inbox |
| `OTP_PHONE_HOURLY_LIMIT` / `OTP_IP_DAILY_LIMIT` | `3` / `5` | OTP send throttles; raise them while you are testing the flow |
| `TRUST_PROXY` | off | set to `1` behind a proxy, or `X-Forwarded-For` is ignored for rate limiting |
| `ADMIN_TOKEN` | — | gates `GET /api/admin/queue` and `POST /api/admin/ads` (report + campaign review) |
| `ROMANCHA_UPLOADS` | `data/uploads` | where chat photos and voice notes are written (git-ignored) |
| `GOOGLE_CLIENT_ID` | — | enables "Continue with Google"; a comma-separated list is allowed while rotating clients |
| `PUBLIC_ORIGIN` | — | extra origins allowed to complete a Google sign-in (behind a proxy on a odd port) |
| `USD_BDT` | `118` | the currency anchor `GET /api/plans` hands to the paywall |

Security choices worth knowing about, because they are the ones that get skipped:

- passwords: `scrypt` (N=16384, r=8, p=1) with a per-user salt; swap in argon2id for a real launch
- sessions: 256-bit random token, only its SHA-256 stored, `HttpOnly` + `SameSite=Lax` +
  `Secure` in production, 30-day TTL, deleted on logout
- CSRF: double-submit `x-csrf-token` required on every unsafe method (`tests/server.test.mjs`)
- login: identical error for unknown email and wrong password, the same CPU burned for both so
  timing does not leak who has an account, and 5 failures lock the account for 15 minutes *in the DB*
- OTP: 6 digits from `crypto.randomBytes` (rejection sampling), scrypt-hashed, 5-minute expiry,
  5 tries per code, 3 sends per phone per hour, 5 per IP per day, single use, `timingSafeEqual`
- rate limits are per-`X-Forwarded-For`-last-hop only when `TRUST_PROXY=1`, so a client cannot
  spoof its way out of them by default
- uploads: only `image/{jpeg,png,webp}` and voice-note audio, 4 MB / 8 MB caps, body capped at
  12 MB before parsing, filename is the SHA-256 of the bytes (so `../` is not a thing to defend
  against), served with `nosniff`, a locked CSP and `immutable`
- a message can only reference media the *server* minted: `mediaUrl` must match
  `/uploads/<40 hex>.<ext>`, so nobody can plant a tracking pixel or an attacker-hosted file in
  someone else's chat
- Google sign-in verifies the ID token's signature and `aud` (Google's certs, cached 10 min, with
  a `tokeninfo` fallback) and refuses cross-origin attempts; the app never asks for, and could
  never use, a Gmail password

### Video dates

`src/utils/webrtcCall.js` + `src/components/VideoCallModal.jsx` are a real peer-to-peer call: the
server relays SDP and ICE candidates between exactly two people over SSE (`/api/realtime/signal`)
and never sees media. The **callee creates the offer** after they press Accept, which avoids
glare and — more importantly — never asks a browser for the camera before a human agreed to the
call. Public STUN only: peer-to-peer across most NATs, no TURN relay yet, so a call between two
symmetric-NAT networks will fail with a clear message instead of hanging.

To try it: `npm run dev`, register two accounts in two browsers (or one normal + one private
window), match them, and start the call from the chat. Demo personas cannot be called — the
button says so.

### Call minutes

`/api/plans` and `src/data/plans.js` are the same file the paywall renders, so the number in the
UI and the number the API enforces cannot drift:

| Plan | Price | Video calling | Likes | Other |
| --- | --- | --- | --- | --- |
| Free | $0 | 20 min per 24 h | 25/day, 3 super/week | unlimited text, uploads, safety tooling |
| Day Pass | $1 (≈৳120) | 2 h today | 100/day | no ads, 1 boost |
| Week | $4 | 3 h/day | 150/day | incognito, 3 boosts |
| Month | $8 | 4 h/day | 300/day | hide distance, unlimited reveals |
| Season | $15 (90 days) | 5 h/day | 300/day | cheapest per day |

Minutes are billed by the server, not the client: `POST /api/calls/start` checks the day's balance
and returns a session id, the modal heartbeats every 20 s, and a session costs
`last_seen_at − started_at`. Close the tab and billing stops within one heartbeat, so a crash
cannot burn the rest of your day; a second device cannot be used to double the allowance, and
unused minutes do not roll over (the allowance is per day, resetting at local midnight).

## What is real

Real, working behaviour:

- accounts: register / sign in / sign out against the database, httpOnly session cookies, CSRF,
  lockouts — sign up in two windows and they are two different members of the same server
- profiles, swipes, matches, chats, blocks and reports are stored server-side; opening the app
  on another device hydrates from `/api/state`, and a message you send is pushed to the other
  person's open stream instead of waiting for a poll
- 1:1 video dates over WebRTC (see above), including a data channel for reactions, and the
  per-plan minute budget that decides whether a call may start at all
- chat media: the photo you pick (or shoot with the in-thread camera) and the voice note you
  record are resized/encoded in your browser, uploaded, stored under `data/uploads`, delivered to
  the other person over SSE, playable from the thread, and individually deletable in
  Safety → Your data
- phone verification with a real OTP flow; the delivery adapter is `console` until you point it
  at Twilio or your own gateway
- age gate, onboarding, profile-strength scoring, deck ordering by weighted compatibility,
  filters, like budget (25/day free), super-like rationing, rewind
- mutual-like matching, the 24-hour "say something or it expires" rule, inbox with unread
  counts, blocks enforced in `buildDeck()`, verification state machine
- cross-tab realtime sync; the dev/prod server relays to other devices on the same origin

Simulated on purpose (and labelled as such in the UI):

- the people in `src/data/datingProfiles.js` are fictional, and their replies come from
  `src/utils/chatEngine.js` — persona-driven, not an LLM. A real member's chat never gets a
  generated reply: the thread knows the difference and stays quiet until the server pushes
  their actual message
- Gold checkout is a demo; there is no payment provider
- photo "verification" is a queue transition, not face matching — the selfie is never uploaded
  anywhere, and the server auto-approves only when the phone number is verified
- in **local mode** (no API) a small copy of your photo or recording is kept in the tab and the
  message says so — there is no server to store it on, and it is never presented as sent
- reels/stories/lounge content is still the bundled mock feed; `ReelsVideoFeed.jsx` has no
  upload path yet, so "post a reel" is not a thing you can do

`data/*.db` files are local SQLite databases (git-ignored). `npm run db:reset` deletes the one
the dev server uses.

## Safety model (why some of the code looks opinionated)

- Guardrails run before personality: harassment, money requests, sexual pressure and age
  probes are intercepted in `replyTo()` and turn into a boundary + a Report path, never a flirty reply
- Report = report + block + unmatch, and blocked profiles are removed from the deck at the
  `buildDeck()` level (unit-tested), not just hidden in the UI
- No popunders, no ad networks, no trackers. `AdBanner.jsx` serves first-party placements only.
  The previous build injected third-party `document.write` ad iframes and a popunder script
  into an adult dating app — that is the fastest way to lose both users and ad networks.
  Real inventory is now sellable without that: campaigns live in `ad_campaigns`, an admin approves
  them (`POST /api/admin/ads`), impressions and clicks are counted by us, and an advertiser cannot
  inflate their own bill (self-views are ignored). If you want AdSense instead, it is one script
  tag plus a consent flow — and it needs the 18+ disclosure handled first, or the account gets banned.
- Every `<img>` goes through `SmartImage`, which falls back to a locally generated portrait
  tile, so a dead remote URL never shows a broken image

## Money: what is wired and what is not

Three rails, all deliberately at different stages:

1. **Premium plans** — the catalogue, entitlements and enforcement exist (`/api/plans`,
   `repo.planFor`, per-day caps on likes/super likes/call minutes, plan expiry from `premium_since`).
   **Checkout does not**: `POST /api/premium` flips a flag and the sheet says "no payment provider".
   To make it real, add a provider (bKash/Nagad/Upay for BD, Stripe for cards), then the plan row
   should be created by the provider's *webhook*, not by the client's click.
2. **Ads** — sellable first-party placements with counters and a review state (above). Pricing is
   an estimate at $0.40 CPM; invoicing and payouts are not implemented because there is no way to
   move money in this build.
3. **Live + tips** — designed, not built. The shape, when a payment provider exists:
   `live_streams(id, host_id, title, started_at, ended_at, status)` for the broadcast
   (WebRTC/SSE signalling is already in `realtimeApi.mjs`; a real stream needs an SFU or
   HLS-ingest for scale), `live_viewers(stream_id, user_id, joined_at)` for attendance, and
   `credits` + `tips(id, stream_id, from_user_id, to_user_id, amount, currency, note, created_at)`
   as an append-only ledger. Payouts are `sum(tips) − platform_fee`, with the fee in one config
   constant, plus a KYC/age check before anyone can receive money. The ledger is what needs care
   (idempotency keys, refund rows, never mutate a tip), and the 18+ content rules decide whether
   adult live streams are allowed at all on your payment rails — check the provider's policy first.

Also honest: no plan unlocks the "see who liked you" list beyond the reveal ration in
`plans.js`, and no plan removes the safety guardrails.

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
