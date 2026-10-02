import React from 'react';
import { SlidersHorizontal, X, Lock } from 'lucide-react';
import { useDialog } from '../utils/useDating';

function Toggle({ label, hint, checked, onChange, disabled, locked }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 ${locked ? 'opacity-80' : 'cursor-pointer hover:border-rose-400/40'}`}>
      <span className="flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {label}
          {locked && <Lock className="h-3 w-3 text-amber-300" />}
        </span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-rose-100/55">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition ${checked ? 'bg-rose-500' : 'bg-white/15'} ${locked ? 'opacity-60' : ''}`}
      >
        <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

export default function MatchFilters({ open, onClose, prefs, onChange, isPremium, matchesShown }) {
  useDialog(open, onClose);
  if (!open) return null;

  const set = (patch) => onChange?.(patch);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Dating filters">
      <div className="w-full max-w-md rounded-t-3xl border border-rose-500/25 bg-[#140b1e] p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <SlidersHorizontal className="h-4 w-4 text-rose-300" /> Who you see
          </h2>
          <button onClick={onClose} aria-label="Close filters" className="rounded-full p-1.5 text-rose-100/70 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <div className="flex items-center justify-between text-sm font-semibold text-white">
              <span>Age range</span>
              <span className="text-rose-200">{prefs.ageMin} – {prefs.ageMax}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-rose-100/50">Min</span>
                <input
                  type="range" min="18" max="70" value={prefs.ageMin}
                  onChange={(e) => set({ ageMin: Math.min(Number(e.target.value), prefs.ageMax) })}
                  className="w-full accent-rose-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-rose-100/50">Max</span>
                <input
                  type="range" min="18" max="70" value={prefs.ageMax}
                  onChange={(e) => set({ ageMax: Math.max(Number(e.target.value), prefs.ageMin) })}
                  className="w-full accent-rose-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <div className="flex items-center justify-between text-sm font-semibold text-white">
              <span>Maximum distance</span>
              <span className="text-rose-200">{prefs.distanceKm >= 5000 ? 'Anywhere' : `${prefs.distanceKm} km`}</span>
            </div>
            <input
              type="range" min="5" max="5000" step="5" value={prefs.distanceKm}
              onChange={(e) => set({ distanceKm: Number(e.target.value) })}
              className="mt-2 w-full accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-rose-100/40"><span>5 km</span><span>Worldwide</span></div>
          </div>

          <Toggle label="Verified profiles only" hint="Photo-verified people get 3x more replies. So do you, if you verify." checked={prefs.verifiedOnly} onChange={(v) => set({ verifiedOnly: v })} />
          <Toggle label="Online right now" hint="Show only people active in the last hour." checked={prefs.onlineOnly} onChange={(v) => set({ onlineOnly: v })} />
          <Toggle label="Show me on Romancha" hint="Turn off to browse without appearing in anyone's deck." checked={prefs.showMe} onChange={(v) => set({ showMe: v })} />
          <Toggle label="Incognito mode" hint="Only appear to people you liked first." checked={prefs.incognito} onChange={(v) => (isPremium ? set({ incognito: v }) : undefined)} locked={!isPremium} />
          <Toggle label="Hide my distance" hint="People see a match score, not your neighbourhood." checked={prefs.hideDistance} onChange={(v) => set({ hideDistance: v })} />
          <Toggle label="Allow video calls" hint="Matched people can start a in-app video date." checked={prefs.allowVideoCalls} onChange={(v) => set({ allowVideoCalls: v })} />
        </div>

        <p className="mt-4 text-center text-[11px] text-rose-100/50">
          {matchesShown} {matchesShown === 1 ? 'person matches' : 'people match'} these filters right now
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => set({ ageMin: 21, ageMax: 38, distanceKm: 100, verifiedOnly: false, onlineOnly: false })}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-xs font-semibold text-rose-100 hover:bg-white/5"
          >
            Reset
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110">
            Show my deck
          </button>
        </div>
      </div>
    </div>
  );
}
