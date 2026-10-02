/**
 * Thin fetch wrapper for the Romancha backend.
 *
 * Responsibilities kept here on purpose: cookie credentials, the double-submit
 * CSRF header, JSON parsing that never throws on an empty body, and one place to
 * decide "the API is not there" so the app can fall back to local mode.
 */
// The CSRF token comes from the API on every auth response. Keeping it in
// localStorage (not a cookie) is the point: a cross-site attacker can send the
// cookie but cannot read what we put in the header.
const CSRF_KEY = 'romancha_csrf_v1';
let csrfToken = readCsrf();

function readCsrf() {
  try {
    return typeof window === 'undefined' ? '' : window.localStorage?.getItem?.(CSRF_KEY) || '';
  } catch {
    return '';
  }
}

function writeCsrf(value) {
  try {
    if (value) window.localStorage?.setItem?.(CSRF_KEY, value);
    else window.localStorage?.removeItem?.(CSRF_KEY);
  } catch { /* storage disabled */ }
}
let mode = null; // null = unknown, 'server' = API available, 'local' = static hosting

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body || null;
  }
}

export function getCsrf() {
  return csrfToken;
}

export function getMode() {
  return mode;
}

export function setMode(next) {
  mode = next;
}

async function parse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A SPA fallback (index.html) answering an /api call is the classic
    // "no backend in production" bug — surface it instead of JSON-parsing HTML.
    throw new ApiError('The server did not answer with JSON (is the API running?)', res.status, { raw: text.slice(0, 120) });
  }
}

export async function request(method, path, body, { signal, allowFail = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken && method !== 'GET' && method !== 'HEAD') headers['x-csrf-token'] = csrfToken;

  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await parse(res);
  if (data?.csrf) {
    csrfToken = data.csrf;
    writeCsrf(csrfToken);
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    if (allowFail) return { error: message, status: res.status, data };
    throw new ApiError(message, res.status, data);
  }
  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, undefined, opts),
  post: (path, body, opts) => request('POST', path, body ?? {}, opts),
  put: (path, body, opts) => request('PUT', path, body ?? {}, opts),
  del: (path, opts) => request('DELETE', path, undefined, opts),
  /** Same call, but returns `{ error }` instead of throwing — for fire-and-forget sync. */
  quiet: (method, path, body) => request(method, path, body, { allowFail: true }),
  setCsrf: (token) => {
    csrfToken = token || '';
    writeCsrf(csrfToken);
  },
};

export default api;
