import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In-memory data store for real-time synchronization
const clients = new Set();
const messageHistory = [];
const liveStories = [];
const liveReels = [];
const liveFeedbacks = [];
const livePhotoStories = [];
const liveUserProfiles = new Map();
const onlineLiveMembers = new Map();

function realtimePlugin() {
  return {
    name: 'realtime-chat-hub',
    configureServer(server) {
      // 1. SSE Real-Time Stream endpoint
      server.middlewares.use('/api/realtime/stream', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        clients.add(res);

        // Send initial full sync payload
        const initialData = JSON.stringify({
          type: 'history',
          messages: messageHistory.slice(-60),
          stories: liveStories,
          reels: liveReels,
          feedbacks: liveFeedbacks,
          photoStories: livePhotoStories,
          userProfiles: Array.from(liveUserProfiles.values()),
          onlineMembers: Array.from(onlineLiveMembers.values())
        });
        res.write(`data: ${initialData}\n\n`);

        req.on('close', () => {
          clients.delete(res);
        });
      });

      // 2. Broadcast / Publish endpoint (Messages, Stories, Reels, Feedbacks, Profile Updates, Gifts)
      server.middlewares.use('/api/realtime/publish', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const eventType = payload.type || 'message';
              
              if (eventType === 'message') {
                const newMsg = {
                  id: payload.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  channel: payload.channel || 'public',
                  recipientId: payload.recipientId || null,
                  sender: payload.sender || 'Anonymous',
                  senderId: payload.senderId || 'anon',
                  senderGender: payload.senderGender || 'Female',
                  senderCountry: payload.senderCountry || 'Bangladesh',
                  senderCountryFlag: payload.senderCountryFlag || '🇧🇩',
                  avatar: payload.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                  time: payload.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  text: payload.text,
                  media: payload.media || null
                };
                messageHistory.push(newMsg);
                if (messageHistory.length > 250) messageHistory.shift();

                const data = `data: ${JSON.stringify({ type: 'message', message: newMsg })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, message: newMsg }));
              } 
              else if (eventType === 'story') {
                const newStory = payload.story || payload;
                liveStories.unshift(newStory);
                if (liveStories.length > 60) liveStories.pop();

                const data = `data: ${JSON.stringify({ type: 'story', story: newStory })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, story: newStory }));
              }
              else if (eventType === 'reel') {
                const newReel = payload.reel || payload;
                liveReels.unshift(newReel);
                if (liveReels.length > 60) liveReels.pop();

                const data = `data: ${JSON.stringify({ type: 'reel', reel: newReel })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, reel: newReel }));
              }
              else if (eventType === 'profile_update') {
                const updatedProfile = payload.profile || payload;
                if (updatedProfile.name || updatedProfile.id || updatedProfile.email) {
                  const key = (updatedProfile.name || updatedProfile.id || updatedProfile.email).toLowerCase();
                  liveUserProfiles.set(key, updatedProfile);
                }

                const data = `data: ${JSON.stringify({ type: 'profile_update', profile: updatedProfile })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, profile: updatedProfile }));
              }
              else if (eventType === 'feedback') {
                const newFeedback = payload.feedback || payload;
                liveFeedbacks.unshift(newFeedback);
                if (liveFeedbacks.length > 60) liveFeedbacks.pop();

                const data = `data: ${JSON.stringify({ type: 'feedback', feedback: newFeedback })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, feedback: newFeedback }));
              }
              else if (eventType === 'gift') {
                const giftData = payload.gift || payload;
                const data = `data: ${JSON.stringify({ type: 'gift', gift: giftData })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, gift: giftData }));
              }
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.writeHead(405);
          res.end();
        }
      });

      // 3. User Presence Heartbeat
      server.middlewares.use('/api/realtime/presence', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const user = JSON.parse(body);
              if (user && user.id) {
                onlineLiveMembers.set(user.id, {
                  ...user,
                  lastSeen: Date.now()
                });

                const now = Date.now();
                for (const [id, member] of onlineLiveMembers.entries()) {
                  if (now - member.lastSeen > 35000) {
                    onlineLiveMembers.delete(id);
                  }
                }

                const list = Array.from(onlineLiveMembers.values());
                const data = `data: ${JSON.stringify({ type: 'presence', onlineMembers: list })}\n\n`;
                clients.forEach(c => { try { c.write(data); } catch (e) { clients.delete(c); } });
              }
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400);
              res.end();
            }
          });
        } else {
          res.writeHead(405);
          res.end();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), realtimePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  }
})
