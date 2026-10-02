// Real-Time Cross-Client & Multi-Device Sync Hub (Stories, Reels, Chat, Feedbacks, Profile Updates, Gifts)
class RealtimeChatHub {
  constructor() {
    this.eventSource = null;
    this.broadcastChannel = null;
    this.messageListeners = new Set();
    this.storyListeners = new Set();
    this.reelListeners = new Set();
    this.feedbackListeners = new Set();
    this.profileListeners = new Set();
    this.giftListeners = new Set();
    this.presenceListeners = new Set();
    this.signalListeners = new Set();
    this.domainListeners = new Set();
    this.isConnected = false;
    this.serverAvailable = null; // null = unknown, false = static hosting (no /api) -> stay local-only
    this.currentUser = null;
    this.pingInterval = null;
    this.localHistory = this.readHistory();

    this.initBroadcastChannel();
    this.connectSSE();
  }

  initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('romancha_realtime_sync_v2');
        this.broadcastChannel.onmessage = (event) => {
          if (!event.data) return;
          const { type, payload } = event.data;
          if (type === 'message') this.notifyMessage(payload);
          if (type === 'story') this.notifyStory(payload);
          if (type === 'reel') this.notifyReel(payload);
          if (type === 'feedback') this.notifyFeedback(payload);
          if (type === 'profile_update') this.notifyProfile(payload);
          if (type === 'gift') this.notifyGift(payload);
          if (type === 'presence') this.notifyPresence(payload);
        };
      } catch (e) {
        console.warn('BroadcastChannel fallback', e);
      }
    }
  }

  connectSSE() {
    if (typeof window === 'undefined') return;
    if (this.serverAvailable === false) return; // no dev server: do not open a retry loop against a 404

    try {
      if (this.eventSource) {
        try { this.eventSource.close(); } catch {}
      }

      // `uid` lets the server push a DM or a WebRTC offer to *this* tab only.
      const uid = this.currentUser?.id ? `?uid=${encodeURIComponent(this.currentUser.id)}` : '';
      this.eventSource = new EventSource(`/api/realtime/stream${uid}`);

      this.eventSource.onopen = () => {
        this.isConnected = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'message') {
            this.notifyMessage(payload.message);
          } else if (payload.type === 'story') {
            this.notifyStory(payload.story);
          } else if (payload.type === 'reel') {
            this.notifyReel(payload.reel);
          } else if (payload.type === 'profile_update') {
            this.notifyProfile(payload.profile);
          } else if (payload.type === 'feedback') {
            this.notifyFeedback(payload.feedback);
          } else if (payload.type === 'gift') {
            this.notifyGift(payload.gift);
          } else if (payload.type === 'history') {
            if (payload.messages) payload.messages.forEach(m => this.notifyMessage(m, true));
            if (payload.stories) payload.stories.forEach(s => this.notifyStory(s, true));
            if (payload.reels) payload.reels.forEach(r => this.notifyReel(r, true));
            if (payload.userProfiles) payload.userProfiles.forEach(p => this.notifyProfile(p, true));
            if (payload.feedbacks) payload.feedbacks.forEach(f => this.notifyFeedback(f, true));
            if (payload.onlineMembers) this.notifyPresence(payload.onlineMembers);
          } else if (payload.type === 'presence') {
            this.notifyPresence(payload.onlineMembers);
          } else if (payload.type === 'signal') {
            // WebRTC offer / answer / ICE candidate, relayed verbatim.
            this.signalListeners.forEach((cb) => { try { cb(payload); } catch {} });
          } else if (payload.type === 'chat' || payload.type === 'match') {
            // Server-side (database-backed) events, consumed by datingStore.
            this.domainListeners.forEach((cb) => { try { cb(payload); } catch {} });
          }
        } catch (e) {
          console.error('Error parsing SSE event', e);
        }
      };

      this.eventSource.onerror = (event) => {
        this.isConnected = false;
        if (this.eventSource) {
          try { this.eventSource.close(); } catch {}
          this.eventSource = null;
        }
        const retryAfter = event?.retryCount || 0;
        // A served SPA returns index.html for /api/*, which EventSource treats as an
        // instant error. After 3 quick failures we stop trying and run local-only.
        if (retryAfter >= 3) {
          this.serverAvailable = false;
          return;
        }
        this.retryCount = (this.retryCount || 0) + 1;
        setTimeout(() => this.connectSSE(), 4000);
      };
    } catch (e) {
      console.warn('SSE connection error', e);
    }
  }

  setUser(user) {
    const changed = (user?.id || null) !== (this.currentUser?.id || null);
    this.currentUser = user || null;
    this.sendPresence();

    if (!this.pingInterval) {
      this.pingInterval = setInterval(() => this.sendPresence(), 15000);
    }
    // Sign-in changes who the targeted pushes (chat, call invites) belong to.
    if (changed && this.serverAvailable !== false) this.connectSSE();
  }

  /** Relays SDP/ICE blobs to one peer. The server never touches media. */
  async sendSignal({ to, signal, callId }) {
    if (this.serverAvailable === false) return { success: false, error: 'offline' };
    try {
      const res = await fetch('/api/realtime/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          from: this.currentUser?.id || 'anon',
          callId: callId || null,
          signal,
        }),
      });
      if (!res.ok) return { success: false, status: res.status };
      return await res.json();
    } catch (e) {
      return { success: false, error: e?.name || 'network' };
    }
  }

  async sendPresence() {
    if (!this.currentUser || this.serverAvailable === false) return;
    try {
      await fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentUser)
      });
    } catch {
      // ignore
    }
  }

  /**
   * Publish a realtime event.
   *
   * Previously every failure logged "Failed to publish realtime event" and did
   * nothing else, which meant the app was half-broken on static hosting with no
   * way to tell why. Now: broadcast to this browser's other tabs, append to a
   * local ring buffer so a refresh does not wipe the lounge, and only hit the
   * network when the realtime server is actually there.
   */
  async publish(type, data) {
    this.broadcastLocal(type, data);
    this.remember(type, data);

    if (this.serverAvailable === false) return { success: true, transport: 'local' };

    try {
      const res = await fetch('/api/realtime/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, [type]: data, ...data })
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        // Dev server is not running (static build) -> downgrade once, stay quiet.
        this.serverAvailable = false;
        return { success: true, transport: 'local' };
      }
      this.serverAvailable = true;
      return await res.json();
    } catch (e) {
      this.serverAvailable = false;
      return { success: true, transport: 'local', error: e?.name };
    }
  }

  broadcastLocal(type, payload) {
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage({ type, payload }); } catch { /* channel closed */ }
    }
  }

  readHistory() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('romancha_realtime_history_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  remember(type, payload) {
    if (typeof window === 'undefined' || type === 'presence') return;
    this.localHistory = [{ type, payload, at: Date.now() }, ...this.localHistory].slice(0, 120);
    try {
      localStorage.setItem('romancha_realtime_history_v1', JSON.stringify(this.localHistory));
    } catch {
      // Quota exceeded (someone posted a huge photo) - keep memory only.
      this.localHistory = this.localHistory.slice(0, 40);
    }
  }

  historyFor(type) {
    return this.localHistory.filter((h) => h.type === type).map((h) => h.payload);
  }

  replayInto(handlers = {}) {
    for (const entry of this.localHistory) {
      const fn = handlers[entry.type];
      if (fn) fn(entry.payload);
    }
  }

  async sendMessage(msgPayload) {
    this.notifyMessage(msgPayload);
    return this.publish('message', msgPayload);
  }

  async publishStory(story) {
    this.notifyStory(story);
    return this.publish('story', story);
  }

  async publishReel(reel) {
    this.notifyReel(reel);
    return this.publish('reel', reel);
  }

  async publishProfileUpdate(profile) {
    this.notifyProfile(profile);
    return this.publish('profile_update', profile);
  }

  async publishFeedback(feedback) {
    this.notifyFeedback(feedback);
    return this.publish('feedback', feedback);
  }

  async sendGift(gift) {
    this.notifyGift(gift);
    return this.publish('gift', gift);
  }

  onMessage(cb) { this.messageListeners.add(cb); return () => this.messageListeners.delete(cb); }
  onStory(cb) { this.storyListeners.add(cb); return () => this.storyListeners.delete(cb); }
  onReel(cb) { this.reelListeners.add(cb); return () => this.reelListeners.delete(cb); }
  onProfile(cb) { this.profileListeners.add(cb); return () => this.profileListeners.delete(cb); }
  onFeedback(cb) { this.feedbackListeners.add(cb); return () => this.feedbackListeners.delete(cb); }
  onGift(cb) { this.giftListeners.add(cb); return () => this.giftListeners.delete(cb); }
  onPresence(cb) { this.presenceListeners.add(cb); return () => this.presenceListeners.delete(cb); }
  onSignal(cb) { this.signalListeners.add(cb); return () => this.signalListeners.delete(cb); }
  onDomain(cb) { this.domainListeners.add(cb); return () => this.domainListeners.delete(cb); }

  subscribeMessages(cb) { return this.onMessage(cb); }
  subscribeStories(cb) { return this.onStory(cb); }
  subscribeReels(cb) { return this.onReel(cb); }
  subscribeProfileUpdates(cb) { return this.onProfile(cb); }
  subscribeFeedbacks(cb) { return this.onFeedback(cb); }
  subscribeGifts(cb) { return this.onGift(cb); }
  subscribePresence(cb) { return this.onPresence(cb); }

  notifyMessage(msg, isHist) { this.messageListeners.forEach(cb => { try { cb(msg, isHist); } catch {} }); }
  notifyStory(story, isHist) { this.storyListeners.forEach(cb => { try { cb(story, isHist); } catch {} }); }
  notifyReel(reel, isHist) { this.reelListeners.forEach(cb => { try { cb(reel, isHist); } catch {} }); }
  notifyProfile(profile, isHist) { this.profileListeners.forEach(cb => { try { cb(profile, isHist); } catch {} }); }
  notifyFeedback(fb, isHist) { this.feedbackListeners.forEach(cb => { try { cb(fb, isHist); } catch {} }); }
  notifyGift(gift, isHist) { this.giftListeners.forEach(cb => { try { cb(gift, isHist); } catch {} }); }
  notifyPresence(m) { this.presenceListeners.forEach(cb => { try { cb(m); } catch {} }); }
}

export const realtimeHub = new RealtimeChatHub();
