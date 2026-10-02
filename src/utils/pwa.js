/**
 * PWA plumbing: service-worker registration and the install prompt.
 *
 * The service worker is only registered in production builds. In `vite dev` it
 * would fight the dev server's HMR (cached modules that are stale by definition),
 * and hot-reloading a caching layer is how you end up debugging a ghost.
 *
 * The install prompt is captured here because `beforeinstallprompt` fires once,
 * early, and only if you call `preventDefault()` — a component that mounts later
 * would miss it entirely. So the event lives in this module and components
 * subscribe to it.
 */

const DISMISS_KEY = 'romancha_install_dismissed_v1';
const listeners = new Set();
let deferred = null;
let dismissed = false;

function readDismissed() {
  try {
    return window.localStorage?.getItem?.(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function emit() {
  const snapshot = snapshotState();
  listeners.forEach((fn) => fn(snapshot));
}

function snapshotState() {
  return {
    canInstall: Boolean(deferred) && !dismissed,
    dismissed,
    standalone: isStandalone(),
    platform: installPlatform(),
  };
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)');
  if (mm?.matches) return true;
  if (window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches) return true;
  // iOS Safari does not implement display-mode; it exposes this instead.
  return Boolean(window.navigator?.standalone);
}

export function installPlatform() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function getPwaState() {
  dismissed = readDismissed();
  return snapshotState();
}

export function subscribePwa(fn) {
  listeners.add(fn);
  fn(getPwaState());
  return () => listeners.delete(fn);
}

/** Ask the browser for its native install UI. Resolves to whether it showed. */
export async function promptInstall() {
  if (!deferred) return false;
  try {
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice?.outcome !== 'accepted') markDismissed();
    else {
      try { window.localStorage?.removeItem?.(DISMISS_KEY); } catch { /* ignore */ }
    }
    deferred = null;
    emit();
    return choice?.outcome === 'accepted';
  } catch {
    markDismissed();
    return false;
  }
}

export function markDismissed() {
  dismissed = true;
  try { window.localStorage?.setItem?.(DISMISS_KEY, '1'); } catch { /* ignore */ }
  emit();
}

export function initPwa() {
  if (typeof window === 'undefined') return;
  dismissed = readDismissed();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try { window.localStorage?.removeItem?.(DISMISS_KEY); } catch { /* ignore */ }
    emit();
  });

  const swUrl = new URL('sw.js', window.location.origin).href;
  const secure = window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  // A service worker needs a secure context: an installed app over plain http
  // would be a broken promise, so we say nothing and let the browser skip it.
  if (import.meta.env?.PROD && 'serviceWorker' in navigator && secure) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: '/' }).catch(() => { /* offline-capable is optional */ });
    });
  }
}
