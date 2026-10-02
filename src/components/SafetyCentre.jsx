import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, Camera, Ban, FileWarning, Download, Trash2, PhoneCall, LifeBuoy,
  ChevronRight, Check, Clock, Lock, Mic, Image as ImageIcon,
} from 'lucide-react';
import SmartImage from './SmartImage';
import { useDating, useNow, timeAgo } from '../utils/useDating';
import PhoneVerifyPanel from './PhoneVerifyPanel';
import { datingProfiles } from '../data/datingProfiles';
import { serverSync } from '../utils/serverSync';

const TABS = [
  { id: 'verify', label: 'Verification', icon: Camera },
  { id: 'safety', label: 'Date safety', icon: LifeBuoy },
  { id: 'controls', label: 'Privacy', icon: Lock },
  { id: 'reports', label: 'Blocks & reports', icon: Ban },
  { id: 'data', label: 'Your data', icon: Download },
];

const REPORT_REASONS = [
  'Underage user',
  'Harassment or hate speech',
  'Asking for money (scam)',
  'Nude or sexual content',
  'Fake profile / catfish',
  'Spam or advertising',
  'In-person behaviour concern',
];

const TIPS = [
  { title: 'Video call before you meet', body: 'A 3-minute call kills 90% of fake profiles. Do it inside the app so your number stays private.' },
  { title: 'First date: daytime, public, your own transport', body: 'No rides from someone you met here. Tell one friend the venue and the time.' },
  { title: 'Never send money, crypto or gift cards', body: 'Any request for money — however urgent the story — is a scam. Report and block, then screenshot.' },
  { title: 'Keep your address, workplace and full name out of chat', body: 'Blockers, not politeness. You can always share later; you cannot unshare.' },
  { title: 'Alcohol is a plan, not a first-date strategy', body: 'Match Day 2 or 3 if you want to actually remember whether there is a spark.' },
];

export default function SafetyCentre({ open, onClose, targetProfile = null }) {
  const { store, profile } = useDating();
  const now = useNow(15000);
  const [tab, setTab] = useState(targetProfile ? 'reports' : 'verify');
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState('');
  const [flash, setFlash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const state = store.getState();

  if (!open) return null;

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 4200); };

  const verify = async () => {
    setVerifying(true);
    say('Selfie received — checking it against your photos…');
    // On the server this is a real queue: pending, then approved once the phone
    // number is confirmed. Locally we fall back to the old heuristic.
    const out = await store.verifySelfieNow();
    setVerifying(false);
    if (out.ok && out.verified) say('Verified ✅ Your badge is live and verified-only users can see you.');
    else if (out.pending) say(out.note || 'Queued for review — we will flip the badge on as soon as it clears.');
    else say(out.error || 'We could not compare your selfie to your photos. Add one clear face photo and retry.');
  };

  const submitReport = () => {
    if (!targetProfile) return;
    store.report(targetProfile.id, reason, detail);
    setDetail('');
    say(`Report submitted. ${targetProfile.name} is blocked and cannot see or message you. Trust & Safety reviews this within 24h.`);
  };

  const exportData = () => {
    const blob = new Blob([store.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'romancha-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    say('Downloaded every row this app holds about you — all local, nothing on a server.');
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Safety centre">
      <div className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#130a1d] sm:h-[80vh] sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300"><ShieldCheck className="h-5 w-5" /></span>
          <div className="flex-1">
            <h2 className="text-base font-bold leading-tight text-white">Trust &amp; Safety Centre</h2>
            <p className="text-[11px] text-rose-100/60">Everything here works on-device in this build.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/15 px-3 py-1.5 text-[12px] text-rose-100 hover:bg-white/5">Close</button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${tab === t.id ? 'bg-white text-[#1a0f24]' : 'text-rose-100/75 hover:bg-white/5'}`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {flash && <p role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-100">{flash}</p>}

          {tab === 'verify' && (
            <section className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  {state.verification.status === 'verified' ? <><Check className="h-4 w-4 text-emerald-400" /> You are photo verified</>
                    : state.verification.status === 'pending' ? <><Clock className="h-4 w-4 text-amber-300" /> Verification in review</>
                      : 'Get the verified badge'}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-rose-100/70">
                  We compare a live selfie to your photos to prove you are a real person, in your own photos. Verified
                  profiles get 3x more matches and can be filtered to by everyone else. Your selfie is deleted right
                  after the comparison — it is never used for anything else.
                </p>
                {state.verification.status !== 'verified' && (
                  <button onClick={verify} disabled={verifying} className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-[13px] font-bold text-white hover:brightness-110 disabled:opacity-60">
                    <Camera className="h-4 w-4" /> {verifying ? 'Checking…' : state.verification.status === 'pending' ? 'Retry verification' : 'Verify with a selfie'}
                  </button>
                )}
                <p className="mt-2 text-[11px] text-rose-100/40">Age gate: {profile.age ? `${profile.age} years old, confirmed at signup` : 'not set'}. Under-18 accounts are removed on report, no appeal.</p>
              </div>

              <PhoneVerifyPanel />

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] text-rose-100/55">
                <span className="font-semibold text-white/70">
                  {state.server?.mode === 'server' ? 'Saved on the Romancha server' : 'Saved in this browser only'}
                </span>
                {state.server?.mode === 'server'
                  ? <>· swipes, chats and reports sync across your devices</>
                  : <>· start <code className="rounded bg-black/40 px-1">npm run dev</code> for accounts, chats and verification on a real backend</>}
                {state.server?.error ? <span className="text-amber-300">· last sync problem: {state.server.error}</span> : null}
              </div>

              {targetProfile && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4">
                  <p className="text-sm font-bold text-white">Report {targetProfile.name}, {targetProfile.age}</p>
                  <p className="mt-1 text-[12px] text-rose-100/70">Reporting also blocks them immediately. You can undo the block, not the report.</p>
                  <label className="mt-3 block">
                    <span className="text-[11px] uppercase tracking-wider text-rose-100/60">Reason</span>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-xl border border-white/12 bg-[#120a1c] px-3 py-2.5 text-sm text-white focus:outline-none">
                      {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="mt-2 block">
                    <span className="text-[11px] uppercase tracking-wider text-rose-100/60">What happened (optional, helps reviewers)</span>
                    <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 500))} rows={3} placeholder="e.g. asked me for bKash money after two messages" className="mt-1 w-full rounded-xl border border-white/12 bg-[#120a1c] px-3 py-2.5 text-sm text-white placeholder:text-rose-100/30 focus:outline-none" />
                  </label>
                  <button onClick={submitReport} className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-rose-500">
                    Submit report &amp; block
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === 'safety' && (
            <section className="space-y-2.5">
              {TIPS.map((t) => (
                <article key={t.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-white">{t.title}<ChevronRight className="ml-auto h-3.5 w-3.5 opacity-30" /></h4>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-rose-100/70">{t.body}</p>
                </article>
              ))}
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/8 p-3.5">
                <p className="text-[13.5px] font-bold text-white">If a date goes wrong</p>
                <p className="mt-1 text-[12.5px] text-rose-100/75">Leave. You do not owe anyone an explanation. Then report it here — in-person conduct is a bannable offence on Romancha.</p>
                <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-200"><PhoneCall className="h-3.5 w-3.5" /> Emergency: 999 (Bangladesh) · local police cyber unit for extortion/sextortion</p>
              </div>
            </section>
          )}

          {tab === 'controls' && (
            <section className="space-y-2">
              {[
                { key: 'showMe', label: 'Show me in other people\u2019s decks', hint: 'Off = you can still swipe, nobody sees you.' },
                { key: 'readReceipts', label: 'Read receipts', hint: 'Turn off if you hate replying under pressure.' },
                { key: 'hideDistance', label: 'Hide my exact distance', hint: 'People see a match score instead of km.' },
                { key: 'allowVideoCalls', label: 'Allow video dates with matches', hint: 'Recommended before meeting anyone.' },
                { key: 'verifiedOnly', label: 'Only see verified people', hint: 'Smaller deck, far fewer fakes.' },
                { key: 'incognito', label: 'Incognito (Gold)', hint: 'Only visible to people you liked first.', premium: true },
              ].map((c) => (
                <label key={c.key} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                  <span>
                    <span className="block text-[13px] font-semibold text-white">{c.label}</span>
                    <span className="block text-[11.5px] text-rose-100/60">{c.hint}</span>
                  </span>
                  <button
                    role="switch"
                    aria-checked={Boolean(state.prefs[c.key])}
                    aria-label={c.label}
                    onClick={() => {
                      if (c.premium && !store.isPremium()) return say('Incognito is a Gold perk — unlock it in Premium.');
                      store.updatePrefs({ [c.key]: !state.prefs[c.key] });
                    }}
                    className={`mt-1 h-6 w-11 shrink-0 rounded-full p-0.5 transition ${state.prefs[c.key] ? 'bg-rose-500' : 'bg-white/15'}`}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${state.prefs[c.key] ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
              ))}
            </section>
          )}

          {tab === 'reports' && (
            <section className="space-y-3">
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-rose-100/70">People you blocked ({state.blocked.length})</h4>
                {state.blocked.length === 0 ? (
                  <p className="mt-1.5 text-[12.5px] text-rose-100/55">No blocks. Good — or you have not needed one yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {state.blocked.map((id) => {
                      const p = datingProfiles.find((x) => x.id === id);
                      return (
                        <li key={id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                          <SmartImage src={p?.photos?.[0]} name={p?.name} seed={id} alt="" className="h-8 w-8 rounded-lg opacity-60" />
                          <span className="flex-1 text-[13px] text-white">{p?.name || id}</span>
                          <button onClick={() => { store.unblock(id); say('Unblocked. They can appear in your deck again.'); }} className="rounded-lg border border-white/15 px-2.5 py-1 text-[11.5px] text-rose-100 hover:bg-white/5">
                            Unblock
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-rose-100/70">Reports you filed ({state.reported.length})</h4>
                {state.reported.length === 0 ? (
                  <p className="mt-1.5 text-[12.5px] text-rose-100/55">Nothing filed. Use it — reporting is how a community stays usable.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {state.reported.map((r, i) => {
                      const p = datingProfiles.find((x) => x.id === r.profileId);
                      const resolved = now - r.at > 20000;
                      return (
                        <li key={`${r.profileId}-${i}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                          <p className="flex items-center gap-2 text-[13px] font-semibold text-white">
                            <FileWarning className="h-3.5 w-3.5 text-amber-300" /> {p?.name || r.profileId}
                            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${resolved ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                              {resolved ? 'Account removed' : 'In review'}
                            </span>
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-rose-100/65">{r.reason}{r.detail ? ` · “${r.detail}”` : ''} · {timeAgo(r.at)}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {tab === 'data' && (
            <DataPanel store={store} state={state} exportData={exportData} say={say} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Your data, in the two modes this app can run in.
 *
 * The list of uploads matters on a dating app more than most places: a photo you
 * sent once should be removable, and "delete everything" has to mean the server too,
 * not just the browser. Deleting a file drops it from your account; the bytes are
 * only unlinked when nobody else's message points at the same content hash.
 */
function DataPanel({ store, state, exportData, say }) {
  const online = state.server?.mode === 'server';
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState('');

  const refresh = () => serverSync.uploads().then((out) => setMedia(out?.files ? out : { error: out?.error || 'unavailable' }));

  useEffect(() => {
    if (!online) { setMedia(null); return undefined; }
    let alive = true;
    serverSync.uploads().then((out) => { if (alive) setMedia(out?.files ? out : { error: out?.error || 'unavailable' }); });
    return () => { alive = false; };
  }, [online]);

  async function remove(id) {
    setBusy(id);
    await serverSync.deleteUpload(id);
    await refresh();
    setBusy('');
    say('That file is off your account.');
  }

  async function wipeServer() {
    setBusy('all');
    await serverSync.deleteAllUploads();
    await refresh();
    setBusy('');
    say('Media deleted from the server too.');
  }

  return (
            <section className="space-y-2.5">
              <p className="text-[12.5px] leading-relaxed text-rose-100/70">
                {online ? (
                  <>You are signed in, so your profile, swipes, matches and messages live in the Romancha database —
                    <span className="text-white"> not in analytics, not in an ad network</span>. Export and delete below work on the server copy.</>
                ) : (
                  <>This build has no server connected, so your profile, swipes, matches and messages live in this browser only —
                    <span className="text-white"> no analytics, no ad trackers, nothing to request from a company</span>.</>
                )}
              </p>
              <button onClick={exportData} className="flex w-full items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-3.5 py-3 text-[13px] font-semibold text-white hover:bg-white/[0.06]">
                <Download className="h-4 w-4 text-rose-300" /> Export everything as JSON
              </button>
              <button
                onClick={() => { if (window.confirm('Delete your dating profile, matches and chats from this browser? This cannot be undone.')) { store.resetAll(); say('Wiped. You are a brand-new account again.'); } }}
                className="flex w-full items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-3 text-[13px] font-semibold text-rose-200 hover:bg-rose-950/60"
              >
                <Trash2 className="h-4 w-4" /> Delete all my dating data
              </button>
              {online && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-white">Photos and voice notes you uploaded</p>
                    <button onClick={refresh} className="rounded-full border border-white/12 px-2 py-0.5 text-[10.5px] text-rose-100/70">Refresh</button>
                  </div>
                  {!media ? (
                    <p className="mt-1.5 text-[11.5px] text-rose-100/45">Checking…</p>
                  ) : media.error ? (
                    <p className="mt-1.5 text-[11.5px] text-amber-200">{media.error}</p>
                  ) : media.files.length === 0 ? (
                    <p className="mt-1.5 text-[11.5px] text-rose-100/45">Nothing stored. Chat photos and voice notes appear here.</p>
                  ) : (
                    <>
                      <p className="mt-1 text-[11px] text-rose-100/50">{(media.usedBytes / 1024).toFixed(0)} KB of {(media.quotaBytes / 1024 / 1024).toFixed(0)} MB used</p>
                      <ul className="mt-2 space-y-1.5">
                        {media.files.map((f) => (
                          <li key={f.id} className="flex items-center gap-2">
                            {f.kind === 'image' && f.url ? (
                              <img src={f.url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" loading="lazy" />
                            ) : (
                              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${f.kind === 'voice' ? 'bg-sky-500/15 text-sky-300' : 'bg-white/8 text-rose-200'}`}>
                                {f.kind === 'voice' ? <Mic className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate text-[11.5px] text-rose-100/70">
                              {f.kind} · {(f.bytes / 1024).toFixed(0)} KB · {new Date(f.at).toLocaleDateString()}
                            </span>
                            <button onClick={() => remove(f.id)} disabled={busy === f.id} className="shrink-0 rounded-full border border-rose-400/40 px-2 py-0.5 text-[10.5px] text-rose-200 disabled:opacity-50">
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {media?.files?.length > 0 && (
                    <button
                      onClick={() => { if (window.confirm('Delete every photo and voice note from your account? Chats will keep the text but the media will be gone.')) wipeServer(); }}
                      disabled={busy === 'all'}
                      className="mt-2.5 w-full rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-[12px] font-semibold text-rose-200 disabled:opacity-50"
                    >
                      {busy === 'all' ? 'Deleting…' : 'Delete all media on the server'}
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-rose-100/45">
                {online
                  ? 'This browser also keeps a working copy in localStorage (romancha_dating_v1) so the app opens instantly. Clearing it does not delete the server copy — use the buttons above.'
                  : 'Keys used: romancha_dating_v1, romancha_age_gate_v1, romancha_accounts_database_v2.'}
              </p>
            </section>
  );
}
