import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart, X, Star, Undo2, SlidersHorizontal, ShieldAlert, ChevronDown, ChevronUp,
  MapPin, Briefcase, Sparkles, Flame, Check, Info, Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import SmartImage from './SmartImage';
import MatchFilters from './MatchFilters';
import ProfileStrengthMeter from './ProfileStrengthMeter';
import { useDating, useNow, timeAgo } from '../utils/useDating';
import { formatDistance, scoreBand } from '../utils/matching';
import { portraitTile } from '../utils/photoFallback';

const THRESHOLD = 110;

export default function SwipeDeck({ onOpenChat, onOpenPremium, onOpenProfile, onOpenSafety }) {
  const { state, store, profile, prefs } = useDating();
  const now = useNow(30000);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [flying, setFlying] = useState(null);
  const [photoIdxByCard, setPhotoIdxByCard] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchPop, setMatchPop] = useState(null);
  const [outOfLikes, setOutOfLikes] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const deck = useMemo(() => store.deck(), [state, store]);
  const top = deck[0];
  const next = deck[1];
  const strength = store.strength();
  const isPremium = store.isPremium();
  const remaining = store.remainingLikes();
  const deckCount = deck.length;

  // "Expanded" is stored as the id of the card that is expanded, so it resets
  // itself when the deck advances instead of needing a render-phase effect.
  const [expandedFor, setExpandedFor] = useState(null);
  const expanded = Boolean(top) && expandedFor === top.id;
  const toggleExpanded = () => setExpandedFor(expanded ? null : top?.id);

  const photoIdx = top ? photoIdxByCard[top.id] || 0 : 0;
  const setPhotoIdx = (updater) =>
    setPhotoIdxByCard((map) => {
      if (!top) return map;
      const current = map[top.id] || 0;
      const nextIdx = typeof updater === 'function' ? updater(current) : updater;
      return { ...map, [top.id]: Math.max(0, nextIdx) };
    });

  const celebrate = useCallback(() => {
    try {
      confetti({ particleCount: 70, spread: 78, origin: { y: 0.7 }, colors: ['#fb7185', '#f472b6', '#fca5a5', '#fde68a'] });
    } catch { /* canvas unsupported */ }
  }, []);

  const decide = useCallback((kind) => {
    if (!top) return;
    const rect = cardRef.current?.getBoundingClientRect?.();
    const dir = kind === 'like' || kind === 'super' ? 1 : -1;
    const dy = kind === 'super' ? -1 : 0;
    setFlying({ id: top.id, x: rect ? dir * (rect.width + 140) : dir * 460, y: dy * 420 + (kind === 'super' ? -60 : 40), rot: dir * 22 });
    const res = store.swipe(top.id, kind);
    if (!res.ok && res.reason === 'out-of-likes') { setFlying(null); setOutOfLikes(true); return; }
    window.setTimeout(() => {
      setFlying(null);
      if (res.ok && res.matched) { celebrate(); setMatchPop(top); }
    }, 320);
    // Real accounts are decided by the database, so the answer can arrive just
    // after the card has flown off screen — celebrate then, not never.
    if (res.pending && res.promise) {
      res.promise.then((serverRes) => {
        if (serverRes?.matched) { celebrate(); setMatchPop(top); }
        else if (serverRes?.reason === 'out-of-likes') setOutOfLikes(true);
      }).catch(() => { /* the store already recorded the error */ });
    }
  }, [top, store, celebrate]);

  // Keyboard controls: this is the fastest way to actually use a dating app.
  useEffect(() => {
    const onKey = (e) => {
      if (matchPop || filtersOpen) return;
      const el = document.activeElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (e.key === 'ArrowLeft') decide('pass');
      else if (e.key === 'ArrowRight') decide('like');
      else if (e.key === 'ArrowUp') { e.preventDefault(); decide('super'); }
      else if (e.key.toLowerCase() === 'u') store.undo();
      else if (e.key.toLowerCase() === 'f') setFiltersOpen((v) => !v);
      else if (e.key === 'Escape') setExpandedFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, matchPop, filtersOpen, store]);

  const onPointerDown = (e) => {
    if (expanded || !top) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDrag((d) => ({ ...d, active: true }));
    cardRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.active) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  };
  const onPointerUp = () => {
    if (!drag.active) return;
    const { x, y } = drag;
    setDrag({ x: 0, y: 0, active: false });
    if (Math.hypot(x, y) < 20) return; // treat as a tap, not a swipe
    if (y < -THRESHOLD && Math.abs(x) < 120) decide('super');
    else if (x > THRESHOLD) decide('like');
    else if (x < -THRESHOLD) decide('pass');
  };

  const pull = flying ? 1 : Math.min(1, Math.abs(drag.x) / THRESHOLD);
  const likeOpacity = flying ? (flying.x > 0 ? 1 : 0) : drag.x > 0 ? pull : 0;
  const nopeOpacity = flying ? (flying.x < 0 ? 1 : 0) : drag.x < 0 ? pull : 0;
  const superOpacity = flying ? (flying.y < -100 ? 1 : 0) : drag.y < -60 && Math.abs(drag.x) < 120 ? Math.min(1, -drag.y / THRESHOLD) : 0;

  const transform = flying
    ? `translate3d(${flying.x}px, ${flying.y}px, 0) rotate(${flying.rot}deg)`
    : `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 22}deg)`;

  const photos = top?.photos?.length ? top.photos : [portraitTile({ name: top?.name, seed: top?.id })];

  if (!profile.name) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center">
        <h2 className="text-2xl font-bold text-white">Your deck is waiting on one thing</h2>
        <p className="mt-2 text-sm text-rose-100/70">People skip profiles with no photo and no bio — and honestly, so would you. Two minutes now, better matches all month.</p>
        <button onClick={onOpenProfile} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:brightness-110">
          Build my profile
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-4">
      {/* Header row: who is in the deck today */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-rose-200/60">Discovering near {profile.city || 'you'}</p>
          <h2 className="text-lg font-bold leading-tight text-white">
            {deckCount} {deckCount === 1 ? 'person' : 'people'} fit your filters
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {store.isBoosting() && (
            <span className="flex items-center gap-1 rounded-full bg-fuchsia-500/20 px-2 py-1 text-[10px] font-bold text-fuchsia-200">
              <Flame className="h-3 w-3" /> BOOST
            </span>
          )}
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-rose-100 transition hover:border-rose-400/50 hover:text-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          </button>
        </div>
      </div>

      {!isPremium && (
        <p className="mb-3 text-[11px] text-rose-100/55">
          {remaining === Infinity ? 'Unlimited likes' : `${remaining} of 25 likes left today`} · {state.superLikes.left} super like{state.superLikes.left === 1 ? '' : 's'} this week
        </p>
      )}

      {/* The deck */}
      <div className="relative mx-auto h-[560px] w-full max-w-[380px] select-none">
        {next && (
          <div className="absolute inset-0 scale-[0.955] overflow-hidden rounded-[26px] border border-white/10 opacity-70">
            <SmartImage src={next.photos?.[0]} name={next.name} seed={next.id} alt="" className="h-full w-full" />
          </div>
        )}

        {top ? (
          <div
            ref={cardRef}
            role="group"
            aria-label={`Profile card for ${top.name}, ${top.age}`}
            className="absolute inset-0 overflow-hidden rounded-[26px] border border-white/12 bg-[#170d22] shadow-2xl touch-pan-y"
            style={{
              transform,
              transition: drag.active ? 'none' : 'transform 320ms cubic-bezier(.22,.61,.36,1)',
              cursor: expanded ? 'default' : 'grab',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Photos */}
            <div className="relative h-[64%] w-full">
              <SmartImage src={photos[photoIdx]} name={top.name} seed={`${top.id}-${photoIdx}`} alt={`${top.name} photo ${photoIdx + 1}`} className="h-full w-full" imgClassName="pointer-events-none" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#170d22] via-transparent to-black/25" />

              <div className="absolute left-2 right-2 top-2 flex gap-1">
                {photos.map((_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>

              <button
                aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => Math.max(0, i - 1)); }}
                className="absolute left-0 top-0 h-full w-1/3"
              />
              <button
                aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => Math.min(photos.length - 1, i + 1)); }}
                className="absolute right-0 top-0 h-full w-1/3"
              />

              <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-2xl font-bold leading-tight text-white drop-shadow">
                    {top.name}, {top.age}
                    {top.verified && <span title="Photo verified"><Check className="h-4 w-4 rounded-full bg-sky-500 p-0.5 text-white" /></span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-white/85">
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{top.job}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{top.city}</span>
                    {top.online ? (
                      <span className="flex items-center gap-1 text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />online</span>
                    ) : (
                      <span className="text-white/60">{timeAgo(now - top.lastActiveMins * 60000, now)}</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl bg-black/45 px-2.5 py-1.5 text-center backdrop-blur">
                  <p className="text-base font-bold leading-none text-white">{top.match.score}</p>
                  <p className="text-[9px] uppercase tracking-wider text-rose-200/80">{scoreBand(top.match.score).label.split(' ')[0]}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="relative h-[36%] overflow-hidden px-4 pb-12 pt-3">
              <p className="line-clamp-3 text-[13px] leading-relaxed text-rose-50/85">{top.bio}</p>

              {expanded && (
                <div className="mt-2 space-y-2 overflow-y-auto" style={{ maxHeight: '30%' }}>
                  {top.prompts?.map((p) => (
                    <div key={p.q} className="rounded-xl bg-white/[0.05] p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-rose-300/70">{p.q}</p>
                      <p className="text-[12px] text-white">{p.a}</p>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-rose-100/70">
                    <span>🍷 {top.drink}</span><span>🚭 {top.smoke}</span>
                    <span>🏃 {top.exercise}</span><span>🎓 {top.education}</span>
                    <span>👶 {top.kids}</span><span>🗣 {top.languages?.join(', ')}</span>
                    <span>📏 {top.heightCm} cm</span><span>♏ {top.astro}</span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-4 right-4 flex flex-wrap items-center gap-1.5">
                {(top.interests || []).slice(0, expanded ? 8 : 3).map((i) => {
                  const shared = top.match.sharedInterests?.includes(i);
                  return (
                    <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${shared ? 'bg-rose-500/30 text-rose-100 ring-1 ring-rose-400/50' : 'bg-white/[0.07] text-rose-100/70'}`}>
                      {shared ? '✦ ' : ''}{i}
                    </span>
                  );
                })}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
                  className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-rose-100 hover:bg-white/20"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {expanded ? 'Less' : 'More'}
                </button>
              </div>
            </div>

            {/* Stamps */}
            <span style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-lg border-4 border-emerald-400 px-3 py-1 text-2xl font-black tracking-widest text-emerald-400">LIKE</span>
            <span style={{ opacity: nopeOpacity }} className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-lg border-4 border-rose-500 px-3 py-1 text-2xl font-black tracking-widest text-rose-500">NOPE</span>
            <span style={{ opacity: superOpacity }} className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-lg border-4 border-sky-400 px-3 py-1 text-xl font-black tracking-widest text-sky-400">SUPER</span>
          </div>
        ) : (
          <EmptyDeck
            prefs={prefs}
            strength={strength}
            profile={profile}
            onOpenFilters={() => setFiltersOpen(true)}
            onOpenProfile={onOpenProfile}
            onOpenPremium={onOpenPremium}
            decided={Object.keys(state.decisions).length}
          />
        )}

        {/* Match popup */}
        {matchPop && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[26px] bg-gradient-to-br from-rose-700/95 via-[#2b0d24]/97 to-fuchsia-800/95 p-5 text-center backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-100/80">It&apos;s a match</p>
            <h3 className="mt-1 font-cinzel text-3xl font-bold text-white">You and {matchPop.name.split(' ')[0]}</h3>
            <p className="mt-1 text-sm text-rose-50/85">You both liked each other. {matchPop.match?.sharedInterests?.length || 0} shared interests — start with one of those.</p>

            <div className="mt-4 flex items-center justify-center gap-3">
              {[profile, matchPop].map((p, i) => (
                <SmartImage key={i} src={p.photos?.[i === 0 ? 0 : 0]} name={p.name} seed={p.id} alt={p.name} className={`h-24 w-20 rounded-2xl border-2 ${i === 1 ? 'border-white/60' : 'border-rose-300/60'} shadow-xl`} />
              ))}
            </div>

            <div className="mt-4 w-full space-y-1.5 text-left">
              {(matchPop.openers || []).slice(0, 2).map((o) => (
                <button
                  key={o}
                  onClick={() => { store.sendText(matchPop.id, o); store.markRead(matchPop.id); setMatchPop(null); onOpenChat?.(matchPop.id); }}
                  className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[12px] text-white transition hover:bg-white/20"
                >
                  <Send className="h-3.5 w-3.5 shrink-0 text-rose-200" /> {o}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setMatchPop(null); onOpenChat?.(matchPop.id); }}
              className="mt-4 w-full rounded-2xl bg-white px-5 py-3 text-sm font-bold text-rose-700 shadow-lg hover:bg-rose-50"
            >
              Open chat with {matchPop.name.split(' ')[0]}
            </button>
            <button onClick={() => setMatchPop(null)} className="mt-2 text-[12px] text-rose-100/70 underline-offset-2 hover:underline">
              Keep swiping instead
            </button>
          </div>
        )}

        {outOfLikes && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[26px] bg-[#150b1f]/97 p-6 text-center backdrop-blur">
            <Sparkles className="h-7 w-7 text-amber-300" />
            <h3 className="mt-3 text-xl font-bold text-white">That is your 25 likes for today</h3>
            <p className="mt-2 text-sm text-rose-100/70">
              The cap exists so people stop treating you like a slot machine. Passes and reports are unlimited —
              likes are the thing that costs.
            </p>
            <button onClick={() => { setOutOfLikes(false); onOpenPremium?.(); }} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 px-5 py-3 text-sm font-bold text-white hover:brightness-110">
              Remove the limit with Gold
            </button>
            <button onClick={() => setOutOfLikes(false)} className="mt-2 text-[12px] text-rose-100/60 hover:underline">
              Back to the deck (I can still pass)
            </button>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <ActionButton label="Rewind last swipe (U)" onClick={() => store.undo()} disabled={!state.history.length} size="sm">
          <Undo2 className="h-4 w-4" />
        </ActionButton>
        <ActionButton label="Pass (←)" onClick={() => decide('pass')} size="lg" tone="nope">
          <X className="h-7 w-7" />
        </ActionButton>
        <ActionButton label="Super Like (↑)" onClick={() => decide('super')} size="sm" tone="super" badge={state.superLikes.left}>
          <Star className="h-4 w-4 fill-sky-300 text-sky-300" />
        </ActionButton>
        <ActionButton label="Like (→)" onClick={() => decide('like')} size="lg" tone="like">
          <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
        </ActionButton>
        <ActionButton label="Report this profile" onClick={() => top && onOpenSafety?.(top)} size="sm">
          <ShieldAlert className="h-4 w-4" />
        </ActionButton>
      </div>

      <p className="mt-3 text-center text-[11px] text-rose-100/40">
        ← pass · → like · ↑ super like · U rewind · F filters
      </p>

      {top && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-300/80">
          <Info className="h-3 w-3" /> {formatDistance(top.match.distanceKm).replace(' away', '')} from {profile.hideDistance ? 'an area near you' : `you${profile.city ? ` in ${profile.city}` : ''}`}
        </p>
      )}

      <div className="mt-4">
        <ProfileStrengthMeter strength={strength} onFix={onOpenProfile} />
      </div>

      <MatchFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        prefs={prefs}
        isPremium={isPremium}
        matchesShown={deckCount}
        onChange={(patch) => store.updatePrefs(patch)}
      />
    </div>
  );
}

function ActionButton({ children, onClick, label, size = 'md', tone = '', disabled, badge }) {
  const dims = size === 'lg' ? 'h-16 w-16' : 'h-11 w-11';
  const tones = {
    like: 'border-emerald-400/40 hover:border-emerald-300 hover:shadow-emerald-500/25',
    nope: 'border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/25',
    super: 'border-sky-400/40 hover:border-sky-300 hover:shadow-sky-500/25',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative grid ${dims} place-items-center rounded-full border bg-[#1c1027] text-rose-100 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 ${tones[tone] || 'border-white/12 hover:border-white/30'}`}
    >
      {children}
      {badge != null && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-[9px] font-bold text-white">{badge}</span>
      )}
    </button>
  );
}

function EmptyDeck({ prefs, strength, profile, onOpenFilters, onOpenProfile, onOpenPremium, decided }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[26px] border border-white/12 bg-[#170d22] p-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700 text-white">
        <Sparkles className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-xl font-bold text-white">You have seen everyone nearby</h3>
      <p className="mt-2 text-sm text-rose-100/70">
        {decided} {decided === 1 ? 'profile reviewed' : 'profiles reviewed'}. Your filters are set to{' '}
        {prefs.ageMin}-{prefs.ageMax}, within {prefs.distanceKm >= 5000 ? 'anywhere' : `${prefs.distanceKm} km`}
        {prefs.verifiedOnly ? ', verified only' : ''}{prefs.onlineOnly ? ', online only' : ''}.
      </p>

      <div className="mt-5 w-full space-y-2 text-left">
        {!strength.complete && (
          <Suggestion onClick={onOpenProfile} icon={<Check className="h-4 w-4 text-emerald-300" />}
            title={`Finish your profile (${strength.score}%)`}
            body={`${strength.missing[0]?.label || 'Add photos'} — decks with 4+ photos get 3x more right swipes.`} />
        )}
        <Suggestion onClick={onOpenFilters} icon={<SlidersHorizontal className="h-4 w-4 text-rose-300" />}
          title="Widen your filters" body="Try +5 years or double the distance — Rajshahi and Dhaka are not the same market." />
        <Suggestion onClick={onOpenPremium} icon={<Star className="h-4 w-4 text-amber-300" />}
          title="Turn on Boost" body="Push your card to the top of every deck in your city for 30 minutes." />
        <Suggestion onClick={onOpenFilters} icon={<GlobeIcon />}
          title="Look abroad" body={`${profile.city || 'Your city'} is small for dating. Set distance to “Anywhere” for long-distance matches.`} />
      </div>
      <p className="mt-4 text-[11px] text-rose-100/45">New people appear as the community grows — check back tomorrow.</p>
    </div>
  );
}

function Suggestion({ onClick, icon, title, body }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-rose-400/40 hover:bg-white/[0.06]">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block text-[13px] font-semibold text-white">{title}</span>
        <span className="block text-[11px] leading-snug text-rose-100/60">{body}</span>
      </span>
    </button>
  );
}

function GlobeIcon() {
  return <span className="text-[13px] leading-none text-rose-300">🌍</span>;
}
