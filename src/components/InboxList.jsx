import React, { useMemo, useState } from 'react';
import { Search, Heart, MessageCircle, Eye, ShieldCheck, Flame, ChevronRight, Sparkles } from 'lucide-react';
import SmartImage from './SmartImage';
import ChatThread from './ChatThread';
import { useDating, useNow, timeAgo, formatCountdown } from '../utils/useDating';

/**
 * The inbox. Real dating apps live or die here: unread pressure, expiring
 * matches and a clear path back to swiping when it is empty.
 */
export default function InboxList({ onOpenLikes, onSwipe, onOpenVideoCall, onOpenSafety }) {
  const { store, profile } = useDating();
  const now = useNow(30000);
  const [query, setQuery] = useState('');
  const [openThread, setOpenThread] = useState(null);
  const inboxes = store.inboxes();
  const [tab, setTab] = useState('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inboxes
      .filter((r) => (tab === 'new' ? r.needsHello : tab === 'unread' ? r.unread > 0 : true))
      .filter((r) => !q || r.person.name.toLowerCase().includes(q) || (r.lastMessage?.text || '').toLowerCase().includes(q));
  }, [inboxes, query, tab]);

  const activity = store.activityFeed();
  const live = store.liveActivity(3);
  const unread = store.unreadTotal();
  const expiring = inboxes.filter((r) => r.hoursLeft != null && r.hoursLeft < 12);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-rose-200/60">Your matches</p>
          <h2 className="text-2xl font-bold leading-tight text-white">
            {inboxes.length ? `${inboxes.length} match${inboxes.length === 1 ? '' : 'es'}` : 'No matches yet'}
            {unread > 0 && <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 align-middle text-[11px] font-bold text-white">{unread} new</span>}
          </h2>
        </div>
        <button onClick={onOpenLikes} className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/12 px-3 py-1.5 text-[12px] font-semibold text-rose-100 hover:bg-rose-500/20">
          <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" /> Likes you
        </button>
      </header>

      {expiring.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-3">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-200">
            <Flame className="h-4 w-4" /> {expiring.length} match{expiring.length === 1 ? '' : 'es'} expires today
          </p>
          <p className="mt-1 text-[11.5px] text-amber-100/70">Matches go quiet and disappear if nobody says hello in 24 hours. Message {expiring[0].person.name.split(' ')[0]} first — that one liked you back fastest.</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-200/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search matches and messages"
            aria-label="Search conversations"
            className="w-full rounded-2xl border border-white/10 bg-[#150b1f] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-rose-100/35 focus:border-rose-400/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[{ id: 'all', label: 'All' }, { id: 'new', label: `New matches${inboxes.filter((r) => r.needsHello).length ? ` (${inboxes.filter((r) => r.needsHello).length})` : ''}` }, { id: 'unread', label: `Unread${unread ? ` (${unread})` : ''}` }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${tab === t.id ? 'bg-white text-[#1a0f24]' : 'border border-white/12 text-rose-100/80 hover:bg-white/5'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* New match strip */}
      {inboxes.some((r) => r.needsHello) && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {inboxes.filter((r) => r.needsHello).map((r) => (
            <button key={r.profileId} onClick={() => setOpenThread(r.profileId)} className="shrink-0 text-center" aria-label={`Message ${r.person.name}`}>
              <span className={`relative block rounded-full p-0.5 ${r.hoursLeft != null ? 'bg-gradient-to-br from-amber-400 to-rose-500' : 'bg-gradient-to-br from-rose-500 to-fuchsia-600'}`}>
                <SmartImage src={r.person.photos?.[0]} name={r.person.name} seed={r.person.id} alt="" className="h-16 w-16 rounded-full border-2 border-[#0d0714]" />
              </span>
              <span className="mt-1 block max-w-[70px] truncate text-[11px] text-rose-100/80">{r.person.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Threads */}
      <div className="mt-4 space-y-1.5">
        {rows.map((r) => (
          <button
            key={r.profileId}
            onClick={() => setOpenThread(r.profileId)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-2.5 text-left transition hover:border-rose-400/40 hover:bg-white/[0.06]"
          >
            <span className="relative shrink-0">
              <SmartImage src={r.person.photos?.[0]} name={r.person.name} seed={r.person.id} alt="" className="h-14 w-14 rounded-2xl" />
              {r.person.online && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#150b1f] bg-emerald-400" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-white">{r.person.name}, {r.person.age}</span>
                {r.person.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
                <span className="ml-auto shrink-0 text-[10px] text-rose-100/40">{timeAgo((r.lastMessage?.ts || r.matchedAt), now)}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span className={`truncate text-[12.5px] ${r.unread ? 'font-semibold text-white' : 'text-rose-100/60'}`}>
                  {r.needsHello
                    ? (r.initiatedBy === 'you' ? 'You liked them first — open with something about their profile' : `${r.person.name.split(' ')[0]} liked you back 👋`)
                    : `${r.lastMessage.from === 'me' ? 'You: ' : ''}${r.lastMessage.text}`}
                </span>
                {r.unread > 0 && <span className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{r.unread}</span>}
              </span>
              {r.hoursLeft != null && (
                <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-amber-300/90">
                  <Flame className="h-3 w-3" /> {formatCountdown(r.hoursLeft * 3600000)}
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-rose-100/30" />
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700">
            <MessageCircle className="h-6 w-6 text-white" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-white">{inboxes.length ? 'Nothing here for that filter' : 'Your inbox is empty because you have not swiped yet'}</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-rose-100/65">
            {inboxes.length
              ? 'Clear the search or switch back to All.'
              : profile.name ? 'Matches open the second you both say yes. Most people get their first one within 12 likes.' : 'Finish your profile first — decks with photos get 3x the matches.'}
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <button onClick={onSwipe} className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">
              Start swiping
            </button>
            <button onClick={onOpenLikes} className="rounded-2xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-rose-100 hover:bg-white/5">
              See {store.pendingLikes().length} people who liked you
            </button>
          </div>
        </div>
      )}

      {/* Activity + live ticker */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section className="glass-card rounded-2xl p-3.5">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-100/70"><Eye className="h-3.5 w-3.5" /> Your recent activity</h4>
          {activity.length ? (
            <ul className="mt-2 space-y-1.5">
              {activity.slice(0, 4).map((a) => (
                <li key={a.id} className="text-[12px] text-rose-50/80">{a.text}<span className="ml-1 text-rose-100/35">· {timeAgo(a.at, now)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-rose-100/50">Nothing yet. Likes, matches and reports all land here.</p>
          )}
        </section>
        <section className="glass-card rounded-2xl p-3.5">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-100/70"><Sparkles className="h-3.5 w-3.5" /> Happening now</h4>
          <ul className="mt-2 space-y-1.5">
            {live.map((l) => (
              <li key={l.id} className="text-[12px] text-rose-50/80">{l.text}<span className="ml-1 text-rose-100/35">· {l.minsAgo}m ago</span></li>
            ))}
          </ul>
        </section>
      </div>

      {openThread && (
        <ChatThread
          matchId={openThread}
          onClose={() => setOpenThread(null)}
          onOpenVideoCall={onOpenVideoCall}
          onOpenSafety={onOpenSafety}
        />
      )}
    </div>
  );
}
