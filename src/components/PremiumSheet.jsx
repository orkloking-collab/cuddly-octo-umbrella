import React, { useState } from 'react';
import { Crown, X, Check, Infinity as InfinityIcon, EyeOff, Rewind, ShieldCheck } from 'lucide-react';
import { useDialog } from '../utils/useDating';

const PLANS = [
  { id: '1m', label: '1 month', price: '৳1,190', per: '/month', save: null },
  { id: '3m', label: '3 months', price: '৳890', per: '/month', save: 'Save 25%' },
  { id: '12m', label: '12 months', price: '৳590', per: '/month', save: 'Save 50% · best value' },
];

const PERKS = [
  { icon: InfinityIcon, title: 'Unlimited likes', body: 'No 25-like daily cap, ever.' },
  { icon: EyeOff, title: 'Incognito mode', body: 'Nobody sees you until you like them first.' },
  { icon: Rewind, title: 'Unlimited rewind', body: 'Dropped the right person? Pull them back.' },
  { icon: Check, title: 'See everyone who liked you', body: 'No blurred cards, no waiting.' },
  { icon: Crown, title: '5 Super Likes weekly', body: 'Stand out at the top of their deck.' },
  { icon: ShieldCheck, title: 'Priority Trust & Safety review', body: 'Your reports get looked at first.' },
];

export default function PremiumSheet({ open, onClose, isPremium = false, onActivate }) {
  useDialog(open, onClose);
  const [plan, setPlan] = useState('12m');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(isPremium);

  if (!open) return null;

  const pay = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setDone(true);
      onActivate?.(plan);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Romancha Gold">
      <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-amber-400/25 bg-[#150c20] shadow-2xl sm:rounded-3xl">
        <div className="relative bg-gradient-to-br from-amber-500/20 via-rose-600/15 to-transparent p-5">
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-rose-100/70 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 text-amber-300"><Crown className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Romancha Gold</span></div>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-white">Be seen by the right people, faster</h2>
          <p className="mt-1.5 text-sm text-rose-100/70">Members get 4x more matches in their first week — mostly because we stop hiding you behind a daily like limit.</p>
        </div>

        <div className="grid gap-2 px-5 sm:grid-cols-2">
          {PERKS.map((p) => (
            <div key={p.title} className="flex gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-[13px] font-semibold text-white">{p.title}</p>
                <p className="text-[11px] leading-snug text-rose-100/55">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 px-5">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={`rounded-2xl border p-3 text-left transition ${plan === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
              aria-pressed={plan === p.id}
            >
              <span className="block text-[11px] uppercase tracking-wider text-rose-100/60">{p.label}</span>
              <span className="mt-1 block text-lg font-bold text-white">{p.price}</span>
              <span className="block text-[10px] text-rose-100/50">{p.per}</span>
              {p.save && <span className="mt-1.5 inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">{p.save}</span>}
            </button>
          ))}
        </div>

        <div className="p-5">
          {done ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
              Gold activated in this demo build. Unlimited likes, incognito and rewinds are on.
            </div>
          ) : (
            <button
              onClick={pay}
              disabled={busy}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-pink-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-rose-900/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? 'Contacting payment provider…' : `Start ${PLANS.find((p) => p.id === plan).label}`}
            </button>
          )}
          <p className="mt-2.5 text-center text-[11px] leading-snug text-rose-100/45">
            Demo checkout — no card is charged and no payment data is collected. Cancel anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
