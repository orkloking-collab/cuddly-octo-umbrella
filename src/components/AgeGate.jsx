import React, { useState } from 'react';
import { ShieldCheck, Lock, Heart } from 'lucide-react';
import { ageFrom, writeAgeGate } from '../utils/ageVerification';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const YEARS = Array.from({ length: 85 }, (_, i) => 2008 - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function AgeGate({ onPass }) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [tooYoung, setTooYoung] = useState(false);

  // Year list is derived once from a fixed 1940 base so render stays free of Date.now().
  const years = YEARS;
  const days = DAYS;

  const submit = (e) => {
    e.preventDefault();
    if (!day || !month || !year) return setError('Please pick your full date of birth.');
    const dob = new Date(Number(year), Number(month), Number(day));
    if (dob.getTime() > Date.now()) return setError('That date is in the future.');
    const age = ageFrom(dob.getTime());
    if (age < 18) {
      setTooYoung(true);
      setError('');
      return undefined;
    }
    if (age > 110) return setError('Please double-check the year.');
    writeAgeGate(dob.getTime(), age);
    onPass?.({ age, dob: dob.getTime() });
    return undefined;
  };

  const selectCls =
    'w-full appearance-none rounded-xl bg-[#120a1c] border border-rose-500/25 px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/60';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08040d]/95 backdrop-blur-md px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-rose-500/25 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700 text-white shadow-lg">
            <Heart className="h-5 w-5 fill-white/90" />
          </span>
          <div>
            <p className="font-cinzel text-lg font-bold tracking-wide text-white">Romancha</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-rose-300/70">Dating • Stories • Real conversations</p>
          </div>
        </div>

        {tooYoung ? (
          <div className="mt-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
            <h1 className="mt-4 text-xl font-bold text-white">You need to be 18 or older</h1>
            <p className="mt-2 text-sm text-rose-100/70">
              Romancha is an adults-only app. Nothing was stored, and we appreciate you telling us the truth.
              Come back when you are 18 — or try our free story library, which is open to everyone.
            </p>
            <button
              type="button"
              onClick={() => setTooYoung(false)}
              className="mt-6 rounded-xl border border-rose-500/40 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/10"
            >
              I entered this wrong
            </button>
          </div>
        ) : (
          <>
            <h1 id="age-gate-title" className="mt-6 text-2xl font-bold leading-snug text-white">
              Before you date here: are you 18 or older?
            </h1>
            <p className="mt-2 text-sm text-rose-100/70">
              We ask for your real date of birth because verified adults only is the whole point. Your DOB stays
              on this device and is only used to compute your age.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-rose-200/60">Day</span>
                  <select className={selectCls} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Birth day">
                    <option value="">DD</option>
                    {days.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-rose-200/60">Month</span>
                  <select className={selectCls} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Birth month">
                    <option value="">MM</option>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-rose-200/60">Year</span>
                  <select className={selectCls} value={year} onChange={(e) => setYear(e.target.value)} aria-label="Birth year">
                    <option value="">YYYY</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{error}</p>
              )}

              <ul className="space-y-1.5 text-xs text-rose-100/60">
                <li className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" /> No nudes, no soliciting, no money requests. One report removes the account.</li>
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /> Photo verification unlocks the verified-only filter for everyone.</li>
              </ul>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                Confirm I am 18+ and enter
              </button>
              <p className="text-center text-[11px] text-rose-200/40">
                By continuing you accept the Community Guidelines and Privacy Policy.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
