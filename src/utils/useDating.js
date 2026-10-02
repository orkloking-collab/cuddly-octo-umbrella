import { useCallback, useEffect, useState } from 'react';
import { datingStore } from './datingStore';

/** Subscribe a component to the dating store, with a bound action set. */
export function useDating() {
  const [state, setState] = useState(() => datingStore.getState());
  useEffect(() => datingStore.subscribe(setState), []);
  const act = useCallback((fn) => fn(datingStore), []);
  return { state, store: datingStore, act, profile: state.profile, prefs: state.prefs };
}

/** Ticking clock for relative timestamps / countdowns (1s while visible). */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export function timeAgo(ts, now = Date.now()) {
  if (!ts) return '';
  const mins = Math.max(0, Math.round((now - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export function formatCountdown(ms) {
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** Escape-to-close + scroll lock for modals, so dialogs behave like the real thing. */
export function useDialog(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const prev = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}
