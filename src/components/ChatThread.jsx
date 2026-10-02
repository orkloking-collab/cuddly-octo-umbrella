import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, MoreVertical, Video, ShieldAlert, HeartCrack, Camera, Mic, Send,
  Sparkles, Clock, PhoneCall, LifeBuoy, ImagePlus, X, Square,
} from 'lucide-react';
import SmartImage from './SmartImage';
import { useDating, useDialog, useNow, timeAgo, formatCountdown } from '../utils/useDating';
import { replyTo, matchOpener, suggestedReplies, staleness } from '../utils/chatEngine';
import { preparePhoto, sendRecording, startVoiceRecorder, captureSelfie } from '../utils/mediaApi';

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const REAL_CHAT_NOTICES = {
  harassment: 'That message crossed a line. A real member can report it and lose your account over it — report yourself to Trust & Safety instead, and mean it.',
  scam: 'Money, gift cards and crypto are the number one scam vector here. Never send, and never accept "just lend me".',
  boundary: 'Unsolicited sexual messages are the most-reported first-contact mistake. Wait until there is a real conversation.',
  age: "Everyone on Romancha has to be 18+ with verification. Pushing on someone's age is a review trigger.",
};

/**
 * 1:1 conversation with a match.
 * Includes the three things this app previously had none of: reply typing,
 * a guardrail path for harassment/scams, and an unmatch/report affordance
 * that actually changes state (blocked + removed from inbox).
 */
export default function ChatThread({ matchId, onClose, onOpenVideoCall, onOpenSafety, onOpenProfile }) {
  const { store, profile, state } = useDating();
  const now = useNow(30000);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [safeTimer, setSafeTimer] = useState(null);
  const listRef = useRef(null);
  // ---- real media capture (no placeholders anywhere in this flow) ----
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const [busy, setBusy] = useState(''); // '' | 'photo' | 'camera' | 'voice'
  const [pendingPhoto, setPendingPhoto] = useState('');
  const [notice, setNotice] = useState('');
  const [recSeconds, setRecSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [zoom, setZoom] = useState('');

  useEffect(() => {
    if (busy !== 'voice') return undefined;
    const t = setInterval(() => setRecSeconds((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // Any capture in flight must not survive a closed thread, or the microphone
  // stays hot after the sheet is gone.
  useEffect(() => () => {
    if (recorderRef.current) { recorderRef.current.cancel(); recorderRef.current = null; }
  }, []);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(''), 6000);
  }

  async function onPickPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // let the same file be picked twice
    if (!file) return;
    setBusy('photo');
    try {
      const out = await preparePhoto(file, { onProgress: () => {} });
      setPendingPhoto(out.url);
      setUploadResult(out);
      setBusy('');
    } catch (err) {
      setBusy('');
      setPendingPhoto('');
      flash(err?.message || 'That photo could not be prepared.');
    }
  }

  async function shoot() {
    setBusy('camera');
    try {
      const out = await captureSelfie();
      setPendingPhoto(out.dataUrl);
      setUploadResult(null);
      setBusy('');
    } catch (err) {
      setBusy('');
      flash(err?.message || 'Camera could not start. Check the permission in your browser address bar.');
    }
  }

  function closeCamera() {
    if (busy === 'camera') setBusy('');
  }

  async function sendPendingPhoto() {
    const url = pendingPhoto;
    if (!url) return;
    const localOnly = !uploadResult || uploadResult.local;
    const bytes = uploadResult?.bytes ?? Math.round(url.length * 0.75);
    setBusy('photo');
    const text = draft.trim();
    setDraft('');
    store.sendMedia(matchId, {
      kind: 'photo', url, bytes, text, localOnly,
      note: localOnly ? 'Photo kept in this tab only — start the Romancha server to store it on your account.' : '',
    });
    setPendingPhoto('');
    setUploadResult(null);
    setBusy('');
  }

  async function startRecording() {
    setBusy('voice');
    setRecSeconds(0);
    setLevel(0);
    try {
      const rec = await startVoiceRecorder({ onLevel: setLevel });
      recorderRef.current = rec;
      rec.done().then(async ({ blob, ms }) => {
        recorderRef.current = null;
        setBusy('');
        setLevel(0);
        try {
          const out = await sendRecording(blob);
          store.sendMedia(matchId, {
            kind: 'voice', url: out.url, bytes: out.bytes, durationMs: ms, localOnly: Boolean(out.local),
            note: out.note || '',
          });
        } catch (err) {
          flash(err?.message || 'The recording could not be sent.');
        }
      }).catch((err) => {
        recorderRef.current = null;
        setBusy('');
        flash(err?.message || 'Recording failed.');
      });
    } catch (err) {
      setBusy('');
      flash(err?.message || 'Microphone unavailable.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function cancelRecording() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setBusy('');
    setLevel(0);
  }
  // Real accounts live in `state.people` (hydrated from the server); personas in
  // the bundled dataset. personById knows both, so one thread component serves
  // scripted matches and genuine ones.
  const them = useMemo(() => store.personById(matchId), [matchId, store, state.people]);
  const isRealChat = store.isRemoteId(matchId) && state.server?.mode === 'server';
  const [thread, setThread] = useState(() => store.thread(matchId));
  // Prepared upload for the photo that is waiting for the Send tap.
  const [uploadResult, setUploadResult] = useState(null);

  useDialog(Boolean(matchId), onClose);

  useEffect(() => {
    const unsub = store.subscribe(() => setThread(store.thread(matchId)));
    store.markRead(matchId);
    return unsub;
  }, [store, matchId]);

  // Nudge them to open their mouth: real apps let the match message first ~60% of the time.
  // Only for seeded personas — inventing an opener inside a *real* conversation
  // would be putting words in another person's mouth.
  useEffect(() => {
    if (isRealChat) return undefined;
    if (!them || thread.messages.length) return undefined;
    const opener = matchOpener(them, store.getProfile());
    if (!opener) return undefined;
    store.setTyping(matchId, true);
    const t = setTimeout(() => {
      store.setTyping(matchId, false);
      store.appendMessage(matchId, { from: 'them', text: opener.text, kind: 'text' });
    }, opener.delayMs);
    return () => { store.setTyping(matchId, false); clearTimeout(t); };
  }, [them, thread.messages.length, matchId, store, isRealChat]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread.messages.length, thread.typing]);

  useEffect(() => {
    if (!safeTimer) return undefined;
    const t = setTimeout(() => {
    store.appendMessage(matchId, { from: 'system', kind: 'system', text: 'Safe check: you told us you were on a date an hour ago. Reply “ok” or tap End date — nobody else sees this.' });
      setSafeTimer(null);
    }, Math.max(0, safeTimer - now));
    return () => clearTimeout(t);
  }, [safeTimer, matchId, store, now]);

  const send = (text) => {
    const clean = (text ?? draft).trim();
    if (!clean || !them) return;
    const turn = thread.messages.filter((m) => m.from === 'me').length;
    store.sendText(matchId, clean);
    setDraft('');
    const res = replyTo(clean, store.getProfile(), them, turn);
    if (res.kind === 'silence') return;
    // A real member's reply arrives over SSE from the server. Fabricating one
    // here would be the single most damaging thing this app could do. The
    // guardrail pattern is still worth acting on, but as advice to *you* —
    // never as words put in someone else's mouth.
    if (isRealChat) {
      if (res.kind === 'guardrail') {
        store.appendMessage(matchId, {
          from: 'system',
          kind: 'system',
          text: `Romancha safety notice · ${REAL_CHAT_NOTICES[res.code] || 'Our filters flagged this message. Nothing else was sent on your behalf.'}`,
        });
      }
      return;
    }
    // Replies are intentionally NOT cancelled when this sheet closes: they land in
    // the store, which is what bumps the unread badge in the inbox. A dating chat
    // that only exists while you are looking at it is not a chat.
    if (res.kind === 'guardrail') {
      setTimeout(() => store.appendMessage(matchId, {
        from: 'them', text: res.text, kind: 'guardrail', guardrail: res.code, action: res.action,
      }), 900);
      return;
    }
    store.setTyping(matchId, true);
    setTimeout(() => {
      store.setTyping(matchId, false);
      store.appendMessage(matchId, { from: 'them', text: res.text, kind: 'text' });
    }, Math.min(res.delayMs, 6500));
  };

  if (!them) return null;
  const match = store.getState().matches.find((m) => m.profileId === matchId);
  const stale = staleness(thread.messages);
  const quick = suggestedReplies(store.getProfile(), them);

  return (
    <div className="fixed inset-0 z-[97] flex flex-col bg-[#0d0714]" role="dialog" aria-modal="true" aria-label={`Chat with ${them.name}`}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#150b1f]/95 px-3 py-2.5 backdrop-blur">
        <button onClick={onClose} aria-label="Back to inbox" className="rounded-full p-1.5 text-rose-100 hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => onOpenProfile?.(them)} className="relative shrink-0" aria-label={`View ${them.name}'s profile`}>
          <SmartImage src={them.photos?.[0]} name={them.name} seed={them.id} alt="" className="h-10 w-10 rounded-full border border-rose-400/40" />
          {them.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#150b1f] bg-emerald-400" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{them.name}, {them.age}</p>
          <p className="truncate text-[11px] text-rose-100/60">
            {thread.typing ? <span className="text-emerald-300">typing…</span> : them.online ? 'Online now' : isRealChat ? 'Real member · messages are saved on the server' : `Active ${timeAgo(now - (them.lastActiveMins ?? 0) * 60000, now)}`}
            {' · '}{them.city}
          </p>
        </div>
        {them.verified && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">VERIFIED</span>}
        {store.getState().prefs.allowVideoCalls && (
          <button
            onClick={() => onOpenVideoCall?.(them)}
            aria-label="Start video date"
            title={isRealChat ? 'Start a peer-to-peer video date' : 'Demo persona: video dates need a real member on the other side'}
            className={`rounded-full p-2 hover:bg-white/10 ${isRealChat ? 'text-rose-100' : 'text-rose-100/40'}`}
          ><Video className="h-4.5 w-4.5" /></button>
        )}
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Conversation options" aria-expanded={menuOpen} className="rounded-full p-2 text-rose-100 hover:bg-white/10"><MoreVertical className="h-4.5 w-4.5" /></button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-white/12 bg-[#1d1129] py-1 shadow-2xl">
              {[
                { icon: PhoneCall, label: 'Voice date', fn: () => onOpenVideoCall?.(them) },
                { icon: LifeBuoy, label: 'I am on a date — check on me', fn: () => setSafeTimer(Date.now() + 3600_000) },
                { icon: Sparkles, label: 'Send a Sparkle', fn: () => send('✨') },
                { icon: ShieldAlert, label: 'Report ' + them.name.split(' ')[0], fn: () => onOpenSafety?.(them) },
                { icon: HeartCrack, label: 'Unmatch', danger: true, fn: () => { store.unmatch(matchId); onClose?.(); } },
              ].map((it) => (
                <button
                  key={it.label}
                  onClick={() => { setMenuOpen(false); it.fn(); }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] transition hover:bg-white/[0.06] ${it.danger ? 'text-rose-300' : 'text-rose-50'}`}
                >
                  <it.icon className="h-4 w-4 shrink-0" /> {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Context strips */}
      {match?.expiresAt && match.expiresAt > now && (
        <div className="flex items-center gap-2 bg-amber-500/12 px-4 py-2 text-[11.5px] text-amber-200">
          <Clock className="h-3.5 w-3.5" /> New match: say something in {formatCountdown(match.expiresAt - now)} or it disappears.
        </div>
      )}
      {stale.level !== 'fresh' && (
        <div className="bg-white/[0.04] px-4 py-2 text-[11.5px] text-rose-100/70">
          {stale.level === 'cold' ? 'This one has gone cold.' : `Quiet for ${Math.round(stale.hours)}h.`} A question beats a “hey”.
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-[92%] rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-3 text-[11.5px] leading-relaxed text-emerald-100/85">
          <p className="font-semibold text-emerald-200">You matched on {new Date(match?.matchedAt || now).toLocaleDateString()}</p>
          <p className="mt-1">
            {(profile.name || 'You').split(' ')[0]} × {them.name.split(' ')[0]} · compatibility {them.match?.score ?? '—'}%
            {them.prompts?.[0] ? ` · they said: “${them.prompts[0].a}”` : ''}
          </p>
          <p className="mt-1 text-emerald-100/60">Never send money, never share your address early, and meet somewhere public with people around.</p>
        </div>

        {thread.messages.map((m, i) => (
          <Message
            key={m.id || i}
            msg={m}
            them={them}
            readReceipts={store.getState().prefs.readReceipts}
            now={now}
            onAction={() => { onOpenSafety?.(them); }}
            onZoom={(src) => setZoom(src)}
          />
        ))}

        {thread.typing && (
          <div className="flex items-center gap-2 text-rose-100/60">
            <SmartImage src={them.photos?.[0]} name={them.name} seed={them.id} alt="" className="h-6 w-6 rounded-full" />
            <span className="flex gap-1 rounded-2xl bg-white/[0.07] px-3 py-2.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: `${d * 120}ms` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Quick replies */}
      {thread.messages.length < 3 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          {quick.map((q) => (
            <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11.5px] text-rose-100 hover:bg-rose-500/20">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Live capture feedback: camera preview, recording meter, upload status */}
      {(pendingPhoto || busy) && (
        <div className="flex items-center gap-3 border-t border-white/10 bg-[#1b0f28] px-3 py-2">
          {pendingPhoto && <img src={pendingPhoto} alt="Preview of the photo you are about to send" className="h-14 w-14 rounded-xl object-cover" />}
          <div className="min-w-0 flex-1 text-[11.5px] text-rose-100/80">
            {busy === 'photo' && 'Uploading your photo…'}
            {busy === 'camera' && 'Camera open — hold still'}
            {busy === 'voice' && (
              <span className="flex items-center gap-2">
                Recording {formatClock(recSeconds)}
                <span className="flex items-end gap-0.5" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span key={i} className="w-1 rounded-full bg-rose-300" style={{ height: `${4 + Math.round(Math.max(0, level) * 22 * (i % 3 ? 1 : 0.7))}px` }} />
                  ))}
                </span>
                <span className="text-rose-100/45">tap the stop square to send, or cancel</span>
              </span>
            )}
            {pendingPhoto && busy !== 'photo' && !notice && (
              <span className="flex flex-wrap items-center gap-2">
                That photo is ready to send.
                <button onClick={sendPendingPhoto} className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white">Send</button>
                <button onClick={() => { setPendingPhoto(''); closeCamera(); }} className="rounded-full border border-white/15 px-3 py-1 text-[11px]">Retake</button>
              </span>
            )}
            {notice && <span className="block text-amber-200">{notice}</span>}
          </div>
          {busy === 'voice' && (
            <button onClick={cancelRecording} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-rose-100">Cancel</button>
          )}
          {pendingPhoto && (
            <button onClick={() => { setPendingPhoto(''); closeCamera(); }} aria-label="Discard this photo" className="rounded-full p-1.5 text-rose-100/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
          )}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Photo full size" onClick={() => setZoom('')}>
          <button onClick={() => setZoom('')} aria-label="Close photo" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"><X className="h-5 w-5" /></button>
          <img src={zoom} alt="Shared photo, full size" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 border-t border-white/10 bg-[#150b1f] px-3 py-2.5 pb-safe"
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        <button
          type="button"
          aria-label="Attach a photo from your device"
          title="Attach a photo from your device"
          onClick={() => fileRef.current?.click()}
          disabled={Boolean(busy)}
          className="rounded-full p-2 text-rose-100/70 hover:bg-white/10 disabled:opacity-40"
        ><ImagePlus className="h-5 w-5" /></button>
        <button
          type="button"
          aria-label={busy === 'camera' ? 'Close the camera' : 'Take a photo with the camera'}
          title="Take a photo right now"
          onClick={() => (busy === 'camera' ? closeCamera() : shoot())}
          className={`rounded-full p-2 hover:bg-white/10 ${busy === 'camera' ? 'bg-rose-500/25 text-rose-200' : 'text-rose-100/70'}`}
        >{busy === 'camera' ? <X className="h-5 w-5" /> : <Camera className="h-5 w-5" />}</button>
        <button
          type="button"
          aria-label={busy === 'voice' ? 'Stop recording and send' : 'Record a voice note'}
          title={busy === 'voice' ? 'Stop and send' : 'Record a voice note (up to 2 minutes)'}
          onClick={() => (busy === 'voice' ? stopRecording() : startRecording())}
          className={`rounded-full p-2 hover:bg-white/10 ${busy === 'voice' ? 'bg-rose-600/40 text-white' : 'text-rose-100/70'}`}
        >{busy === 'voice' ? <Square className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}</button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 1200))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          placeholder={`Message ${them.name.split(' ')[0]}…`}
          aria-label="Message"
          className="max-h-28 flex-1 resize-none rounded-2xl border border-white/10 bg-[#120a1c] px-3.5 py-2.5 text-sm text-white placeholder:text-rose-100/35 focus:border-rose-400/50 focus:outline-none"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-lg transition disabled:opacity-35">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function Message({ msg, them, onAction, readReceipts, now }) {
  const mine = msg.from === 'me';
  if (msg.kind === 'system' || mine === null) {
    return (
      <p className="mx-auto max-w-[85%] rounded-full bg-white/[0.05] px-3 py-1.5 text-center text-[11px] text-rose-100/60">
        {msg.text}
      </p>
    );
  }
  const isGuard = msg.kind === 'guardrail';
  return (
    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
      {!mine && <SmartImage src={them.photos?.[0]} name={them.name} seed={them.id} alt="" className="h-6 w-6 shrink-0 rounded-full" />}
      <div className={`max-w-[78%] ${isGuard ? 'w-[78%]' : ''}`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isGuard ? 'border border-amber-400/40 bg-amber-500/10 text-amber-100'
            : mine ? 'rounded-br-md bg-gradient-to-br from-rose-600 to-pink-600 text-white'
              : 'rounded-bl-md bg-white/[0.08] text-rose-50'
        }`}>
          {msg.kind === 'photo' && (msg.media
            ? (
              <button onClick={() => onZoom?.(msg.media)} className="mb-1.5 block w-full overflow-hidden rounded-xl" aria-label="Open photo full size">
                <img src={msg.media} alt={msg.text || 'Photo you sent'} className="w-full object-cover" loading="lazy" />
              </button>
            )
            : <p className="mb-1 text-[11.5px] italic opacity-70">Photo message with no file attached.</p>)}
          {msg.kind === 'voice' && (msg.media
            ? (
              <span className="mb-1.5 flex w-full min-w-[210px] flex-col gap-1">
                <audio controls preload="metadata" src={msg.media} className="h-9 w-full" aria-label="Voice note" />
                <span className="text-[10.5px] opacity-70">{formatClock(Math.round((msg.durationMs || 0) / 1000))} voice note</span>
              </span>
            )
            : <p className="mb-1 text-[11.5px] italic opacity-70">This voice note was never recorded — demo placeholder.</p>)}
          {msg.note && <p className="mt-1 text-[10.5px] italic opacity-70">{msg.note}</p>}
          <span className="whitespace-pre-wrap">{msg.text}</span>
        </div>
        {isGuard && msg.action && (
          <button onClick={onAction} className="mt-1.5 w-full rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-[12px] font-semibold text-rose-100 hover:bg-rose-500/25">
            {msg.action.label} — safety team reviews this
          </button>
        )}
        <p className={`mt-1 px-1 text-[10px] text-rose-100/35 ${mine ? 'text-right' : ''}`}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{msg.kind === 'system' ? '' : ` · ${timeAgo(msg.ts, now)}`}{mine && readReceipts ? ' · Read' : ''}
        </p>
      </div>
    </div>
  );
}
