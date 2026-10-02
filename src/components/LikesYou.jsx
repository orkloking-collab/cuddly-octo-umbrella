import React, { useMemo, useState } from 'react';
import { Crown, Heart, Eye, ShieldCheck, Lock } from 'lucide-react';
import SmartImage from './SmartImage';
import { useDating, useNow } from '../utils/useDating';
import { compatibility, scoreBand } from '../utils/matching';

const FREE_DAILY_PEEKS = 2;
const PEEK_KEY = 'romancha_peek_v1';

function readPeeks() {
  try {
    const raw = JSON.parse(localStorage.getItem(PEEK_KEY) || '{}');
    return raw.day === new Date().toISOString().slice(0, 10) ? raw : { day: new Date().toISOString().slice(0, 10), ids: [] };
  } catch {
    return { day: new Date().toISOString().slice(0, 10), ids: [] };
  }
}

/** "Likes you" grid — the single most motivating screen in any dating app. */
export default function LikesYou({ onOpenPremium, onOpenChat }) {
  const { store, profile, prefs } = useDating();
  const now = useNow(60_000);
  const today = useMemo(() => new Date(now).toISOString().slice(0, 10), [now]);
  const [peeks, setPeeks] = useState(readPeeks);
  const liked = useMemo(() => store.pendingLikes(), [store, profile]); // profile dep is intentional: a stronger profile changes who likes you
  const isPremium = store.isPremium();

  const rows = useMemo(
    () => liked.map((p) => ({ ...p, match: compatibility(profile, p), seen: isPremium || (peeks.day === today && peeks.ids.includes(p.id)) })),
    [liked, profile, isPremium, peeks, today],
  );

  const unlockOne = (id) => {
    const nextPeek = { day: today, ids: [...new Set([...(peeks.ids || []), id])] };
    setPeeks(nextPeek);
    try { localStorage.setItem(PEEK_KEY, JSON.stringify(nextPeek)); } catch { /* ignore */ }
  };

  const likeBack = (id) => {
    store.swipe(id, 'like');
    const stillMatch = store.getState().matches.some((m) => m.profileId === id);
    if (stillMatch) onOpenChat?.(id);
  };

  const left = Math.max(0, FREE_DAILY_PEEKS - (peeks.ids?.length || 0));

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-rose-200/60">Already into you</p>
          <h2 className="text-2xl font-bold leading-tight text-white">{liked.length} people liked your profile</h2>
          <p className="mt-1 text-[12.5px] text-rose-100/65">
            {isPremium ? 'Gold shows every card.' : `${left} free reveal${left === 1 ? '' : 's'} left today, or unlock them all.`}
            {prefs.incognito ? ' Incognito is on — they can only see you after you like back.' : ''}
          </p>
        </div>
        {!isPremium && (
          <button onClick={onOpenPremium} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-3.5 py-2 text-[12px] font-bold text-white shadow-lg hover:brightness-110">
            <Crown className="h-3.5 w-3.5" /> Unlock all
          </button>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Eye className="mx-auto h-8 w-8 text-rose-300" />
          <h3 className="mt-3 text-lg font-bold text-white">No incoming likes yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-rose-100/65">
            Likes follow profile strength. Two more photos and one answered prompt is usually the difference between
            zero and a busy inbox.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((p) => {
            const sharedCount = p.match.sharedInterests?.length || 0;
            return (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#170d22]">
                <div className="relative">
                  <SmartImage
                    src={p.photos?.[0]} name={p.name} seed={p.id} alt={`${p.name} liked you`}
                    className={`aspect-[3/4] w-full ${p.seen ? '' : 'blur-xl saturate-150'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  {!p.seen && (
                    <button
                      onClick={() => unlockOne(p.id)}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#170d22]/55 text-center"
                      aria-label={`Reveal ${p.name}`}
                    >
                      <Lock className="h-5 w-5 text-white/85" />
                      <span className="px-3 text-[11.5px] font-semibold text-white">Reveal — {left > 0 ? `${left} free today` : 'needs Gold'}</span>
                    </button>
                  )}
                  <span className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
                      {p.match.score} {scoreBand(p.match.score).label.split(' ')[0]}
                    </span>
                    {p.verified && <ShieldCheck className="h-4 w-4 text-sky-400" />}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[13px] font-bold text-white">{p.seen ? `${p.name}, ${p.age}` : 'Someone near you'}</p>
                  <p className="truncate text-[11px] text-rose-100/60">{p.seen ? `${p.job} · ${p.city}` : `${p.city} · ${sharedCount} shared interest${sharedCount === 1 ? '' : 's'}`}</p>
                  {p.seen && (
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => likeBack(p.id)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-1.5 text-[11.5px] font-bold text-white hover:brightness-110">
                        <Heart className="h-3 w-3 fill-white" /> Like back
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
}
