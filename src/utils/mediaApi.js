/**
 * Real media capture for chats and profile photos.
 *
 * Before this, the attach buttons in ChatThread appended a *generated placeholder*
 * ("Photo (demo)") and a fake "Voice note · 0:07". A dating app that sends fake
 * attachments is worse than one with no attachments at all, so both are gone:
 * these helpers produce actual pixels and actual audio, resize them (which also
 * drops EXIF GPS data), and upload them to the server when one is connected.
 */
import { resizeDataUrl } from './imageResize.js';
import { getCsrf } from './apiClient.js';

const MAX_INLINE_BYTES = 260_000; // only used when there is no server to hold the file

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function blobToDataUrl(blob) {
  return fileToDataUrl(blob);
}

/** Resize + upload a photo. Returns { url, bytes, mime } — or a local preview. */
export async function preparePhoto(file, { maxEdge = 1024, quality = 0.82, onProgress } = {}) {
  if (!file) throw new Error('No file selected.');
  if (!/^image\//.test(file.type)) throw new Error('Please pick an image file (jpg, png or webp).');
  if (file.size > 12 * 1024 * 1024) throw new Error('That image is over 12 MB. Crop it or pick a smaller one.');
  onProgress?.('resizing');
  let dataUrl = await fileToDataUrl(file);
  try {
    const resized = await resizeDataUrl(dataUrl, { maxEdge, quality });
    if (resized) dataUrl = resized;
  } catch {
    // Resize can fail on exotic formats; the original is still fine to send.
  }
  return uploadMedia(dataUrl, 'image', { onProgress, fallbackLabel: 'Photo' });
}

/** MediaRecorder → webm/ogg blob → upload. Caller owns the stop() timing. */
export async function sendRecording(blob, { onProgress } = {}) {
  const dataUrl = await blobToDataUrl(blob);
  const mime = blob.type || 'audio/webm';
  return uploadMedia(dataUrl, 'voice', { onProgress, mimeHint: mime, fallbackLabel: 'Voice note' });
}

async function uploadMedia(dataUrl, kind, { onProgress, mimeHint, fallbackLabel } = {}) {
  const bytes = approximateBytes(dataUrl);
  const url = new URL('/api/uploads', window.location.origin);
  onProgress?.('uploading');
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(csrfHeader()) },
      body: JSON.stringify({ dataUrl, kind }),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) throw new Error(out?.error || `Upload rejected (${res.status}).`);
    return { ...out, local: false, label: fallbackLabel };
  } catch (err) {
    // No API on this host: keep a small inline copy so the chat still shows the
    // media this session, and say out loud that it is not saved anywhere.
    if (bytes <= MAX_INLINE_BYTES) {
      return { url: dataUrl, bytes, mime: mimeHint || 'image/jpeg', local: true, label: fallbackLabel, note: 'Saved in this tab only — start the server to store media on the account.' };
    }
    throw new Error(err?.message || 'Upload failed: the Romancha server is not reachable.');
  }
}

function csrfHeader() {
  const token = getCsrf();
  return token ? { 'x-csrf-token': token } : {};
}

function approximateBytes(dataUrl) {
  const b64 = String(dataUrl).split(',')[1] || '';
  return Math.round((b64.length * 3) / 4);
}

/**
 * Record a voice note. Returns { stop(), cancel(), done() }: the UI holds a button,
 * releases it, and awaits `done()` for the blob. A hard cap stops a 40-minute
 * monologue from turning into a 30 MB upload.
 */
export async function startVoiceRecorder({ maxMs = 120_000, onLevel } = {}) {
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) throw new Error('This browser cannot record audio (needs https:// or localhost).');
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser has no MediaRecorder support.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    .find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  let stopped = false;
  const startedAt = Date.now();
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const finished = new Promise((resolve, reject) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mime || 'audio/webm' });
      if (!blob.size) reject(new Error('Nothing was recorded — check the microphone permission.'));
      else resolve({ blob, ms: Date.now() - startedAt });
    };
    rec.onerror = (e) => reject(new Error(e?.error?.message || 'Recording failed.'));
  });
  rec.start(250);
  let meter = null;
  if (onLevel && typeof AudioContext !== 'undefined') {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      meter = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
        onLevel(peak);
      }, 100);
    } catch { /* level meter is cosmetic */ }
  }
  const timeout = setTimeout(() => { if (!stopped) stop(); }, maxMs);

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(meter);
    clearTimeout(timeout);
    try { rec.stop(); } catch { /* already stopped */ }
  }

  return {
    stop,
    cancel() {
      chunks.length = 0;
      stop();
    },
    done: () => finished,
    get elapsedMs() { return Date.now() - startedAt; },
  };
}

/** Still frame from the camera, for selfie verification. */
export async function captureSelfie({ maxEdge = 720 } = {}) {
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) throw new Error('Camera capture needs https:// or localhost.');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } }, audio: false });
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, 350));
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
