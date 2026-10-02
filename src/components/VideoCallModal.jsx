import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PhoneOff, Mic, MicOff, VideoOff, Heart, X, Loader2, PhoneIncoming,
  ShieldAlert, Signal, Video as VideoIcon, Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createPeerCall, peerAccountId } from '../utils/webrtcCall';
import { realtimeHub } from '../utils/realtimeHub';
import { datingStore } from '../utils/datingStore';

/**
 * A real 1:1 video date.
 *
 * Media never touches our server: the two browsers exchange SDP + ICE candidates
 * through `/api/realtime/signal` (SSE in, POST out) and then stream peer to peer.
 * That is why a demo persona cannot be called — there is no other browser on the
 * line — and why the call cannot start over plain http (the browser will not hand
 * out a camera).
 */
export default function VideoCallModal({ isOpen, onClose, partnerUser, userProfile, onOpenPremium }) {
  const [callState, setCallState] = useState('idle');
  const [failure, setFailure] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [stats, setStats] = useState(null);
  // Video minutes are a product decision, not a courtesy: free accounts get a
  // fixed allowance per 24h and the server hands out the number, so this modal
  // only ever displays what the API already allowed.
  const [gate, setGate] = useState('idle'); // idle | checking | ok | denied
  const [budget, setBudget] = useState(null); // { secondsLeft, plan, localOnly, resetsAt }
  const [denied, setDenied] = useState(null);
  const [overQuota, setOverQuota] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callRef = useRef(null);
  const startedRef = useRef(false);
  const secondsRef = useRef(0);

  const selfId = datingStore.getState().server?.user?.id || userProfile?.id || null;
  const peerId = useMemo(() => peerAccountId(partnerUser?.id), [partnerUser?.id]);
  const isRealPartner = Boolean(peerId) && String(partnerUser?.id || '').startsWith('usr:');
  const partnerName = partnerUser?.name || 'Your match';

  const close = useCallback(() => {
    callRef.current?.hangUp();
    callRef.current = null;
    startedRef.current = false;
    setSeconds(0);
    setCallState('idle');
    setFailure(null);
    setOverQuota(false);
    if (datingStore.getState().call?.sessionId) {
      if (datingStore.getState().call?.plan === 'local') datingStore.addLocalCallSeconds(secondsRef.current);
      datingStore.releaseCall();
    }
    onClose?.();
  }, [onClose]);

  // Ask the server for permission (and a session id to bill against) before the
  // camera even opens — no point warming a call that is not paid for.
  useEffect(() => {
    if (!isOpen) {
      setGate('idle');
      setDenied(null);
      return undefined;
    }
    if (!isRealPartner) {
      setGate('ok'); // persona / demo path: nothing to meter against
      return undefined;
    }
    let cancelled = false;
    setGate('checking');
    setDenied(null);
    datingStore.reserveCall(partnerUser?.id).then((out) => {
      if (cancelled) {
        if (out?.ok) datingStore.releaseCall();
        return;
      }
      if (!out?.ok) {
        setDenied(out);
        setGate('denied');
        return;
      }
      setBudget({ secondsLeft: out.secondsLeft ?? null, plan: out.plan, localOnly: Boolean(out.localOnly), resetsAt: out.resetsAt });
      setGate('ok');
    });
    return () => { cancelled = true; };
  }, [isOpen, isRealPartner, partnerUser?.id]);

  // Build the call once per open, so a re-render cannot renegotiate underneath us.
  useEffect(() => {
    if (!isOpen || !isRealPartner || !selfId || !peerId) return undefined;
    if (gate !== 'ok') return undefined;
    if (startedRef.current) return undefined;
    startedRef.current = true;

    const call = createPeerCall({
      selfId,
      peerId,
      sendSignal: ({ to, signal, callId }) => realtimeHub.sendSignal({ to, signal, callId }),
      onStateChange: (next, info) => {
        setCallState(next);
        if (info) setFailure(typeof info === 'string' ? info : null);
      },
      onLocalStream: (stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      },
      onRemoteStream: (stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play?.().catch(() => { /* autoplay policy */ });
        }
      },
      onReaction: (data) => {
        if (data?.kind === 'heart') {
          setHearts((prev) => [...prev.slice(-14), { id: `${data.ts}-${Math.random()}`, at: Date.now() }]);
        }
      },
    });
    callRef.current = call;

    const off = realtimeHub.onSignal((payload) => {
      if (payload.from !== peerId) return;
      call.handleSignal(payload.signal);
    });

    // Whoever opened the modal is the caller; the other side is rung by the invite.
    call.invite({ video: !cameraOff }).catch(() => setCallState('failed'));

    return () => {
      off();
      call.close();
      callRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on the call target only
  }, [isOpen, peerId, selfId, isRealPartner, gate]);

  // Hearts are transient; drop them so the overlay does not accumulate.
  useEffect(() => {
    if (!hearts.length) return undefined;
    const t = setTimeout(() => setHearts((prev) => prev.filter((h) => Date.now() - h.at < 1800)), 1900);
    return () => clearTimeout(t);
  }, [hearts]);

  // Call timer + a light stats poll (proof the media is actually flowing).
  useEffect(() => {
    if (callState !== 'connected') return undefined;
    const tick = setInterval(() => setSeconds((s) => { secondsRef.current = s + 1; return s + 1; }), 1000);
    const poll = setInterval(async () => {
      const out = await callRef.current?.getStats?.();
      if (out) setStats(out);
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [callState]);

  // Bill the call: heartbeat every 20s so the server knows we are still in it, and
  // hang up when the allowance runs out instead of letting it cut mid-sentence.
  useEffect(() => {
    if (callState !== 'connected' || gate !== 'ok' || budget?.localOnly) return undefined;
    let dead = false;
    const beat = setInterval(async () => {
      const res = await datingApiCallHeartbeat();
      if (dead) return;
      if (res?.ok) {
        setBudget((prev) => ({ ...(prev || {}), secondsLeft: res.secondsLeft, usedSeconds: res.usedSeconds, limitSeconds: res.limitSeconds }));
        if ((res.secondsLeft ?? 0) <= 0) setOverQuota(true);
      }
    }, 20000);
    return () => { dead = true; clearInterval(beat); };
  }, [callState, gate, budget?.localOnly]);

  useEffect(() => {
    if (!overQuota || callState !== 'connected') return undefined;
    const t = setTimeout(() => {
      callRef.current?.hangUp?.();
      close();
    }, 20000);
    return () => clearTimeout(t);
  }, [overQuota, callState, close]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  async function datingApiCallHeartbeat() {
    try {
      const { serverSync } = await import('../utils/serverSync.js');
      return await serverSync.heartbeatCall(datingStore.getState().call?.sessionId);
    } catch {
      return { ok: false };
    }
  }

  if (!isOpen || !partnerUser) return null;

  const fmt = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  const statusLine = gate === 'checking' ? 'Checking your call minutes…' : {
    calling: `Ringing ${partnerName}…`,
    incoming: `${partnerName} is calling`,
    connecting: 'Opening the encrypted peer-to-peer path…',
    connected: `Connected · p2p · ${fmt(seconds)}`,
    failed: failureText(failure),
    ended: 'Call ended',
    idle: 'Getting your camera…',
  }[callState] || 'Connecting…';

  const toggleMic = () => {
    const next = !muted;
    setMuted(next);
    callRef.current?.setAudio(!next);
  };

  const toggleCam = () => {
    const next = !cameraOff;
    setCameraOff(next);
    callRef.current?.setVideo(!next);
  };

  const sendHeart = () => {
    const sent = callRef.current?.sendReaction('heart');
    try {
      confetti({ particleCount: sent ? 26 : 8, spread: 55, origin: { y: 0.75 }, colors: ['#fb7185', '#f472b6', '#fca5a5'] });
    } catch { /* canvas unsupported */ }
    if (sent) setHearts((prev) => [...prev.slice(-14), { id: `own-${Date.now()}`, at: Date.now(), own: true }]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-0 backdrop-blur-xl sm:p-4">
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden border-0 bg-[#0b0512] sm:h-[88vh] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-rose-500/40">
        {gate === 'denied' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#0b0512] px-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-500/15 text-amber-300"><Clock className="h-6 w-6" /></span>
            <div>
              <p className="text-lg font-bold text-white">Your free video minutes are used up</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-rose-100/70">
                Every account gets {fmt(Math.round((denied?.limitSeconds || 1200)))} of video calling per 24 hours, and the clock is kept by
                the server — a second tab does not get you more.
                {denied?.resetsAt ? ` Yours resets at ${new Date(denied.resetsAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.` : ' Text chat stays unlimited.'}
              </p>
            </div>
            {onOpenPremium && (
              <button
                onClick={() => { close(); onOpenPremium?.(); }}
                className="rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                $1 gets you 2 hours a day
              </button>
            )}
            <button onClick={close} className="text-[12.5px] text-rose-100/60 underline">Back to the chat</button>
          </div>
        )}
        {/* Remote feed: the whole point of the screen */}
        <div className="absolute inset-0 bg-[#150a1e]">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover transition-opacity duration-500 ${callState === 'connected' ? 'opacity-100' : 'opacity-0'}`}
          />
          {callState !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <img
                src={partnerUser.avatar || partnerUser.photos?.[0]?.url || ''}
                alt=""
                className={`h-24 w-24 rounded-3xl object-cover shadow-2xl ${callState === 'calling' ? 'animate-pulse' : ''}`}
              />
              <p className="text-lg font-bold text-white">{partnerName}</p>
              <p className="flex items-center gap-2 text-[12.5px] text-rose-100/70">
                {(callState === 'calling' || callState === 'connecting' || callState === 'idle') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {statusLine}
              </p>
              {callState === 'failed' ? (
                <div className="mt-1 max-w-sm rounded-xl border border-amber-400/30 bg-amber-950/30 p-3 text-left text-[12px] leading-relaxed text-amber-100">
                  {failure === 'permission-denied' && 'You blocked camera/microphone access. Allow it in the address bar (the padlock), then call again.'}
                  {failure === 'no-camera' && 'No camera found. You can still do a voice date — turn the camera off before calling.'}
                  {failure === 'camera-in-use' && 'Another app (Meet, Zoom, Teams) holds the camera. Close it and retry.'}
                  {(failure === 'peer-connection-failed' || failure === 'no-ice') && 'The two browsers could not find a path to each other. Move off a VPN or retry on mobile data — this build uses public STUN only, no TURN relay yet.'}
                  {!failure && 'Something went wrong. End and try again.'}
                </div>
              ) : null}
              {callState === 'incoming' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => callRef.current?.decline()} className="rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-white/20">Decline</button>
                  <button onClick={() => callRef.current?.accept({ video: true })} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white hover:brightness-110">
                    <PhoneIncoming className="h-4 w-4" /> Accept
                  </button>
                </div>
              )}
              {!isRealPartner && (
                <div className="mt-2 max-w-sm rounded-xl border border-rose-400/30 bg-rose-950/40 p-3 text-left text-[12px] leading-relaxed text-rose-100">
                  <ShieldAlert className="mb-1 h-4 w-4 text-rose-300" />
                  {partnerName} is a seeded demo persona, so there is no second browser to connect to. Video dates run
                  between two real accounts on the Romancha server — open a chat with a member you matched with instead.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating hearts from the data channel */}
        {hearts.map((h, i) => (
          <span
            key={h.id}
            className="pointer-events-none absolute bottom-24 text-2xl transition-transform duration-1000"
            style={{ left: `${12 + ((i * 37) % 70)}%`, animation: 'romancha-float 1.6s ease-out forwards' }}
          >
            💗
          </span>
        ))}

        {/* Top bar */}
        <div className="relative z-20 flex items-start justify-between p-4 sm:p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-black/45 px-3 py-2 backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${callState === 'connected' ? 'bg-emerald-400' : callState === 'failed' ? 'bg-rose-500' : 'bg-amber-300'}`} />
            <div>
              <p className="text-[13px] font-bold leading-tight text-white">{partnerName}, {partnerUser.age ? `${partnerUser.age} · ` : ''}{partnerUser.city || ''}</p>
              <p className="text-[11px] leading-tight text-emerald-300">{statusLine}</p>
              {overQuota && (
                <p className="mt-1 max-w-[240px] text-left text-[10.5px] leading-snug text-amber-200">
                  Out of minutes — this call closes in a few seconds. Say your goodbyes, or unlock 2 hours a day for $1.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gate === 'ok' && budget?.secondsLeft != null && (
              <span className={`rounded-xl px-2.5 py-1.5 text-[10.5px] font-semibold backdrop-blur ${budget.secondsLeft < 120 ? 'bg-amber-500/25 text-amber-100' : 'bg-black/45 text-rose-100/75'}`}>
                {fmt(budget.secondsLeft)} left today
                {budget.plan === 'free' ? ' · free' : ` · ${budget.plan}`}
              </span>
            )}
            {callState === 'connected' && stats ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-black/45 px-2.5 py-1.5 text-[10.5px] text-rose-100/70 backdrop-blur">
                <Signal className="h-3 w-3 text-emerald-400" />
                {stats.inbound?.resolution || '—'} · {stats.rttMs != null ? `${stats.rttMs}ms` : 'p2p'} · {stats.candidateType || 'host'}
              </span>
            ) : null}
            <button onClick={close} aria-label="Close video call" className="rounded-full bg-black/45 p-2 text-white backdrop-blur transition-colors hover:bg-rose-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Self preview */}
        <div className="relative z-20 mb-2 mr-4 self-end overflow-hidden rounded-2xl border-2 border-rose-500/50 bg-[#1b0d26] shadow-2xl sm:mr-6">
          <video ref={localVideoRef} autoPlay playsInline muted className={`h-40 w-28 object-cover sm:h-52 sm:w-36 ${cameraOff ? 'opacity-0' : ''}`} style={{ transform: 'scaleX(-1)' }} />
          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-rose-300">
              <VideoOff className="h-5 w-5 opacity-70" />
              <span className="text-[10px]">Camera off</span>
            </div>
          )}
          <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white drop-shadow">You</span>
        </div>

        {/* Controls */}
        <div className="relative z-20 flex items-center justify-center gap-3 bg-gradient-to-t from-black via-black/80 to-transparent p-5 sm:gap-5 sm:p-6">
          <RoundButton label={muted ? 'Unmute microphone' : 'Mute microphone'} onClick={toggleMic} active={muted}>
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </RoundButton>
          <RoundButton label={cameraOff ? 'Turn camera on' : 'Turn camera off'} onClick={toggleCam} active={cameraOff}>
            {cameraOff ? <VideoOff className="h-6 w-6" /> : <VideoIcon className="h-6 w-6" />}
          </RoundButton>
          <RoundButton label="Send a heart" onClick={sendHeart} tone="pink">
            <Heart className="h-6 w-6 animate-bounce fill-current" />
          </RoundButton>
          <button
            onClick={close}
            className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-4 font-bold text-white shadow-xl shadow-red-900/60 transition-all hover:bg-red-700 active:scale-95"
            title="End call"
          >
            <PhoneOff className="h-6 w-6" />
            <span className="hidden text-xs sm:inline">End call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RoundButton({ children, onClick, label, active, tone }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-full p-4 shadow-xl transition-all active:scale-95 ${
        active ? 'bg-red-600 text-white' : tone === 'pink' ? 'bg-pink-600 text-white hover:bg-pink-500' : 'bg-white/20 text-white hover:bg-white/30'
      }`}
    >
      {children}
    </button>
  );
}

function failureText(failure) {
  if (failure === 'permission-denied') return 'Camera and microphone permission was blocked';
  if (failure === 'declined') return 'They did not pick up';
  if (failure === 'busy') return 'They are on another call';
  if (failure === 'remote-hangup') return 'The call ended';
  if (failure === 'reconnecting') return 'Reconnecting…';
  return 'Call failed';
}
