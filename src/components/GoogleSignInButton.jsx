import React, { useEffect, useRef, useState } from 'react';
import { Loader2, KeyRound, Info } from 'lucide-react';
import { initGoogleButton } from '../utils/googleAuth';
import { serverSync } from '../utils/serverSync';
import { authStore } from '../utils/authStore';

/**
 * The Google sign-in row.
 *
 * It renders nothing pretending to work: if the server has no `GOOGLE_CLIENT_ID`,
 * this says exactly that and tells you the variable to set. Drawing Google's own
 * button is the point — the app never handles a Google password, and a dating app
 * that asked for one would be a phishing page with a nice gradient.
 *
 * `onSignedIn` receives the same shape the email/password flow returns.
 */
export default function GoogleSignInButton({ onSignedIn, onError, label = 'or continue with Google' }) {
  const hostRef = useRef(null);
  const [config, setConfig] = useState(null); // null = unknown, {enabled:false} = off
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    serverSync.googleConfig().then((out) => {
      if (!alive) return;
      // No server to ask (local build) is the same answer as "not configured".
      setConfig(out && typeof out.enabled === 'boolean' ? out : { enabled: false, reason: 'offline' });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !hostRef.current) return undefined;
    let cleanup = () => {};
    let dead = false;
    setBusy(true);
    initGoogleButton(hostRef.current, {
      clientId: config.clientId,
      onSuccess: async (credential) => {
        setBusy(true);
        const res = await authStore.googleSignIn(credential);
        setBusy(false);
        if (res?.success) onSignedIn?.(res);
        else {
          setError(res?.error || 'Google sign-in failed.');
          onError?.(res?.error);
        }
      },
      onError: (err) => { setError(err?.message || 'Google sign-in failed.'); setBusy(false); },
    }).then((off) => {
      if (dead) { off?.(); return; }
      cleanup = off || cleanup;
      setBusy(false);
    }).catch((err) => {
      setError(err?.message || 'Google could not be loaded.');
      setBusy(false);
    });
    return () => { dead = true; cleanup(); };
  }, [config]);

  if (!config) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[12px] text-rose-100/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking whether Google sign-in is enabled…
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11.5px] leading-snug text-rose-100/55">
        <p className="flex items-center gap-1.5 font-semibold text-rose-100/75"><Info className="h-3.5 w-3.5" /> Google sign-in is not switched on</p>
        <p className="mt-1">
          Email and password work right now. To add Google, set <code className="rounded bg-black/40 px-1 text-rose-200">GOOGLE_CLIENT_ID</code> on the
          server (an OAuth client from Google Cloud, with this site in its authorised origins), then restart. This app
          will never ask for a Gmail password — that is not a login method, it is a credential you should not hand to anybody.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-[10.5px] uppercase tracking-[0.18em] text-rose-100/40">{label}</p>
      <div className="flex min-h-[42px] items-center justify-center" ref={hostRef} />
      {busy && (
        <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-rose-100/60"><KeyRound className="h-3.5 w-3.5" /> Waiting for Google…</p>
      )}
      {error && <p className="text-center text-[11.5px] text-amber-200">{error}</p>}
    </div>
  );
}
