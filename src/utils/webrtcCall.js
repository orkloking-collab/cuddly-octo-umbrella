/**
 * Peer-to-peer call orchestration for Romancha video dates.
 *
 * What the server does: relays opaque signalling blobs (invite / SDP / ICE /
 * hangup) between exactly two users over the existing SSE channel.
 * What the server never does: sees, stores or forwards media. Audio and video go
 * straight between the two browsers (WebRTC), with STUN for NAT traversal.
 *
 * Offer/answer direction is deliberate: the *callee* creates the offer after
 * accepting. That avoids the classic glare case where both sides start ringing at
 * once and both try to negotiate, and it means no media is ever requested from a
 * person who has not tapped "Accept".
 *
 * Everything injectable (media, RTCPeerConnection, signalling) so the state
 * machine is unit-testable in Node — see tests/webrtcCall.test.mjs.
 */
const DEFAULT_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

const STATES = ['idle', 'calling', 'incoming', 'connecting', 'connected', 'ended', 'failed'];

export function peerAccountId(cardId) {
  const id = String(cardId || '');
  return id.startsWith('usr:') ? id.slice(4) : (id.startsWith('usr-') ? null : id);
}

export function createPeerCall({
  selfId,
  peerId,
  callId = `call-${Date.now()}`,
  sendSignal,
  onRemoteStream,
  onStateChange,
  onReaction,
  onLocalStream,
  mediaProvider = null,
  peerConnectionFactory = null,
  iceServers = DEFAULT_ICE,
  onDataChannel,
} = {}) {
  if (!selfId || !peerId) throw new Error('createPeerCall needs selfId and peerId');

  let state = 'idle';
  let failure = null;
  let pc = null;
  let channel = null;
  let localStream = null;
  let pendingCandidates = [];
  let answerSent = false;
  const queue = []; // signals that arrived before the peer connection existed

  const media = mediaProvider || defaultMediaProvider();
  const newPeerConnection = peerConnectionFactory || defaultPeerConnectionFactory();

  const setState = (next, info = null) => {
    state = next;
    // The reason travels with every transition ("declined", "no-camera",
    // "remote-hangup") so the UI can explain *why* a call is over.
    failure = info;
    try { onStateChange?.(next, info, { state: pc?.connectionState }); } catch { /* UI listener */ }
  };

  const relay = (signal) => {
    if (!signal) return;
    Promise.resolve(sendSignal?.({ to: peerId, callId, signal })).catch(() => { /* hub offline */ });
  };

  const getStats = async () => {
    if (!pc) return null;
    try {
      const report = await pc.getStats();
      const out = { inbound: null, outbound: null, candidateType: null };
      report.forEach((r) => {
        if (r.type === 'inbound-rtp' && r.kind === 'video') out.inbound = { bytes: r.bytesReceived, framesPerSecond: r.framesPerSecond, resolution: `${r.frameWidth || 0}x${r.frameHeight || 0}` };
        if (r.type === 'outbound-rtp' && r.kind === 'video') out.outbound = { bytes: r.bytesSent };
        if (r.type === 'local-candidate') out.candidateType = r.candidateType;
        if (r.type === 'candidate-pair' && r.state === 'succeeded') out.rttMs = Math.round((r.currentRoundTripTime || 0) * 1000);
      });
      return out;
    } catch {
      return null;
    }
  };

  const ensurePeerConnection = () => {
    if (pc) return pc;
    pc = newPeerConnection({ iceServers: { iceServers }, bundlePolicy: 'max-bundle' });

    if (localStream) for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    pc.onicecandidate = (event) => {
      if (event.candidate) relay({ type: 'ice', candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate });
    };
    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || event.stream;
      try { onRemoteStream?.(stream); } catch { /* UI listener */ }
      if (pc.connectionState === 'connected') setState('connected');
    };
    pc.ondatachannel = (event) => attachChannel(event.channel);
    pc.onconnectionstatechange = () => {
      const cs = pc?.connectionState;
      if (cs === 'connected') setState('connected');
      else if (cs === 'failed') setState('failed', 'peer-connection-failed');
      else if (cs === 'disconnected' && state === 'connected') setState('connecting', 'reconnecting');
      else if (cs === 'closed' && state !== 'ended') setState('ended', 'closed');
    };
    return pc;
  };

  const attachChannel = (ch) => {
    channel = ch;
    channel.onopen = () => { try { onDataChannel?.(channel); } catch { /* consumer */ } };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onReaction?.(data);
      } catch { /* reactions are best-effort */ }
    };
  };

  const applyRemote = async (description) => {
    await pc.setRemoteDescription(description);
    for (const candidate of pendingCandidates.splice(0)) {
      try { await pc.addIceCandidate(candidate); } catch { /* stale candidate */ }
    }
  };

  const drain = async () => {
    while (queue.length) {
      const signal = queue.shift();
      await handleSignalNow(signal);
    }
  };

  const handleSignalNow = async (signal) => {
    if (!signal) return;

    // Control-plane signals are handled without touching WebRTC at all, so a
    // ringing phone does not light up the camera or open a connection.
    if (signal.type === 'invite') {
      setState('incoming', { from: signal.from || peerId, video: signal.video !== false });
      return;
    }
    if (signal.type === 'declined' || signal.type === 'busy' || signal.type === 'hangup') {
      const reason = signal.type === 'declined' ? (signal.reason || 'declined')
        : signal.type === 'busy' ? 'busy' : 'remote-hangup';
      closeEverything(reason); // their call ending must free our camera immediately
      return;
    }

    const connection = ensurePeerConnection();

    if (signal.type === 'ice') {
      if (!connection.remoteDescription) {
        pendingCandidates.push(signal.candidate);
        return;
      }
      try { await connection.addIceCandidate(signal.candidate); } catch { /* already applied */ }
      return;
    }

    if (signal.type === 'offer') {
      setState('connecting');
      await applyRemote({ type: 'offer', sdp: signal.sdp });
      if (!answerSent) {
        answerSent = true;
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        relay({ type: 'answer', sdp: connection.localDescription.sdp });
      }
      return;
    }

    if (signal.type === 'answer') {
      setState('connecting');
      await applyRemote({ type: 'answer', sdp: signal.sdp });
      return;
    }

    if (signal.type === 'invite') {
      setState('incoming', { from: signal.from || peerId, video: signal.video !== false });
      return;
    }

    if (signal.type === 'accepted') {
      setState('connecting');
    }
  };

  async function startMedia({ video = true } = {}) {
    try {
      localStream = await media({ video, audio: true });
      try { onLocalStream?.(localStream); } catch { /* UI listener */ }
      return true;
    } catch (err) {
      const name = err?.name || '';
      const reason = name === 'NotAllowedError' ? 'permission-denied'
        : name === 'NotFoundError' ? 'no-camera'
          : name === 'NotReadableError' ? 'camera-in-use'
            : 'media-error';
      setState('failed', reason);
      return false;
    }
  }

  const call = {
    id: callId,
    get state() { return state; },
    get failure() { return failure; },
    get localStream() { return localStream; },
    get connectionState() { return pc?.connectionState || 'new'; },
    states: STATES,

    /** Caller side: ring the other person, then wait for their offer. */
    async invite({ video = true } = {}) {
      setState('calling');
      if (!(await startMedia({ video }))) return false;
      // The caller's peer connection exists up front so late ICE/answer frames
      // are never dropped on the floor while we wait for them to pick up.
      const connection = ensurePeerConnection();
      channel = connection.createDataChannel ? connection.createDataChannel('romancha-reactions', { ordered: false, maxRetransmits: 0 }) : null;
      if (channel) attachChannel(channel);
      relay({ type: 'invite', from: selfId, video });
      return true;
    },

    /** Callee side: accept, grab media, then create the offer. */
    async accept({ video = true } = {}) {
      if (!(await startMedia({ video }))) {
        relay({ type: 'declined', reason: failure || 'media-error' });
        return false;
      }
      const connection = ensurePeerConnection();
      channel = connection.createDataChannel ? connection.createDataChannel('romancha-reactions', { ordered: false, maxRetransmits: 0 }) : null;
      if (channel) attachChannel(channel);
      relay({ type: 'accepted', from: selfId });
      setState('connecting');
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      relay({ type: 'offer', sdp: connection.localDescription.sdp });
      await drain();
      return true;
    },

    decline() {
      relay({ type: 'declined', from: selfId });
      setState('ended', 'declined-by-you');
    },

    busy() {
      relay({ type: 'busy', from: selfId });
      setState('ended', 'busy');
    },

    /** Entry point for every inbound signalling frame (already filtered by peer). */
    async handleSignal(signal) {
      const control = ['invite', 'accepted', 'declined', 'busy', 'hangup'].includes(signal?.type);
      // Media-plane frames need a connection; if it does not exist yet (the user
      // has not accepted), park them and replay them right after accept().
      if (!pc && !control) queue.push(signal);
      else await handleSignalNow(signal);
      if (pc) await drain();
    },

    setAudio(enabled) {
      if (!localStream) return;
      localStream.getAudioTracks().forEach((t) => { t.enabled = Boolean(enabled); });
    },

    setVideo(enabled) {
      if (!localStream) return;
      localStream.getVideoTracks().forEach((t) => { t.enabled = Boolean(enabled); });
    },

    async replaceVideo({ video = true } = {}) {
      if (!pc) return;
      const ok = await startMedia({ video });
      if (!ok) return;
      const sender = pc.getSenders?.().find((s) => s.track?.kind === 'video');
      const track = localStream.getVideoTracks()[0];
      if (sender && track) await sender.replaceTrack(track);
      else if (track) pc.addTrack(track, localStream);
    },

    /** Emoji/heart reactions ride a unreliable data channel — no media, no retry. */
    sendReaction(kind) {
      if (!channel || channel.readyState !== 'open') return false;
      try {
        channel.send(JSON.stringify({ kind, from: selfId, ts: Date.now() }));
        return true;
      } catch {
        return false;
      }
    },

    getStats,

    hangUp() {
      relay({ type: 'hangup', from: selfId });
      closeEverything('hangup');
    },

    close() {
      closeEverything(null);
    },
  };

  function closeEverything(reason) {
    try { channel?.close?.(); } catch { /* already closed */ }
    try { pc?.close?.(); } catch { /* already closed */ }
    if (localStream) for (const track of localStream.getTracks()) { try { track.stop(); } catch { /* already stopped */ } }
    localStream = null;
    channel = null;
    pc = null;
    answerSent = false;
    pendingCandidates = [];
    queue.length = 0;
    if (state !== 'ended') setState('ended', reason);
  }

  return call;
}

function defaultMediaProvider() {
  return async ({ video, audio }) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('getUserMedia is unavailable (needs https:// or localhost)'), { name: 'NotSupportedError' });
    }
    return navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
  };
}

function defaultPeerConnectionFactory() {
  return (config) => {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('This browser has no WebRTC support');
    }
    return new RTCPeerConnection(config);
  };
}
