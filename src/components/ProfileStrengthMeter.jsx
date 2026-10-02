import React from 'react';
import { Check, Sparkles } from 'lucide-react';

const BANDS = [
  { min: 95, label: 'Standout', cls: 'from-emerald-400 to-teal-400' },
  { min: 75, label: 'Strong', cls: 'from-rose-400 to-pink-500' },
  { min: 50, label: 'Getting there', cls: 'from-amber-400 to-orange-400' },
  { min: 0, label: 'Needs work', cls: 'from-slate-400 to-slate-500' },
];

export default function ProfileStrengthMeter({ strength, compact = false, onFix }) {
  const band = BANDS.find((b) => strength.score >= b.min) || BANDS[BANDS.length - 1];
  return (
    <div className={compact ? '' : 'glass-card rounded-2xl p-4'}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rose-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-100/80">Profile strength</span>
        </div>
        <span className="text-xs font-bold text-white">{strength.score}% · {band.label}</span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full bg-gradient-to-r ${band.cls} transition-all duration-500`} style={{ width: `${strength.score}%` }} />
      </div>

      {!compact && strength.missing.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {strength.missing.slice(0, 3).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={onFix}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-rose-100/80 transition hover:border-rose-400/60 hover:text-white"
            >
              + {m.label}
            </button>
          ))}
        </div>
      )}
      {!compact && strength.missing.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <Check className="h-3.5 w-3.5" /> Complete profile — you now outrank ~70% of decks in your city.
        </p>
      )}
    </div>
  );
}
