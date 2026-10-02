/**
 * Uploaded media for chat photos, voice notes and profile pictures.
 *
 * Deliberately small and strict:
 *  - only images the browser can produce (jpeg/png/webp) and voice-note audio
 *  - content-addressed filenames (sha256 of the bytes), so path traversal is not
 *    a thing to remember to defend against — the name cannot be anything else
 *  - hard size caps per kind; the per-user quota is the API's job (it owns the DB)
 *  - files are written under `data/uploads` and served read-only with a long
 *    cache header; nothing here is ever executed
 *
 * Video notes are deliberately not accepted yet: a 24 MB clip wants a chunked or
 * raw-binary endpoint, not a base64 blob in JSON, and half-doing it is how uploads
 * start failing mysteriously on a phone connection.
 *
 * EXIF location data does not survive a canvas re-encode, which is why the client
 * resizes before uploading (see src/utils/imageResize.js). That is a privacy
 * feature, not just bandwidth: a raw phone photo carries GPS coordinates.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const KINDS = {
  image: { exts: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }, maxBytes: 4 * 1024 * 1024 },
  voice: { exts: { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/x-m4a': 'm4a' }, maxBytes: 8 * 1024 * 1024 },
};

const DATA_URL_RE = /^data:([\w/+.-]+);base64,(.+)$/s;

export function createUploadStore({ dir, maxBytesPerUser = 200 * 1024 * 1024 } = {}) {
  const root = dir || path.join(process.cwd(), 'data', 'uploads');
  fs.mkdirSync(root, { recursive: true });

  const decode = (input) => {
    if (typeof input === 'string') {
      const m = DATA_URL_RE.exec(input);
      if (!m) throw Object.assign(new Error('expected a base64 data URL'), { status: 400 });
      return { mime: m[1].toLowerCase(), buffer: Buffer.from(m[2], 'base64') };
    }
    if (Buffer.isBuffer(input)) return { mime: 'application/octet-stream', buffer: input };
    throw Object.assign(new Error('unsupported payload'), { status: 400 });
  };

  async function save({ data, kind = 'image' }) {
    const policy = KINDS[kind];
    if (!policy) throw Object.assign(new Error(`unknown upload kind: ${kind}`), { status: 400 });
    const { mime, buffer } = decode(data);
    const ext = policy.exts[mime];
    if (!ext) {
      throw Object.assign(new Error(`${kind} upload must be one of: ${Object.keys(policy.exts).join(', ')}`), { status: 415 });
    }
    if (!buffer?.length) throw Object.assign(new Error('empty file'), { status: 400 });
    if (buffer.length > policy.maxBytes) {
      throw Object.assign(new Error(`too large — ${kind} uploads are capped at ${Math.round(policy.maxBytes / 1024 / 1024)} MB`), { status: 413 });
    }
    // Content hash doubles as the name and as free de-duplication.
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 40);
    const name = `${hash}.${ext}`;
    const target = path.join(root, name);
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, buffer, { mode: 0o644 });
    }
    return {
      path: name,
      url: `/uploads/${name}`,
      mime,
      bytes: buffer.length,
      reused: fs.existsSync(target),
      sha256: hash,
    };
  }

  /** Serves GET /uploads/<name>. Returns false when this is not our business. */
  function serve(req, res, pathname) {
    const name = decodeURIComponent(pathname.replace(/^\/uploads\//, ''));
    // Whitelist, not blacklist: only the exact shape we can produce.
    if (!/^[a-f0-9]{40}\.(jpg|png|webp|ogg|webm|m4a|mp3|mp4)$/.test(name)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return true;
    }
    const file = path.join(root, name);
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return true;
    }
    const ext = name.split('.').pop();
    const type = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      ogg: 'audio/ogg', webm: 'audio/webm', m4a: 'audio/mp4', mp3: 'audio/mpeg', mp4: 'video/mp4',
    }[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': fs.statSync(file).size,
      // Immutable because the name is a hash of the bytes.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'",
    });
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    fs.createReadStream(file).pipe(res);
    return true;
  }

  /**
   * Deleting a *file* here would be a bug: uploads are content-addressed, so two
   * people can share one blob and one of them deleting it would break the other's
   * chat. Callers delete their DB row; `sweep(root, keep)` is what removes bytes,
   * and it only unlinks names that no row references.
   */
  function remove(name) {
    const safe = path.basename(String(name || ''));
    if (!/^[a-f0-9]{40}\.[a-z0-9]{2,4}$/.test(safe)) return false;
    return fs.existsSync(path.join(root, safe));
  }

  function sweep(keepNames) {
    const keep = new Set(keepNames);
    let removed = 0;
    let bytes = 0;
    for (const entry of fs.readdirSync(root)) {
      if (keep.has(entry)) continue;
      const stat = fs.statSync(path.join(root, entry));
      if (!stat.isFile()) continue;
      fs.unlinkSync(path.join(root, entry));
      removed += 1;
      bytes += stat.size;
    }
    return { removed, bytes };
  }

  return { save, serve, remove, sweep, root, maxBytesPerUser, kinds: Object.keys(KINDS) };
}
