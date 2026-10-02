/**
 * Google Identity Services loader.
 *
 * This is the only third-party script the app is willing to pull in, and only when
 * the operator configured a client id. It exists so that "log in with my Gmail
 * password" is not what this app does: an app that took Gmail passwords would be a
 * credential-harvesting site, and Google stopped allowing that years ago. Instead
 * Google's own button hands us a signed ID token, which the server verifies.
 */

const SCRIPT_ID = 'romancha-gis-script';

export function loadGoogleScript() {
  if (typeof document === 'undefined') return Promise.reject(new Error('Google sign-in needs a browser.'));
  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    let tag = document.getElementById(SCRIPT_ID);
    if (!tag) {
      tag = document.createElement('script');
      tag.id = SCRIPT_ID;
      tag.src = 'https://accounts.google.com/gsi/client';
      tag.async = true;
      tag.defer = true;
      document.head.appendChild(tag);
    }
    const done = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error('Google returned no sign-in library.'));
    };
    tag.addEventListener('load', done, { once: true });
    tag.addEventListener('error', () => reject(new Error('Google scripts were blocked (privacy extension, or offline).')), { once: true });
  });
}

export async function initGoogleButton(host, { clientId, onSuccess, onError, theme = 'filled_black' } = {}) {
  if (!host) throw new Error('No place to draw the Google button.');
  const id = await loadGoogleScript();
  id.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response) => {
      if (response?.credential) onSuccess?.(response.credential);
      else onError?.(new Error('Google did not return a credential.'));
    },
  });
  host.replaceChildren();
  id.renderButton(host, { theme, size: 'large', type: 'standard', width: Math.min(340, host.clientWidth || 320), locale: 'en' });
  return () => {
    try { id.disableAutoSelect?.(); } catch { /* noop */ }
    host.replaceChildren();
  };
}
