import React, { useEffect, useRef, useState } from 'react';
import { Crown, ShieldCheck, Users, Sparkles, ChevronRight, Megaphone } from 'lucide-react';
import { serverSync } from '../utils/serverSync';

/**
 * Promoted placements.
 *
 * This component used to inject third-party ad scripts (a popunder network and
 * two `document.write` "native ad" iframes from unknown hosts). That was the
 * single biggest trust and security hole in the app: arbitrary remote JS with
 * write access to the page, no consent string, no COPPA/gdpr handling, and an
 * "18+ ads" label next to unvetted inventory. It is gone.
 *
 * What remains is first-party promotion only — content we control, no network
 * requests, nothing that can serve malware or a scam ad to a dating user.
 */

const PLACEMENTS = [
  {
    kind: 'premium',
    icon: Crown,
    kicker: 'Promoted · Romancha Gold',
    title: 'See the 12 people who already liked you',
    body: 'Gold removes the daily like cap, unlocks incognito browsing and shows every incoming like unblurred.',
    cta: 'Show me',
  },
  {
    kind: 'safety',
    icon: ShieldCheck,
    kicker: 'Community note',
    title: 'Never send money. Ever.',
    body: '“Emergency”, “crypto tip”, “gift card for my sister” — if it involves money, report and block. Trust & Safety reviews reports within 24 hours.',
    cta: 'Open Safety Centre',
  },
  {
    kind: 'event',
    icon: Users,
    kicker: 'Local event',
    title: 'Midnight Writers’ Mixer — Sunday 9pm',
    body: 'Speed-dating round where the opener is a story prompt. 84 people registered in your region.',
    cta: 'Join the list',
  },
];

export function Banner728x90({ onAction, index = 0 }) {
  const slot = PLACEMENTS[index % PLACEMENTS.length];
  const Icon = slot.icon;
  return (
    <aside
      className="glass-card flex w-full max-w-[728px] items-center gap-3 rounded-2xl border border-white/10 px-3.5 py-3"
      aria-label="Promoted content"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-600/70 to-fuchsia-600/60 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-rose-300/70">{slot.kicker}</p>
        <p className="truncate text-[13px] font-semibold text-white">{slot.title}</p>
        <p className="line-clamp-1 text-[11.5px] text-rose-100/60">{slot.body}</p>
      </div>
      <button
        onClick={() => onAction?.(slot.kind)}
        className="flex shrink-0 items-center gap-1 rounded-xl border border-rose-400/40 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-bold text-rose-100 transition hover:bg-rose-500/25"
      >
        {slot.cta} <ChevronRight className="h-3 w-3" />
      </button>
    </aside>
  );
}

/**
 * A real campaign from the ad table. Impressions and clicks are counted on our own
 * server — no third party learns that you were looking at a dating profile.
 */
function Campaign({ placement, onManage, fallback }) {
  const [ad, setAd] = useState(null);
  const seen = useRef(null);

  useEffect(() => {
    let alive = true;
    serverSync.ads(placement).then((out) => {
      if (!alive) return;
      const list = out?.ads || [];
      if (!list.length) return;
      const pick = list[Math.floor(Math.random() * list.length)];
      setAd(pick);
      if (seen.current !== pick.id) {
        seen.current = pick.id;
        serverSync.adPing(pick.id, 'impression');
      }
    });
    return () => { alive = false; };
  }, [placement]);

  if (!ad) return fallback;

  return (
    <aside className="glass-card flex w-full max-w-[728px] items-center gap-3 rounded-2xl border border-white/10 px-3.5 py-3" aria-label="Advertisement">
      {ad.imageUrl ? (
        <img src={ad.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/8 text-rose-200"><Megaphone className="h-5 w-5" /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-rose-300/70">Ad · promoted</p>
        <a
          href={ad.targetUrl}
          target="_blank"
          rel="nofollow noopener noreferrer sponsored"
          onClick={() => serverSync.adPing(ad.id, 'click')}
          className="block truncate text-[13px] font-semibold text-white hover:underline"
        >
          {ad.title}
        </a>
        <p className="text-[11px] text-rose-100/50">Sold by Romancha directly · no trackers, no retargeting</p>
      </div>
      <button onClick={onManage} className="shrink-0 rounded-xl border border-white/12 px-2.5 py-1.5 text-[10.5px] font-semibold text-rose-100/70 hover:bg-white/10">
        Your ad here
      </button>
    </aside>
  );
}

export default function AdBanner({ type = 'banner', adIndex = 0, onAction }) {
  const manage = () => onAction?.(type === 'native' ? 'ads' : 'ads');
  if (type === 'native') {
    return (
      <div className="my-4 flex justify-center">
        <Campaign
          placement="banner"
          onManage={manage}
          fallback={<Banner728x90 index={adIndex} onAction={onAction} />}
        />
      </div>
    );
  }
  return (
    <div className="border-y border-rose-900/25 bg-[#120a1c]/70 px-3 py-2">
      <div className="mx-auto flex max-w-[900px] items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-rose-400" />
        <p className="truncate text-[11.5px] text-rose-100/70">
          No trackers, no popunders, no third-party ad networks on Romancha — your dating activity is not for sale.
          <button onClick={() => onAction?.('ads')} className="ml-2 font-semibold text-rose-300 underline-offset-2 hover:underline">
            Run an ad here
          </button>
          <button onClick={() => onAction?.('premium')} className="ml-2 font-semibold text-rose-300 underline-offset-2 hover:underline">
            Go premium for $1
          </button>
        </p>
      </div>
    </div>
  );
}
