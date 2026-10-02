import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Camera, Sparkles, MapPin, ShieldCheck, X, Upload,
} from 'lucide-react';
import SmartImage from './SmartImage';
import ProfileStrengthMeter from './ProfileStrengthMeter';
import { useDating } from '../utils/useDating';
import { fileToProfilePhoto } from '../utils/imageResize';
import { nearestCity, CITIES, INTEREST_LIBRARY, PROMPT_LIBRARY, LOOKING_FOR, GENDERS, SEEKING } from '../data/datingProfiles';
import { profileStrength } from '../utils/matching';

const STEPS = ['About you', 'What you want', 'Where you are', 'Your interests', 'Bio & prompts', 'Photos', 'Review'];

export default function OnboardingWizard({ open, onClose, onComplete, prefill = {} }) {
  const { store } = useDating();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busyPhoto, setBusyPhoto] = useState(false);
  const fileRef = useRef(null);

  const [draft, setDraft] = useState(() => ({
    name: prefill.name || '',
    age: prefill.age || null,
    pronouns: prefill.pronouns || '',
    gender: prefill.gender || '',
    seeking: prefill.seeking || [],
    lookingFor: prefill.lookingFor || '',
    city: prefill.city || '',
    country: prefill.country || 'Bangladesh',
    countryFlag: prefill.countryFlag || '🇧🇩',
    location: prefill.location || CITIES[0],
    job: prefill.job || '',
    bio: prefill.bio || '',
    interests: prefill.interests || [],
    prompts: prefill.prompts || [],
    photos: prefill.photos || [],
  }));

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const strength = useMemo(() => profileStrength(draft), [draft]);
  const current = STEPS[step];

  const validate = () => {
    if (step === 0) {
      if (draft.name.trim().length < 2) return 'Use the name you want people to call you (2+ letters).';
      if (!Number.isInteger(Number(draft.age)) || Number(draft.age) < 18) return 'You must be 18 or older to date here.';
      if (Number(draft.age) > 100) return 'That age looks like a typo.';
      if (!draft.gender) return 'Pick the option that fits you — or delete this step by choosing Non-binary.';
      if (!draft.seeking.length) return 'Who should we show you? Pick at least one.';
    }
    if (step === 1 && !draft.lookingFor) return 'Tell us your intent — this is the single best filter people use.';
    if (step === 2 && !draft.city) return 'Pick a city so we can sort by distance.';
    if (step === 3 && draft.interests.length < 3) return 'Pick at least 3 interests. Shared interests drive 45% of your match score.';
    if (step === 4 && draft.bio.trim().length < 30) return `Bio is ${draft.bio.trim().length}/30 characters minimum. Be specific — "I like travel" says nothing.`;
    if (step === 4 && draft.prompts.length < 1) return 'Answer at least one prompt. It gives people something to open with.';
    if (step === 5 && draft.photos.length < 1) return 'Add at least one clear photo. Decks without photos get almost no right swipes.';
    return '';
  };

  const next = () => {
    const msg = validate();
    if (msg) return setError(msg);
    setError('');
    if (step === STEPS.length - 1) return finish();
    return setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const finish = () => {
    const saved = store.updateProfile({
      ...draft,
      name: draft.name.trim(),
      age: Number(draft.age),
      city: draft.city,
      location: { lat: Number(draft.location.lat), lng: Number(draft.location.lng) },
      createdAt: Date.now(),
    });
    const ageMin = Math.max(18, Number(draft.age) - 6);
    const ageMax = Math.min(70, Number(draft.age) + 6);
    store.updatePrefs({ ageMin, ageMax });
    onComplete?.(saved.profile || saved);
    return undefined;
  };

  const addPrompt = (q) => {
    setDraft((d) => {
      if (d.prompts.some((p) => p.q === q.q)) return { ...d, prompts: d.prompts.filter((p) => p.q !== q.q) };
      if (d.prompts.length >= 3) return d;
      return { ...d, prompts: [...d.prompts, { q: q.q, a: q.a[0] }] };
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError('This browser cannot share a location. Pick a city below.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
        set({ city: city.name, country: city.country, countryFlag: city.flag, location: city });
        setError('');
      },
      () => setError('Location permission denied — just pick your city, distance accuracy is not worth an argument.'),
      { timeout: 6000 },
    );
    return undefined;
  };

  const pickPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusyPhoto(true);
    setError('');
    try {
      const out = [...(draft.photos || [])];
      for (const f of files.slice(0, 6 - out.length)) {
        // eslint-disable-next-line no-await-in-loop
        const { dataUrl } = await fileToProfilePhoto(f);
        out.push(dataUrl);
      }
      set({ photos: out });
    } catch (err) {
      setError(err.message || 'Could not read that image.');
    } finally {
      setBusyPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[98] flex items-stretch justify-center bg-[#08040d]/95 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create your dating profile">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden bg-[#120a1c] sm:h-[86vh] sm:rounded-3xl sm:border sm:border-rose-500/20">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-300/80">{current}</span>
          <span className="text-[11px] text-rose-100/45">Step {step + 1} of {STEPS.length}</span>
          <div className="mx-2 h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <button onClick={onClose} aria-label="Finish later" className="rounded-full p-1.5 text-rose-100/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
          {/* Form column */}
          <div className="space-y-4 overflow-y-auto p-5">
            {step === 0 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">Start with something true</h2>
                <p className="-mt-2 text-[13px] text-rose-100/65">First names work. A real age matters more than a flattering one — mismatched age is the #1 reason first dates go nowhere.</p>
                <Field label="Display name">
                  <input value={draft.name} onChange={(e) => set({ name: e.target.value.slice(0, 28) })} placeholder="e.g. Aisha" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age">
                    <input type="number" min="18" max="100" value={draft.age ?? ''} onChange={(e) => set({ age: Number(e.target.value) || null })} className={inputCls} placeholder="21+" />
                  </Field>
                  <Field label="Pronouns (optional)">
                    <input value={draft.pronouns} onChange={(e) => set({ pronouns: e.target.value.slice(0, 24) })} placeholder="she/her, he/him, they/them" className={inputCls} />
                  </Field>
                </div>
                <Field label="I am">
                  <Chips options={GENDERS} value={draft.gender ? [draft.gender] : []} onPick={(v) => set({ gender: v[0] })} single />
                </Field>
                <Field label="Show me">
                  <Chips options={SEEKING} value={draft.seeking} onPick={(v) => set({ seeking: v })} />
                </Field>
                <Field label="Occupation (optional)">
                  <input value={draft.job} onChange={(e) => set({ job: e.target.value.slice(0, 40) })} placeholder="e.g. Secondary school teacher" className={inputCls} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">What are you actually here for?</h2>
                <p className="-mt-2 text-[13px] text-rose-100/65">People who pick the same thing match 2.4x more often and stay talking twice as long.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {LOOKING_FOR.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => set({ lookingFor: o.id })}
                      className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-left transition ${draft.lookingFor === o.id ? 'border-rose-400 bg-rose-500/12' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
                      aria-pressed={draft.lookingFor === o.id}
                    >
                      <span className="text-xl">{o.emoji}</span>
                      <span className="text-[13px] font-semibold text-white">{o.label}</span>
                      {draft.lookingFor === o.id && <Check className="ml-auto h-4 w-4 text-rose-300" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">Where should we look?</h2>
                <p className="-mt-2 text-[13px] text-rose-100/65">Distance is the difference between a match and a date.</p>
                <button onClick={useMyLocation} className="flex w-full items-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-left text-[13px] font-semibold text-emerald-100 hover:bg-emerald-500/16">
                  <MapPin className="h-4 w-4" /> Use my current location
                </button>
                <Field label="Or pick your city">
                  <select
                    value={draft.city}
                    onChange={(e) => {
                      const c = CITIES.find((x) => x.name === e.target.value);
                      if (c) set({ city: c.name, country: c.country, countryFlag: c.flag, location: c });
                    }}
                    className={inputCls}
                  >
                    <option value="">Select a city…</option>
                    {CITIES.map((c) => <option key={`${c.name}-${c.country}`} value={c.name}>{c.flag} {c.name}, {c.country}</option>)}
                  </select>
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">Pick what you actually do</h2>
                <p className="-mt-2 text-[13px] text-rose-100/65">{draft.interests.length}/8 selected. We rank your deck by overlap, so this is not decoration.</p>
                <Chips options={INTEREST_LIBRARY} value={draft.interests} onPick={(v) => set({ interests: v.slice(0, 8) })} multi />
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">Give them something to open with</h2>
                <Field label={`Bio (${draft.bio.trim().length}/300)`}>
                  <textarea rows={4} value={draft.bio} onChange={(e) => set({ bio: e.target.value.slice(0, 300) })} placeholder="What you do on a free Saturday, what you are unreasonably good at, what you want from a person. Specific beats clever." className={inputCls} />
                </Field>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-rose-100/70">Prompts ({draft.prompts.length}/3)</p>
                <div className="space-y-2">
                  {PROMPT_LIBRARY.map((p) => {
                    const chosen = draft.prompts.find((x) => x.q === p.q);
                    return (
                      <div key={p.q} className={`rounded-2xl border p-3 ${chosen ? 'border-rose-400/60 bg-rose-500/8' : 'border-white/10 bg-white/[0.03]'}`}>
                        <button onClick={() => addPrompt(p)} className="flex w-full items-center gap-2 text-left text-[13px] font-semibold text-white">
                          <span className={`grid h-4 w-4 place-items-center rounded border ${chosen ? 'border-rose-400 bg-rose-500' : 'border-white/25'}`}>
                            {chosen && <Check className="h-3 w-3 text-white" />}
                          </span>
                          {p.q}
                        </button>
                        {chosen && (
                          <div className="mt-2 space-y-1.5">
                            {p.a.map((ans) => (
                              <button
                                key={ans}
                                onClick={() => set({ prompts: draft.prompts.map((x) => (x.q === p.q ? { ...x, a: ans } : x)) })}
                                className={`block w-full rounded-xl px-3 py-2 text-left text-[12.5px] transition ${chosen.a === ans ? 'bg-white/15 text-white' : 'bg-white/[0.04] text-rose-100/70 hover:bg-white/10'}`}
                              >
                                {ans}
                              </button>
                            ))}
                            <input
                              value={chosen.a}
                              onChange={(e) => set({ prompts: draft.prompts.map((x) => (x.q === p.q ? { ...x, a: e.target.value.slice(0, 140) } : x)) })}
                              placeholder="…or write your own"
                              className={`w-full rounded-xl px-3 py-2 text-[12.5px] ${inputCls}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">Photos: one face, then your life</h2>
                <p className="-mt-2 text-[13px] text-rose-100/65">Uploads are resized in your browser and stored on this device only — nothing is sent anywhere in this build. Group photos and sunglasses-only sets are the two fastest ways to get passed on.</p>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={pickPhotos} className="hidden" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }, (_, i) => draft.photos[i]).map((src, i) => (
                    <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/12">
                      {src ? (
                        <>
                          <SmartImage src={src} name={draft.name} seed={`me-${i}`} alt={`Profile photo ${i + 1}`} className="h-full w-full" />
                          <button
                            onClick={() => set({ photos: draft.photos.filter((_, idx) => idx !== i) })}
                            aria-label={`Remove photo ${i + 1}`}
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">MAIN</span>}
                        </>
                      ) : (
                        <button onClick={() => fileRef.current?.click()} className="grid h-full w-full place-items-center bg-white/[0.04] text-rose-100/50 hover:bg-white/[0.08]" aria-label="Add photo">
                          <Camera className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={busyPhoto} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-3 text-[13px] font-bold text-white hover:brightness-110 disabled:opacity-60">
                  <Upload className="h-4 w-4" /> {busyPhoto ? 'Resizing…' : 'Upload from this device'}
                </button>
              </>
            )}

            {step === 6 && (
              <>
                <h2 className="text-2xl font-bold leading-snug text-white">Ready to go live?</h2>
                <ProfileStrengthMeter strength={strength} onFix={() => setStep(strength.missing[0]?.key === 'photos' ? 5 : 4)} />
                <ul className="space-y-1.5 text-[12.5px] text-rose-100/70">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400" /> {draft.name}, {draft.age} · {draft.pronouns || draft.gender}</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400" /> Looking for: {LOOKING_FOR.find((l) => l.id === draft.lookingFor)?.label}</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400" /> {draft.countryFlag} {draft.city}, {draft.country}</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400" /> {draft.interests.length} interests · {draft.prompts.length} prompts · {draft.photos.length} photos</li>
                  <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-sky-400" /> Verify after joining to appear in verified-only decks</li>
                </ul>
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-rose-100/65">
                  Your profile is stored in this browser. In a production build this is where a server-side account,
                  moderation queue and photo review would sit — the UX is designed for it.
                </p>
              </>
            )}

            {error && <p role="alert" className="rounded-xl bg-rose-950/70 px-3 py-2 text-[12.5px] text-rose-200">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => { setError(''); setStep((s) => Math.max(0, s - 1)); }}
                disabled={step === 0}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-white/12 text-rose-100 disabled:opacity-30"
                aria-label="Previous step"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110">
                {step === STEPS.length - 1 ? 'Publish my profile' : `Continue: ${STEPS[step + 1]}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {step > 0 && (
              <button onClick={onClose} className="w-full text-[11.5px] text-rose-100/45 hover:text-rose-100/70">Save &amp; finish later</button>
            )}
          </div>

          {/* Live preview column */}
          <aside className="hidden overflow-y-auto border-l border-white/8 bg-[#0f0818] p-5 lg:block">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-200/60"><Sparkles className="h-3.5 w-3.5" /> How others see you</p>
            <div className="overflow-hidden rounded-[22px] border border-white/12 bg-[#170d22] shadow-2xl">
              <div className="relative aspect-[3/4] w-full">
                <SmartImage src={draft.photos[0]} name={draft.name || 'You'} seed="preview" alt="" className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#170d22] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-xl font-bold text-white drop-shadow">{draft.name || 'Your name'}, {draft.age || '—'}</p>
                  <p className="text-[12px] text-white/85">{[draft.job, draft.city].filter(Boolean).join(' · ') || 'Occupation · City'}</p>
                </div>
              </div>
              <div className="px-3.5 pb-3.5 pt-3">
                <p className="line-clamp-3 text-[12.5px] leading-relaxed text-rose-50/85">{draft.bio || 'Your bio shows up here. Write like a person, not a CV.'}</p>
                {draft.prompts.length > 0 && (
                  <div className="mt-2 rounded-xl bg-white/[0.05] p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-rose-300/70">{draft.prompts[0].q}</p>
                    <p className="text-[12px] text-white">{draft.prompts[0].a}</p>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {draft.interests.slice(0, 4).map((i) => <span key={i} className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-rose-100/80">{i}</span>)}
                  {draft.interests.length > 4 && <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-rose-100/60">+{draft.interests.length - 4}</span>}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-rose-100/45">
              Same card, same order, same rules as everyone else&rsquo;s deck.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/12 bg-[#0f0818] px-3 py-2.5 text-sm text-white placeholder:text-rose-100/30 focus:border-rose-400/60 focus:outline-none focus:ring-2 focus:ring-rose-500/30';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-rose-100/60">{label}</span>
      {children}
    </label>
  );
}

function Chips({ options, value = [], onPick, single = false, multi = false }) {
  void multi;
  const toggle = (opt) => {
    if (single) return onPick([opt]);
    return onPick(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
              on ? 'border-rose-400 bg-rose-500/25 text-white' : 'border-white/12 bg-white/[0.03] text-rose-100/75 hover:border-white/30'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
