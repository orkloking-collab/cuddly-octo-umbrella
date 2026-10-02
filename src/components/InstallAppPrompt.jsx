import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { subscribePwa, promptInstall, markDismissed } from '../utils/pwa';

/**
 * The "install the app" affordance.
 *
 * Romancha ships as a PWA: a manifest, icons and a service worker, so Android and
 * desktop Chrome offer a real home-screen install with its own window and offline
 * shell. iOS Safari never fires the install event, so iPhone users get the manual
 * two-tap instruction instead of a button that would do nothing.
 *
 * There is no store listing, so nobody can search for "Romancha" in Play or the
 * App Store — installing this is a browser action, and the copy says so rather
 * than implying a download we do not publish.
 */
export default function InstallAppPrompt({ variant = 'card', onDone }) {
  const [state, setState] = useState(null);

  useEffect(() => subscribePwa(setState), []);

  if (!state || state.standalone) return null;

  if (variant === 'row') {
    return (
      <button
        onClick={() => { promptInstall().finally(() => onDone?.()); }}
        className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-[13px] text-rose-50 hover:bg-white/[0.06]"
      >
        <Download className="h-4 w-4 shrink-0 text-rose-300" />
        <span className="flex-1">{state.canInstall ? 'Install Romancha on this phone' : 'Install instructions'}</span>
        <span className="text-[11px] text-rose-100/50">{state.canInstall ? 'Add to home screen' : state.platform === 'ios' ? 'Share → Add to Home Screen' : 'Browser menu → Install'}</span>
      </button>
    );
  }

  if (!state.canInstall && state.platform !== 'ios') return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-40 px-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[380px] sm:-translate-x-1/2">
      <div className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-[#1b0f28]/95 p-3 shadow-2xl backdrop-blur">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 text-white">
          {state.platform === 'ios' ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white">Put Romancha on your home screen</p>
          {state.canInstall ? (
            <p className="mt-0.5 text-[11.5px] leading-snug text-rose-100/65">
              Installs as an app window with your own icon. No store listing, no app permissions beyond the browser —
              and it will not see your chats any differently.
            </p>
          ) : (
            <p className="mt-0.5 text-[11.5px] leading-snug text-rose-100/65">
              On iPhone: tap the <Share className="inline h-3 w-3" /> Share button in Safari, then “Add to Home Screen”.
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {state.canInstall && (
              <button
                onClick={() => { promptInstall().finally(() => onDone?.()); }}
                className="rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-3.5 py-1.5 text-[12px] font-bold text-white"
              >
                Install
              </button>
            )}
            <button onClick={markDismissed} className="rounded-full border border-white/12 px-3 py-1.5 text-[12px] text-rose-100/70 hover:bg-white/10">
              Not now
            </button>
          </div>
        </div>
        <button onClick={markDismissed} aria-label="Dismiss install suggestion" className="rounded-full p-1 text-rose-100/60 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
