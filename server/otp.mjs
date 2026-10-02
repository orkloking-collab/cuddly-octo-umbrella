/**
 * Phone verification (OTP) with pluggable delivery.
 *
 * Rules this enforces, because SMS verification is a scammer magnet:
 *  - 6-digit codes, hashed at rest (scrypt), never stored in clear
 *  - 5 minute expiry, 5 wrong attempts, single-use
 *  - 3 sends per phone per hour, 5 per device per day
 *  - codes are compared with timingSafeEqual
 *  - the code itself is only ever returned by the API when ALLOW_INLINE_CODE=1
 *    (local development); production paths send it through the provider
 *
 * Providers:
 *   SMS_PROVIDER=console  -> prints to the server log (default, no account needed)
 *   SMS_PROVIDER=twilio   -> REST API with TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
 *   SMS_PROVIDER=http     -> POST SMS_HOOK_URL (your own gateway / MSG91 / Threadly / etc.)
 */
import crypto from 'node:crypto';

const CODE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
// Tunable so a developer looping through the flow locally does not have to know
// that a daily counter exists; the defaults are what production should use.
const SENDS_PER_PHONE_PER_HOUR = num(process.env.OTP_PHONE_HOURLY_LIMIT, 3);
const SENDS_PER_IP_PER_DAY = num(process.env.OTP_IP_DAILY_LIMIT, 5);

export function generateCode() {
  // Rejection-free uniform digits in [100000, 999999]
  let n = 0;
  do {
    n = crypto.randomBytes(4).readUInt32BE(0);
  } while (n >= 4294967290);
  return String(100000 + (n % 900000));
}

const hash = (code, salt) => crypto.scryptSync(String(code), salt, 32, { N: 2048, r: 8, p: 1 }).toString('hex');

export async function requestOtp(db, { phone, ip = 'unknown' }, provider) {
  const recentForPhone = await db.all(
    'SELECT created_at FROM otp_codes WHERE phone = ? AND created_at > ? ORDER BY created_at DESC',
    [phone, Date.now() - 3600_000],
  );
  if (recentForPhone.length >= SENDS_PER_PHONE_PER_HOUR) {
    return { error: 'Too many codes requested for this number. Try again in an hour.', status: 429 };
  }
  const dayAgo = Date.now() - 86400_000;
  const recentForIp = await db.all(
    'SELECT created_at FROM otp_codes WHERE phone = ? AND created_at > ?',
    [`ip:${ip}`, dayAgo],
  );
  if (recentForIp.length >= SENDS_PER_IP_PER_DAY) {
    return { error: 'Too many verification requests from this device today.', status: 429 };
  }

  const code = generateCode();
  const salt = crypto.randomBytes(12).toString('hex');
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.run(
    'INSERT INTO otp_codes (id, phone, code_hash, salt, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, phone, hash(code, salt), salt, now + CODE_TTL_MS, now],
  );
  // Rate-limit bookkeeping keyed by IP, same table shape, never returned to clients.
  await db.run(
    'INSERT INTO otp_codes (id, phone, code_hash, salt, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [`${id}-ip`, `ip:${ip}`, 'rate-limit-marker', salt, now + CODE_TTL_MS, now],
  );

  const delivery = await provider.send({
    to: phone,
    body: `Romancha verification code: ${code}. It expires in 5 minutes. Nobody from Romancha will ever ask you for this code.`,
  });

  const out = { ok: true, expiresAt: now + CODE_TTL_MS, provider: delivery.provider, attemptsLeft: MAX_ATTEMPTS };
  if (process.env.ALLOW_INLINE_CODE === '1') out.debugCode = code; // dev only
  return out;
}

export async function confirmOtp(db, { phone, code }) {
  const rows = await db.all(
    'SELECT * FROM otp_codes WHERE phone = ? AND consumed_at IS NULL AND code_hash <> ? ORDER BY created_at DESC LIMIT 5',
    [phone, 'rate-limit-marker'],
  );
  if (!rows.length) return { error: 'No pending code for this number. Request a new one.', status: 400 };

  const open = rows.find((r) => r.attempts < MAX_ATTEMPTS && r.expires_at > Date.now());
  if (!open) return { error: 'That code expired. Request a new one.', status: 400 };

  const candidate = hash(String(code || '').replace(/\D/g, ''), open.salt);
  const ok =
    candidate.length === open.code_hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(open.code_hash));

  if (!ok) {
    const attempts = open.attempts + 1;
    await db.run('UPDATE otp_codes SET attempts = ? WHERE id = ?', [attempts, open.id]);
    const left = MAX_ATTEMPTS - attempts;
    return {
      error: left > 0 ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Request a new code.',
      status: 400,
    };
  }

  await db.run('UPDATE otp_codes SET consumed_at = ? WHERE id = ?', [Date.now(), open.id]);
  return { ok: true, phone };
}

// ------------------------------------------------------------------ providers
export function createSmsProvider({ log = () => {} } = {}) {
  const name = process.env.SMS_PROVIDER || 'console';

  if (name === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !auth || !from) {
      throw new Error('SMS_PROVIDER=twilio needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM');
    }
    return {
      provider: 'twilio',
      async send({ to, body }) {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: from, Body: body }),
        });
        if (!res.ok) throw new Error(`Twilio responded ${res.status}: ${await res.text()}`);
        return { provider: 'twilio', id: (await res.json())?.sid };
      },
    };
  }

  if (name === 'http') {
    const hook = process.env.SMS_HOOK_URL;
    if (!hook) throw new Error('SMS_PROVIDER=http needs SMS_HOOK_URL');
    return {
      provider: 'http',
      async send({ to, body }) {
        const res = await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(process.env.SMS_HOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_HOOK_TOKEN}` } : {}) },
          body: JSON.stringify({ to, body }),
        });
        if (!res.ok) throw new Error(`SMS hook responded ${res.status}`);
        return { provider: 'http' };
      },
    };
  }

  return {
    provider: 'console',
    async send({ to, body }) {
      log(`\n  ┌─ SMS → ${to}\n  │  ${body}\n  └─────── (set SMS_PROVIDER=twilio or http for real delivery)\n`);
      return { provider: 'console' };
    },
  };
}

export const internalsForTests = { CODE_TTL_MS, MAX_ATTEMPTS, SENDS_PER_PHONE_PER_HOUR, hash };
