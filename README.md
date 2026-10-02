# Romancha

An 18+ dating app with a literature problem: it is built around romance writers, so
the profile deck, the conversations and the community feed all pull in the same
direction — *say something specific or get passed on*.

It runs in two modes, and both are honest about what they are:

- **Server mode** (`npm run dev` / `npm start`) — real accounts, sessions, matches, chats,
  blocks, reports, phone verification and WebRTC signalling, backed by SQLite (or Postgres).
- **Local mode** (a static build with no API) — the same UI on `localStorage`, no accounts.

Which parts are simulated is stated in [What is real](#what-is-real). Nothing here pretends a
demo persona is a human being.


---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  — dev server + realtime API
npm run build      # production bundle into dist/
npm start          # serve dist/ + the same realtime API on :3000
npm test           # 67 tests: matching engine, dating store, WebRTC call state machine, HTTP API end-to-end
npm run smoke      # renders 23 real components through React SSR and fails on any throw
npm run lint       # oxlint over src/, server/, tests/, scripts/
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
| 1:1 chat | `src/components/ChatThread.jsx` | Typing indicator, quick replies built from *their* profile, photo/voice stubs, safe-check timer, video-date handoff, unmatch/report |
| Likes you | `src/components/LikesYou.jsx` | Incoming likes, blurred until revealed (2 free/day), like-back = instant match |
| Filters | `src/components/MatchFilters.jsx` | Age range, distance, verified-only, online-only, hide-me, incognito (Gold), hide-distance, video-call consent |
| Trust & Safety | `src/components/SafetyCentre.jsx` | Photo verification state machine, date-safety playbook, report+block (blocks are real and enforced in the deck), privacy controls, export/delete my data |
| Gold | `src/components/PremiumSheet.jsx` | Plans + perks, clearly-labelled demo checkout (no payment code) |

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
public/                        favicon, og image
src/
  main.jsx  App.jsx  index.css
  components/  *.jsx           presentation + interaction
  utils/       datingStore.js matching.js chatEngine.js authStore.js
               realtimeHub.js useDating.js imageResize.js photoFallback.js ageVerification.js
  data/        datingProfiles.js mockData.js mockCommunityData.js
server/
  db.mjs                       schema + migrations; node:sqlite or pg behind one interface
  repo.mjs                     domain data access: profiles, deck, swipes, matches, chat, blocks
  auth.mjs                     scrypt passwords, httpOnly session cookies, CSRF, lockouts
  otp.mjs                      6-digit codes: hashed at rest, expiry, attempt + send limits, providers
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
| billing | `POST /api/premium` (demo: sets a flag, no payment provider) |
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
| `ADMIN_TOKEN` | — | gates `GET /api/admin/queue` (reports + verification review) |

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

## What is real

Real, working behaviour:

- accounts: register / sign in / sign out against the database, httpOnly session cookies, CSRF,
  lockouts — sign up in two windows and they are two different members of the same server
- profiles, swipes, matches, chats, blocks and reports are stored server-side; opening the app
  on another device hydrates from `/api/state`, and a message you send is pushed to the other
  person's open stream instead of waiting for a poll
- 1:1 video dates over WebRTC (see above), including a data channel for reactions
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
- voice notes and photo messages are recorded/resized locally and kept in the browser; they are
  not stored on the server yet

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
