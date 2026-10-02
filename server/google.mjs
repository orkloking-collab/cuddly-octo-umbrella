/**
 * "Sign in with Google", done the only way that is allowed.
 *
 * There is no such thing as logging in *with a Gmail password*: Google disabled
 * that for third-party apps years ago (and an app that collected them would be a
 * credential-harvesting site). So the browser gets an ID token from Google's own
 * button and we verify it server-side before trusting a single field of it.
 *
 * Verification here calls Google's tokeninfo endpoint, which is one extra hop and
 * rate-limited-ish. For a real launch, swap `verifyIdToken` for local JWKS
 * verification (cache Google's public keys and check the RS256 signature) — the
 * shape of the result is the same on purpose.
 */
const TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo?id_token=';
const CERT_CACHE_MS = 10 * 60 * 1000;
let certPromise = null;
let certAt = 0;

function allowedOrigins() {
  return String(process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function googleEnabled() {
  return allowedOrigins().length > 0;
}

async function googleCerts() {
  const now = Date.now();
  if (certPromise && now - certAt < CERT_CACHE_MS) return certPromise;
  certAt = now;
  certPromise = fetch('https://www.googleapis.com/oauth2/v3/certs')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('certs unavailable'))))
    .catch((err) => {
      certPromise = null;
      throw err;
    });
  return certPromise;
}

/**
 * Verify the ID token's signature and claims locally (no per-login network call to
 * Google beyond the cached keys). Falls back to the tokeninfo endpoint when the
 * certificate endpoint is unreachable, and refuses everything if neither works —
 * an unverifiable token is never a login.
 */
export async function verifyIdToken(token, { fetchImpl = fetch } = {}) {
  const audiences = allowedOrigins();
  if (!audiences.length) return { error: 'Google sign-in is not configured on this server.', status: 501 };
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return { error: 'Malformed ID token.', status: 400 };

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { error: 'Malformed ID token.', status: 400 };
  }

  const audOk = audiences.includes(payload.aud) || (Array.isArray(payload.aud) && payload.aud.some((a) => audiences.includes(a)));
  if (!audOk) return { error: 'This token was not issued for this app.', status: 401 };
  if (!payload.exp || payload.exp * 1000 < Date.now()) return { error: 'That Google token expired. Try again.', status: 401 };
  if (payload.email_verified === false) return { error: 'Google says that address is not verified.', status: 403 };
  if (!payload.email) return { error: 'Google did not return an email address.', status: 403 };

  const verified = await verifySignature(parts, header).catch(() => false);
  if (!verified) {
    // Signature check could not complete locally: ask Google directly.
    const online = await fetchImpl(TOKENINFO + encodeURIComponent(token)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!online || online.aud !== payload.aud || !online.email) return { error: 'Could not verify the Google token.', status: 502 };
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: payload.name || payload.given_name || '',
    picture: payload.picture || '',
    subject: payload.sub,
    emailVerified: payload.email_verified !== false,
  };
}

async function verifySignature(parts, header) {
  const crypto = await import('node:crypto');
  const certs = await googleCerts().catch(() => null);
  const key = certs?.keys?.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!key) return false;
  const publicKey = crypto.createPublicKey({
    key: { kty: 'RSA', n: key.n, e: key.e }, format: 'jwk',
  });
  const signer = crypto.createVerify('RSA-SHA256');
  signer.update(`${parts[0]}.${parts[1]}`);
  signer.end();
  return signer.verify(publicKey, Buffer.from(parts[2], 'base64url'));
}
