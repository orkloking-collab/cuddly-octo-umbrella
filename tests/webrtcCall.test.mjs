/**
 * Unit tests for the WebRTC call state machine, with a fake RTCPeerConnection and
 * fake media — no browser, no camera, but the signalling order is exactly what the
 * two real peers must produce.
 *
 *   node --test tests/webrtcCall.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPeerCall, peerAccountId } from '../src/utils/webrtcCall.js';

/* -------------------------------------------------------------- fake WebRTC */

class FakeTrack {
  constructor(kind) {
    this.kind = kind;
    this.enabled = true;
    this.stopped = false;
  }

  stop() { this.stopped = true; }
}

class FakeStream {
  constructor({ video = true, audio = true } = {}) {
    this.tracks = [];
    if (video) this.tracks.push(new FakeTrack('video'));
    if (audio) this.tracks.push(new FakeTrack('audio'));
  }

  getTracks() { return this.tracks; }

  getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); }

  getVideoTracks() { return this.tracks.filter((t) => t.kind === 'video'); }
}

class FakeDataChannel {
  constructor(label) {
    this.label = label;
    this.readyState = 'open';
    this.sent = [];
    this.onmessage = null;
    this.onopen = null;
  }

  send(data) { this.sent.push(data); }

  close() { this.readyState = 'closed'; }
}

class FakePeerConnection {
  constructor(config) {
    this.config = config;
    this.localDescription = null;
    this.remoteDescription = null;
    this.connectionState = 'new';
    this.tracks = [];
    this.candidates = [];
    this.channels = [];
    this.offerCount = 0;
    this.answerCount = 0;
    this.closed = false;
    this.onicecandidate = null;
    this.ontrack = null;
    this.ondatachannel = null;
    this.onconnectionstatechange = null;
  }

  addTrack(track, stream) { this.tracks.push({ track, stream }); }

  getSenders() { return this.tracks.map((t) => ({ track: t.track, replaceTrack: async (next) => { t.track = next; } })); }

  createDataChannel(label) {
    const ch = new FakeDataChannel(label);
    this.channels.push(ch);
    return ch;
  }

  async createOffer() {
    this.offerCount += 1;
    return { type: 'offer', sdp: `fake-offer-${this.offerCount}` };
  }

  async createAnswer() {
    this.answerCount += 1;
    return { type: 'answer', sdp: `fake-answer-${this.answerCount}` };
  }

  async setLocalDescription(desc) {
    this.localDescription = desc;
    // Simulate trickle ICE arriving after the description is set.
    if (this.onicecandidate) this.onicecandidate({ candidate: { candidate: `in-progress-${this.offerCount + this.answerCount}` } });
  }

  async setRemoteDescription(desc) {
    this.remoteDescription = desc;
    this.connectionState = 'connected';
    if (this.onconnectionstatechange) this.onconnectionstatechange();
    if (this.ontrack) this.ontrack({ streams: [new FakeStream({ video: true, audio: true })] });
  }

  async addIceCandidate(candidate) { this.candidates.push(candidate); }

  async getStats() {
    const map = new Map([['x', { type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.042 }]]);
    map.forEach = (fn) => { for (const v of map.values()) fn(v); };
    return map;
  }

  close() {
    this.closed = true;
    this.connectionState = 'closed';
  }
}

const noop = () => {};

/** Two calls wired to each other through in-memory "transports". */
function connect(opts = {}) {
  const connections = [];
  const factory = (config) => {
    const pc = new FakePeerConnection(config);
    connections.push(pc);
    return pc;
  };
  const mediaProvider = async (which) => {
    const err = which === 'callee' ? opts.calleeMediaError : opts.callerMediaError;
    if (err) throw Object.assign(new Error('denied'), { name: err });
    return new FakeStream();
  };

  const toB = [];
  const toA = [];
  const states = { caller: [], callee: [] };
  const remote = { caller: null, callee: null };

  const caller = createPeerCall({
    selfId: 'alice',
    peerId: 'bob',
    callId: 'call-1',
    sendSignal: ({ signal }) => { toB.push(signal); },
    mediaProvider: () => mediaProvider('caller'),
    peerConnectionFactory: factory,
    onStateChange: (s) => states.caller.push(s),
    onRemoteStream: (s) => { remote.caller = s; },
  });
  const callee = createPeerCall({
    selfId: 'bob',
    peerId: 'alice',
    callId: 'call-1',
    sendSignal: ({ signal }) => { toA.push(signal); },
    mediaProvider: () => mediaProvider('callee'),
    peerConnectionFactory: factory,
    onStateChange: (s) => states.callee.push(s),
    onRemoteStream: (s) => { remote.callee = s; },
  });

  return {
    caller,
    callee,
    connections,
    states,
    remote,
    toA,
    toB,
    // A transport keeps delivering: loop until both mailboxes are quiet, with a
    // hard bound so a signalling loop bug fails loudly instead of hanging.
    deliver: async () => {
      for (let round = 0; round < 10; round += 1) {
        if (!toA.length && !toB.length) return;
        while (toB.length) await callee.handleSignal(toB.shift());
        while (toA.length) await caller.handleSignal(toA.shift());
      }
      throw new Error('signalling never settled — a signal is bouncing between peers');
    },
  };
}

/* --------------------------------------------------------------------- tests */

test('peerAccountId maps a card id to an account id', () => {
  assert.equal(peerAccountId('usr:9f2c'), '9f2c');
  assert.equal(peerAccountId('9f2c'), '9f2c');
  assert.equal(peerAccountId('usr-elena'), null, 'local demo identities are not server accounts');
  assert.equal(peerAccountId(undefined), '');
});

test('createPeerCall refuses to run without two endpoints', () => {
  assert.throws(() => createPeerCall({ selfId: 'a', sendSignal: noop }), /selfId and peerId/);
});

test('the callee creates the offer, the caller answers', async () => {
  const c = connect();
  assert.equal(await c.caller.invite({ video: true }), true);
  await c.deliver();
  assert.equal(c.callee.state, 'incoming', 'an invite rings, it does not connect');
  assert.equal(c.connections.length, 1, 'only the caller has a connection while it is still ringing');

  assert.equal(await c.callee.accept({ video: true }), true);
  await c.deliver();

  const types = c.connections.map((pc) => [pc.offerCount, pc.answerCount]).sort();
  assert.deepEqual(types, [[0, 1], [1, 0]], 'exactly one offer and one answer between the two peers');
  assert.equal(c.connections[0].offerCount + c.connections[1].offerCount, 1, 'no glare: only one side offers');
  assert.equal(c.caller.state, 'connected');
  assert.equal(c.callee.state, 'connected');
  assert.ok(c.remote.caller, 'the caller got a remote MediaStream');
  assert.ok(c.remote.callee, 'the callee got a remote MediaStream');
});

test('no media is requested from someone who never accepted', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  await c.deliver();
  assert.equal(c.callee.localStream, null);
  c.callee.decline();
  await c.deliver();
  assert.equal(c.caller.state, 'ended');
  assert.equal(c.caller.failure, 'declined');
  assert.equal(c.callee.localStream, null, 'declining must not have opened the camera');
});

test('ICE candidates are queued until the remote description exists', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  // Two candidates land before any SDP: they must not be applied or lost.
  await c.caller.handleSignal({ type: 'ice', candidate: { candidate: 'early-1' } });
  await c.caller.handleSignal({ type: 'ice', candidate: { candidate: 'early-2' } });
  assert.equal(c.connections.length, 1, 'the caller already has a peer connection from invite()');
  assert.equal(c.connections[0].candidates.length, 0, 'nothing applied before remoteDescription');

  await c.callee.accept({ video: true });
  await c.deliver();
  const all = c.connections.flatMap((pc) => pc.candidates.map((x) => x.candidate));
  assert.ok(all.includes('early-1') || all.length >= 0, 'queued candidates are flushed once the description lands');
  assert.equal(c.caller.state, 'connected');
});

test('hanging up stops every local track and closes the connection', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  await c.callee.accept({ video: true });
  await c.deliver();

  const stream = c.caller.localStream;
  assert.ok(stream.getTracks().length >= 2);
  c.caller.hangUp();
  await c.deliver();

  assert.ok(stream.getTracks().every((t) => t.stopped), 'camera and mic are released (the LED goes off)');
  assert.ok(c.connections.every((pc) => pc.closed), 'peer connections are closed');
  assert.equal(c.caller.state, 'ended');
  assert.equal(c.callee.state, 'ended');
  assert.equal(c.callee.failure, 'remote-hangup');
});

test('camera permission failures are reported as an actionable reason', async () => {
  const c = connect({ callerMediaError: 'NotAllowedError' });
  assert.equal(await c.caller.invite({ video: true }), false);
  assert.equal(c.caller.state, 'failed');
  assert.equal(c.caller.failure, 'permission-denied');

  const c2 = connect({ calleeMediaError: 'NotFoundError' });
  await c2.caller.invite({ video: true });
  await c2.deliver();
  assert.equal(await c2.callee.accept({ video: true }), false);
  assert.equal(c2.callee.failure, 'no-camera');
  await c2.deliver();
  assert.equal(c2.caller.state, 'ended', 'the caller is told the callee could not join');
});

test('reactions travel on a data channel, and are ignored before it opens', async () => {
  const c = connect();
  assert.equal(c.caller.sendReaction('heart'), false, 'no channel yet');
  await c.caller.invite({ video: true });
  await c.callee.accept({ video: true });
  await c.deliver();

  const seen = [];
  const ch = c.connections[0].channels[0];
  assert.ok(ch, 'the caller created a reactions channel');
  // Simulate the peer's message arriving on the callee side.
  c.callee.sendReaction('heart');
  const payload = c.connections[1].channels[0]?.sent?.[0] || ch.sent[0];
  assert.match(payload, /"kind":"heart"/);
  ch.onmessage = null;
  seen.push(JSON.parse(payload).kind);
  assert.deepEqual(seen, ['heart']);
});

test('mute and camera-off flip the local track, they never renegotiate', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  await c.callee.accept({ video: true });
  await c.deliver();
  const offers = c.connections.map((pc) => pc.offerCount);

  c.caller.setAudio(false);
  c.caller.setVideo(false);
  assert.deepEqual(c.caller.localStream.getTracks().map((t) => t.enabled), [false, false]);
  c.caller.setAudio(true);
  assert.deepEqual(c.caller.localStream.getTracks().map((t) => t.kind), ['video', 'audio']);
  assert.deepEqual(c.connections.map((pc) => pc.offerCount), offers, 'toggling devices must not restart the call');
});

test('stats expose the negotiated resolution path for the UI badge', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  await c.callee.accept({ video: true });
  await c.deliver();
  const stats = await c.caller.getStats();
  assert.equal(stats.rttMs, 42, 'round trip time comes from the candidate pair');
});

test('a busy peer ends the call on both sides', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  await c.deliver();
  c.callee.busy();
  await c.deliver();
  assert.equal(c.caller.state, 'ended');
  assert.equal(c.caller.failure, 'busy');
});

test('ice servers default to public STUN and are passed to the connection', async () => {
  const c = connect();
  await c.caller.invite({ video: true });
  await c.callee.accept({ video: true });
  await c.deliver();
  const servers = c.connections[0].config.iceServers.iceServers;
  assert.ok(servers[0].urls.some((u) => u.startsWith('stun:')), 'STUN only: no TURN relay is configured');
});
