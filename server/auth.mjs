/**
 * Accounts, sessions and password handling for the Romancha server.
 *
 * Design choices that matter for a dating site specifically:
 *  - scrypt (memory-hard, in Node core) with a per-user 16-byte salt. If you can
 *    run argon2id in production, swap `hashPassword`/`verifyPassword`.
 *  - Sessions are opaque 256-bit tokens; only their SHA-256 is stored, so a DB
 *    read cannot be replayed as a cookie.
 *  - Cookies are HttpOnly + SameSite=Lax + Secure-in-prod, with a double-submit
 *    CSRF token for unsafe methods.
 *  - Failed logins are counted *in the database* and lock the account; the error
 *    is identical for "no such user" and "wrong password".
 */
import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const SESSION_TTL_MS = 30 * 24 * 3600_000; // 30 days
export const MAX_FAILED = 5;
export const LOCK_MS = 15 * 60 * 1000;
export const COOKIE_NAME = 'romancha_sid';

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export function isEmail(v) {
  return EMAIL_RE.test(String(v || '').trim());
}

/**
 * E.164-ish, with one deliberate local convenience: this app is Bangladesh-first,
 * so a national-format mobile number (`01712-345678`) is understood as +880.
 * Anything else must arrive with a country code — guessing a country for someone
 * typing `020-1234` would silently send their OTP to the wrong network.
 */
export function normalisePhone(raw) {
  let digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    // keep it
  } else if (/^0{2}\d{8,14}$/.test(digits)) {
    digits = `+${digits.slice(2)}`; // 008801712... -> +8801712...
  } else if (/^01[3-9]\d{8}$/.test(digits)) {
    digits = `+880${digits.slice(1)}`; // 01712345678 -> +8801712345678
  } else {
    digits = `+${digits}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

const WEAK_PATTERNS = new Set([
  'password', 'password1', 'passw0rd', 'qwerty', 'qwerty123', '123456', '123456789',
  'iloveyou', 'letmein', 'welcome', 'admin', 'monkey', 'dragon', 'abc123',
  'romancha', 'romancha123', 'bangladesh', 'iuyhnm', '000000',
]);

/**
 * A blocklist of *whole* passwords, not prefixes: "Romancha!2026" is fine,
 * "Romancha123" is not. Prefix matching punishes exactly the people who try to
 * be clever about the brand.
 */
function isWeak(pw) {
  const bare = String(pw).toLowerCase().replace(/[^a-z0-9]/g, '');
  return WEAK_PATTERNS.has(bare) || WEAK_PATTERNS.has(String(pw).toLowerCase());
}

export function passwordIssues(pw) {
  const p = String(pw || '');
  const out = [];
  if (p.length < 10) out.push('use at least 10 characters');
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) out.push('mix letters and numbers');
  if (isWeak(p)) out.push('not be a commonly leaked password');
  return out;
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p,
  }).toString('hex');
  return { salt, hash, params: SCRYPT };
}

export function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const actual = crypto.scryptSync(String(password), salt, SCRYPT.keylen, {
    N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p,
  });
  const expected = Buffer.from(String(expectedHash), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

const token = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

// ------------------------------------------------------------------ accounts
export async function createUser(db, { email, password, displayName = '', phone = null }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!isEmail(cleanEmail)) return { error: 'Enter a valid email address.', status: 400 };
  const problems = passwordIssues(password);
  if (problems.length) return { error: `Password must ${problems.join(' and ')}.`, status: 400 };
  if (await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail])) {
    return { error: 'An account with this email already exists.', status: 409 };
  }
  if (phone) {
    const p = normalisePhone(phone);
    if (!p) return { error: 'Phone number must include a country code.', status: 400 };
    if (await db.get('SELECT id FROM users WHERE phone = ?', [p])) {
      return { error: 'That phone number is already in use.', status: 409 };
    }
    phone = p;
  }

  const id = crypto.randomUUID();
  const { salt, hash } = hashPassword(password);
  await db.run(
    'INSERT INTO users (id, email, phone, display_name, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, cleanEmail, phone || null, String(displayName).slice(0, 40), salt, hash, Date.now()],
  );
  await db.run('INSERT INTO verifications (user_id, status, created_at) VALUES (?, ?, ?)', [id, 'none', Date.now()]);
  return { user: { id, email: cleanEmail, phone: phone || null, displayName: String(displayName).slice(0, 40) } };
}

export async function authenticate(db, { email, password, userAgent = '' }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
  const generic = { error: 'Email or password is incorrect.', status: 401 };

  if (user?.locked_until && user.locked_until > Date.now()) {
    const mins = Math.ceil((user.locked_until - Date.now()) / 60000);
    return { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, status: 429 };
  }
  if (!user) {
    // Burn the same CPU as a real verification so timing does not confirm emails.
    hashPassword(password || 'x', 'constant-timing-salt');
    return generic;
  }
  if (!verifyPassword(password, user.password_salt, user.password_hash)) {
    const failed = (user.failed_attempts || 0) + 1;
    const locked = failed >= MAX_FAILED ? Date.now() + LOCK_MS : 0;
    await db.run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', [
      locked ? 0 : failed, locked, user.id,
    ]);
    return generic;
  }

  await db.run('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?', [user.id]);
  return openSession(db, user, userAgent);
}

/**
 * Mint a session for an already-authenticated user row. Split out because Google
 * sign-in authenticates by ID token instead of by password, and a second copy of
 * the cookie/session logic is exactly how a login path ends up skipping the
 * lockout reset or the CSRF token.
 */
export async function openSession(db, user, userAgent = '') {
  const sessionToken = token(32);
  const csrf = token(16);
  const now = Date.now();
  await db.run(
    'INSERT INTO sessions (token, user_id, csrf_token, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [digest(sessionToken), user.id, csrf, now, now + SESSION_TTL_MS, String(userAgent).slice(0, 200)],
  );
  return {
    user: { id: user.id, email: user.email, phone: user.phone, displayName: user.display_name, premiumPlan: user.premium_plan },
    session: { token: sessionToken, csrf },
  };
}

export async function destroySession(db, rawToken) {
  if (!rawToken) return;
  await db.run('DELETE FROM sessions WHERE token = ?', [digest(rawToken)]);
}

export async function sessionUser(db, req) {
  const raw = parseCookies(req)?.[COOKIE_NAME];
  if (!raw) return null;
  const row = await db.get(
    'SELECT s.*, u.id AS uid, u.email, u.phone, u.display_name, u.premium_plan FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
    [digest(raw)],
  );
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.run('DELETE FROM sessions WHERE token = ?', [digest(raw)]);
    return null;
  }
  return { rawToken: raw, csrf: row.csrf_token, user: { id: row.uid, email: row.email, phone: row.phone, displayName: row.display_name, premiumPlan: row.premium_plan } };
}

export function parseCookies(req) {
  const header = req?.headers?.cookie;
  if (!header) return null;
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function sessionCookie(tokenValue, { secure = false } = {}) {
  return `${COOKIE_NAME}=${tokenValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? '; Secure' : ''}`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** CSRF is only enforced on state-changing requests when a session exists. */
export function csrfOk(req, session) {
  if (!session) return true;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const sent = req.headers['x-csrf-token'];
  return Boolean(sent) && sent === session.csrf;
}

export { token as newToken, digest as hashToken };
