/**
 * Database layer — one SQL schema, two drivers.
 *
 *   DATABASE_URL=postgres://...   -> uses `pg`      (npm install pg)
 *   (default)                     -> node:sqlite, file at ROMANCHA_DB (./data/romancha.db)
 *
 * Queries are written with `?` placeholders and translated to `$n` for
 * Postgres, so the exact same SQL runs on both. Everything is parameterised —
 * there is no string concatenation anywhere near a value.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Ordered migrations. Never edit an applied one — append a new entry. */
export const MIGRATIONS = [
  {
    id: '001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE,
        display_name TEXT NOT NULL DEFAULT '',
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER NOT NULL DEFAULT 0,
        premium_plan TEXT,
        premium_since INTEGER
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        csrf_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        user_agent TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS decisions (
        user_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS likes (
        user_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'like',
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        persona_id TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        first_contact_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'text',
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        read_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS blocks (
        user_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'reviewing',
        created_at INTEGER NOT NULL,
        resolved_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS verifications (
        user_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'none',
        method TEXT,
        selfie_at INTEGER,
        phone_verified INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        verified_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS otp_codes (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        consumed_at INTEGER
      );
    `,
  },
  {
    id: '002_verification_timestamps',
    sql: `
      ALTER TABLE verifications ADD COLUMN phone_verified_at INTEGER;
      ALTER TABLE verifications ADD COLUMN expires_at INTEGER;
    `,
  },
];

/** `?` -> `$1..$n`. Throws if a literal `?` sneaks into a string constant. */
export function translatePlaceholders(sql) {
  if (/['"][^'"]*\?[^'"]*['"]/.test(sql)) {
    throw new Error('SQL contains a "?" inside a string literal — rewrite the query.');
  }
  let i = 0;
  return sql.replace(/\?/g, () => `$${(i += 1)}`);
}

const toSqliteValue = (v) => {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined) return null;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
};

async function migrate(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL
  )`);
  for (const m of MIGRATIONS) {
    const done = await db.get('SELECT id FROM schema_migrations WHERE id = ?', [m.id]);
    if (done) continue;
    await db.exec(m.sql);
    await db.run('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [m.id, Date.now()]);
  }
}

export async function createDb({ url = process.env.DATABASE_URL, file = null } = {}) {
  if (url) {
    let pg;
    try {
      ({ default: pg } = await import('pg'));
    } catch {
      throw new Error('DATABASE_URL is set but "pg" is not installed. Run: npm install pg');
    }
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    const db = {
      kind: 'postgres',
      exec: async (sql) => {
        await pool.query(sql);
      },
      all: async (sql, params = []) => (await pool.query(translatePlaceholders(sql), params)).rows,
      get: async (sql, params = []) => (await db.all(sql, params))[0] || null,
      run: async (sql, params = []) => ({ changes: (await pool.query(translatePlaceholders(sql), params)).rowCount ?? 0 }),
      close: async () => pool.end(),
    };
    await migrate(db);
    return db;
  }

  const target = file === ':memory:' ? ':memory:' : file || process.env.ROMANCHA_DB || path.join(HERE, '..', 'data', 'romancha.db');
  const { DatabaseSync } = await import('node:sqlite');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const handle = new DatabaseSync(target);
  handle.exec('PRAGMA journal_mode = WAL');
  handle.exec('PRAGMA foreign_keys = ON');
  handle.exec('PRAGMA busy_timeout = 4000');

  const db = {
    kind: 'sqlite',
    file: target,
    exec: (sql) => handle.exec(sql),
    all: (sql, params = []) => handle.prepare(sql).all(...params.map(toSqliteValue)) ?? [],
    get: (sql, params = []) => handle.prepare(sql).get(...params.map(toSqliteValue)) || null,
    run: (sql, params = []) => ({ changes: Number(handle.prepare(sql).run(...params.map(toSqliteValue)).changes ?? 0) }),
    close: () => handle.close(),
  };
  await migrate(db);
  return db;
}
