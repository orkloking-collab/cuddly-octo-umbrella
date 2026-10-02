import React, { useEffect, useState } from 'react';
import { Crown, X, Check, Clock, Video, EyeOff, Sparkles, ShieldCheck, Ban } from 'lucide-react';
import { useDialog } from '../utils/useDating';
import { datingStore } from '../utils/datingStore';
import { serverSync } from '../utils/serverSync';
import { FREE_PLAN, PLANS as CATALOGUE, formatDuration, priceLabel } from '../data/plans.js';

const PERK_ICON = {
  Clock, Video, EyeOff, Sparkles, ShieldCheck, Ban, Check,
};

/**
 * The paywall, built from the same catalogue the server enforces
 * (`src/data/plans.js`). Prices, call minutes and the like caps are not typed in
 * here twice — if the API says a Day Pass buys 2 hours, that is what shows.
 *
 * When the Romancha server is running we ask it for the list, so a deploy can
 * reprice without a client rebuild.
 */
export default function PremiumSheet({ open, onClose, isPremium = false, onActivate }) {
  useDialog(open, onClose);
  const [plans, setPlans] = useState(CATALOGUE);
  const [plan, setPlan] = useState(() => datingStore.getState().premium?.plan || 'day');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [usage, setUsage] = useState(null);
  // `isPremium` is a boolean from the parent; the plan id itself comes from the
  // store, so the sheet opens on whatever is actually active.
  const activeId = typeof isPremium === 'string' ? isPremium : datingStore.getState().premium?.plan;
  const selected = plans.find((p) => p.id === (plan || activeId)) || plans[0];

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    serverSync.plans().then((out) => {
      if (!alive || !out?.plans?.length) return;
      setPlans(out.plans);
    });
    serverSync.callState().then((out) => {
      if (alive && out && !out.error) setUsage(out);
    });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (open) setDone(null);
  }, [open]);

  if (!open) return null;

  const pay = () => {
    setBusy(true);
    Promise.resolve(onActivate?.(selected.id))
      .then((out) => setDone(out?.note || 'Activated.'))
      .catch((err) => setDone(err?.message || 'Could not reach the server.'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Romancha Premium">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-amber-400/25 bg-[#150c20] shadow-2xl sm:rounded-3xl">
        <div className="relative bg-gradient-to-br from-amber-500/20 via-rose-600/15 to-transparent p-5">
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-rose-100/70 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 text-amber-300"><Crown className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Romancha Premium</span></div>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-white">Start at $1 for a day</h2>
          <p className="mt-1.5 text-sm text-rose-100/70">
            Free already talks unlimited in text. What you are buying is time on video: {formatDuration(FREE_PLAN.dailyCallSeconds)} a day free,
            {' '}{formatDuration(selected?.dailyCallSeconds || 7200)} on the plan you pick. No annual lock-in.
          </p>
          {usage && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-rose-100/80">
              <Clock className="h-3 w-3 text-amber-300" />
              Today: {formatDuration(usage.usedSeconds || 0)} used · {formatDuration(usage.secondsLeft ?? 0)} left
              {usage.plan ? ` · current plan ${usage.planLabel || usage.plan}` : ''}
              {usage.resetsAt ? ` · resets ${new Date(usage.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          )}
        </div>

        <div className="grid gap-2 px-5 sm:grid-cols-2">
          {(selected?.perks || FREE_PLAN.perks).map((perk) => (
            <div key={perk} className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-[13px] leading-snug text-rose-50">{perk}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 px-5 sm:grid-cols-4">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={`relative rounded-2xl border p-3 text-left transition ${selected?.id === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
              aria-pressed={selected?.id === p.id}
            >
              {p.badge && (
                <span className="absolute -top-2 right-2 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-950">{p.badge}</span>
              )}
              <span className="block text-[11px] uppercase tracking-wider text-rose-100/60">{p.label}</span>
              <span className="mt-1 block text-lg font-bold text-white">${p.priceUsd}</span>
              <span className="block text-[10px] text-rose-100/50">
                {p.priceBdt ? `৳${p.priceBdt.toLocaleString('en-US')} · ${p.days} day${p.days > 1 ? 's' : ''}` : `${p.days} days`}
              </span>
              <span className="mt-1.5 block text-[10px] text-amber-200">{formatDuration(p.dailyCallSeconds)} calls/day</span>
            </button>
          ))}
        </div>

        <div className="mt-3 px-5">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-rose-100/60">
            <p className="font-semibold text-rose-50">What the free tier keeps</p>
            <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
              {FREE_PLAN.perks.map((perk) => <li key={perk} className="flex items-center gap-1.5"><PERK_ICON.Check className="h-3 w-3 text-emerald-300" />{perk}</li>)}
            </ul>
            <p className="mt-2">Unused minutes do not carry over — the allowance is per day, and it resets at midnight in your own timezone.</p>
          </div>
        </div>

        <div className="p-5">
          {done ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm leading-relaxed text-emerald-200">
              <p className="font-semibold">{priceLabel(selected)} plan set on your account.</p>
              <p className="mt-1 text-[11.5px] text-emerald-100/70">{done}</p>
            </div>
          ) : (
            <button
              onClick={pay}
              disabled={busy}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-pink-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-rose-900/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? 'Confirming with the server…' : `Get ${selected.label} — ${priceLabel(selected)}`}
            </button>
          )}
          <p className="mt-2.5 text-center text-[11px] leading-snug text-rose-100/45">
            No card is charged: this build has no payment provider wired up (bKash, Nagad, Upay or Stripe — then this button runs a real checkout and the plan stops being a flag on your account).
          </p>
        </div>
      </div>
    </div>
  );
}
