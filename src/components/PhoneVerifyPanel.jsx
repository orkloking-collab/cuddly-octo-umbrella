import React, { useEffect, useRef, useState } from 'react';
import { PhoneCall, ShieldCheck, Clock, AlertCircle, Check } from 'lucide-react';
import { useDating } from '../utils/useDating';

/**
 * Phone-number verification with an OTP.
 *
 * The code is sent by the *server* (see server/otp.mjs: console/Twilio/HTTP hook),
 * never from the browser, and it is stored only as a scrypt hash with a 5-minute
 * expiry. This component only drives the two-step UI and the resend cooldown.
 */
const RESEND_SECONDS = 45;

export default function PhoneVerifyPanel() {
  const { store, state } = useDating();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('idle'); // idle | sent | verified | error
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [debugCode, setDebugCode] = useState('');
  const inputRef = useRef(null);

  const live = state.server?.mode === 'server';
  const alreadyVerified = Boolean(state.verification?.phoneVerified);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (alreadyVerified) setStage('verified');
  }, [alreadyVerified]);

  const send = async () => {
    setBusy(true);
    setError('');
    const out = await store.requestPhoneOtp(phone);
    setBusy(false);
    if (!out.ok) {
      setStage('error');
      setError(out.error || 'Could not send the code.');
      return;
    }
    setPhone(out.phone || phone);
    setStage('sent');
    setCooldown(RESEND_SECONDS);
    setDebugCode(out.debugCode || '');
  };

  const confirm = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    setError('');
    const out = await store.confirmPhoneOtp(phone, code.replace(/\D/g, ''));
    setBusy(false);
    if (!out.ok) {
      setStage('error');
      setError(out.error || 'That code did not match.');
      return;
    }
    setStage('verified');
    setCode('');
  };

  if (!live) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-950/20 p-3.5">
        <p className="flex items-center gap-2 text-[13px] font-bold text-white">
          <AlertCircle className="h-4 w-4 text-amber-300" /> Phone verification needs the backend
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-rose-100/70">
          This build is running without the Romancha API, so codes cannot be sent. Start the server
          (<code className="rounded bg-black/40 px-1">npm run dev</code>) and the number lives on the
          account, not in this browser.
        </p>
      </div>
    );
  }

  if (alreadyVerified || stage === 'verified') {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/25 p-3.5">
        <p className="flex items-center gap-2 text-[13px] font-bold text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-300" /> Phone number verified
        </p>
        <p className="mt-1 text-[12px] text-rose-100/70">
          {state.server?.user?.phone || 'Your number'} is confirmed
          {state.verification?.phoneVerifiedAt ? ` · ${new Date(state.verification.phoneVerifiedAt).toLocaleDateString()}` : ''}.
          Scam filters weight verified accounts higher, and unverified numbers cannot start a video call.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-white">
        <PhoneCall className="h-4 w-4 text-rose-300" /> Verify your phone number
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-rose-100/70">
        One code, six digits, five minutes. The number is never shown on your profile — it exists so we can
        ban a scammer once instead of ten times.
      </p>

      {stage === 'idle' || stage === 'error' ? (
        <form className="mt-3 flex gap-2" onSubmit={send}>
          <input
            ref={inputRef}
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (stage === 'error') { setStage('idle'); setError(''); } }}
            inputMode="tel"
            placeholder="+8801712345678"
            aria-label="Phone number with country code"
            className="min-w-0 flex-1 rounded-xl border border-white/12 bg-[#120a1c] px-3 py-2.5 text-sm text-white placeholder:text-rose-100/30 focus:border-rose-400/50 focus:outline-none"
          />
          <button type="submit" disabled={busy || phone.replace(/\D/g, '').length < 10} className="rounded-xl bg-rose-600 px-3.5 py-2.5 text-[12.5px] font-bold text-white hover:bg-rose-500 disabled:opacity-45">
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form className="mt-3" onSubmit={confirm}>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-rose-100/60">6-digit code to {phone}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="······"
              className="mt-1.5 w-full rounded-xl border border-white/12 bg-[#120a1c] px-3 py-2.5 text-center text-lg tracking-[0.4em] text-white focus:border-rose-400/50 focus:outline-none"
            />
          </label>
          {debugCode ? (
            <p className="mt-2 rounded-lg bg-black/40 px-2.5 py-1.5 text-[11.5px] text-emerald-200">
              No SMS provider is configured on this machine, so the code is <b>{debugCode}</b>. It also
              printed in the server log.
            </p>
          ) : null}
          <div className="mt-2.5 flex items-center gap-2">
            <button type="submit" disabled={busy || code.length < 6} className="rounded-xl bg-emerald-600 px-3.5 py-2 text-[12.5px] font-bold text-white hover:brightness-110 disabled:opacity-45">
              {busy ? 'Checking…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || cooldown > 0}
              className="flex items-center gap-1.5 rounded-xl border border-white/12 px-3 py-2 text-[12px] font-semibold text-rose-100/80 hover:bg-white/5 disabled:opacity-45"
            >
              {cooldown > 0 ? <><Clock className="h-3.5 w-3.5" /> {cooldown}s</> : 'Send a new code'}
            </button>
          </div>
        </form>
      )}

      {error ? <p className="mt-2 flex items-start gap-1.5 text-[12px] text-rose-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}</p> : null}
      {stage === 'sent' && !error ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-emerald-200"><Check className="h-3.5 w-3.5" /> Code sent. It expires in 5 minutes; 5 wrong tries lock it.</p>
      ) : null}
    </div>
  );
}
