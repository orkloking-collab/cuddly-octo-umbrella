import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Sparkles, Radio, Mail } from 'lucide-react'

import { onlineUsers } from '../data/mockCommunityData'
import { realtimeHub } from '../utils/realtimeHub'
export default function LiveChatLounge({ userProfile, onOpenContactAuthor }) {
  const [selectedChatUser, setSelectedChatUser] = useState(onlineUsers[0]);
  const [chatMode, setChatMode] = useState('public'); // 'public' or 'direct'
  const [inputText, setInputText] = useState('');
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState({});
  const [liveConnectedUsers, setLiveConnectedUsers] = useState(onlineUsers);
  const messagesEndRef = useRef(null);

  // Sync user profile to realtime hub
  useEffect(() => {
    if (userProfile) {
      realtimeHub.setUser(userProfile);
    }
  }, [userProfile]);

  // Subscribe to real-time incoming messages & presence
  useEffect(() => {
    const unsubMsg = realtimeHub.onMessage((msg, _isHistory) => {
      if (msg.channel === 'public') {
        setRealtimeMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else if (msg.channel === 'direct') {
        const contactKey = msg.senderId === userProfile?.id ? msg.recipientId : msg.senderId;
        setDirectMessages(prev => {
          const list = prev[contactKey] || [];
          if (list.some(m => m.id === msg.id)) return prev;
          return {
            ...prev,
            [contactKey]: [...list, msg]
          };
        });
      }
    });

    const unsubPresence = realtimeHub.onPresence((members) => {
      if (members && members.length > 0) {
        // Merge real online members with curated authors
        const merged = [...members];
        onlineUsers.forEach(u => {
          if (!merged.some(m => m.id === u.id)) {
            merged.push(u);
          }
        });
        setLiveConnectedUsers(merged);
      }
    });

    return () => {
      unsubMsg();
      unsubPresence();
    };
  }, [userProfile]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [realtimeMessages, directMessages, chatMode]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    if (chatMode === 'public') {
      await realtimeHub.sendMessage({
        channel: 'public',
        text: text,
        sender: userProfile?.name || 'Anonymous Lover',
        senderGender: userProfile?.gender || 'Female',
        senderCountry: userProfile?.country || 'Bangladesh',
        senderCountryFlag: userProfile?.countryFlag || '🇧🇩',
        avatar: userProfile?.avatar
      });
    } else {
      await realtimeHub.sendMessage({
        channel: 'direct',
        recipientId: selectedChatUser.id,
        text: text,
        sender: userProfile?.name || 'Anonymous Lover',
        senderGender: userProfile?.gender || 'Female',
        senderCountry: userProfile?.country || 'Bangladesh',
        senderCountryFlag: userProfile?.countryFlag || '🇧🇩',
        avatar: userProfile?.avatar
      });
    }
  };

  const currentDisplayMessages = chatMode === 'public' 
    ? realtimeMessages 
    : (directMessages[selectedChatUser?.id] || selectedChatUser?.initialChat || []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Real-time sync instruction banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#190d24] to-rose-950/80 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
          <p className="text-emerald-200">
            <strong className="text-white font-bold">Real Live Multi-Device Chat Active:</strong> Open this website in a <strong>2nd browser tab or your mobile phone</strong>. Messages sent here will appear live on both screens in real-time!
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
            <span>● 0ms Live Sync</span>
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#210c2e] via-[#2d113c] to-[#150a20] border border-rose-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Presence & Real-Time Chat Lounge</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-white">
            Romancha Real-Time Midnight Lounge
          </h2>
          <p className="text-xs sm:text-sm text-rose-200/70 font-light mt-1 font-serif">
            Chat live with real online members across multiple devices in real-time.
          </p>
        </div>

        {/* Tab switch between 1-on-1 and Public Lounge */}
        <div className="flex bg-[#120819] p-1 rounded-2xl border border-rose-900/40 shrink-0 self-start md:self-center">
          <button
            onClick={() => setChatMode('public')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              chatMode === 'public' ? 'bg-pink-600 text-white shadow-md' : 'text-rose-200/70 hover:text-white'
            }`}
          >
            Public Lounge 💬
          </button>
          <button
            onClick={() => setChatMode('direct')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              chatMode === 'direct' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-200/70 hover:text-white'
            }`}
          >
            1-on-1 Direct Chat
          </button>
        </div>
      </div>

      {/* Online Users Horizontal Reel */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Active Creators Online ({liveConnectedUsers.length})</span>
          </div>
          <span className="text-[11px] text-pink-300 font-normal normal-case">Click on any user to chat 1-on-1</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {liveConnectedUsers.map((u) => {
            const isSelected = selectedChatUser?.id === u.id && chatMode === 'direct';

            return (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedChatUser(u);
                  setChatMode('direct');
                }}
                className={`p-2.5 rounded-2xl bg-[#170e22] border transition-all cursor-pointer group flex flex-col items-center text-center space-y-1.5 ${
                  isSelected ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-lg' : 'border-rose-900/30 hover:border-rose-600/50'
                }`}
              >
                <div className="relative">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-rose-500/50"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#170e22]"></span>
                </div>

                <div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[11px] font-bold text-white truncate max-w-[70px]">{u.name?.split(' ')[0]}</span>
                    <span className="text-xs">{u.countryFlag || '🇧🇩'}</span>
                  </div>
                  <span className={`text-[8px] px-1 py-0.2 rounded-full font-semibold border ${
                    u.gender === 'Female' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {u.gender || 'Female'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Chat Window */}
      <div className="rounded-3xl bg-[#160b1e] border border-rose-900/40 overflow-hidden shadow-2xl flex flex-col h-[540px]">
        
        {/* Chat Window Header */}
        <div className="p-4 bg-[#120819] border-b border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {chatMode === 'direct' ? (
              <>
                <div className="relative">
                  <img
                    src={selectedChatUser.avatar}
                    alt={selectedChatUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-rose-500"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#120819]"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold font-serif text-white">{selectedChatUser.name}</h4>
                    <span className="text-xs">{selectedChatUser.countryFlag} {selectedChatUser.country}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/30 font-semibold">
                      {selectedChatUser.gender}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium">● Online Now (Live 1-on-1 Chat)</p>
                </div>
              </>
            ) : (
              <div>
                <h4 className="text-sm font-bold font-serif text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>Global Midnight Romance Public Lounge</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🟢 Live Synced
                  </span>
                </h4>
                <p className="text-[11px] text-rose-200/60 font-serif">Open live chat for real romance fans & authors connecting across the globe</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {chatMode === 'direct' && (
              <button
                onClick={() => onOpenContactAuthor({
                  name: selectedChatUser.name,
                  gender: selectedChatUser.gender,
                  avatar: selectedChatUser.avatar,
                  title: 'Direct Chat'
                })}
                className="px-3 py-1.5 rounded-xl bg-pink-600/30 hover:bg-pink-600 text-pink-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Letter</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#0f0715]/60">
          {currentDisplayMessages.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-rose-400/40 mx-auto" />
              <p className="text-sm text-rose-200/60 font-serif">No messages in this channel yet.</p>
              <p className="text-xs text-rose-200/40">Type your first message below to start the live conversation!</p>
            </div>
          ) : (
            currentDisplayMessages.map((msg) => {
              const isMe = msg.sender === 'You' || msg.sender?.startsWith(userProfile?.name) || msg.senderId === userProfile?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-200/60 mb-1 px-1">
                    <span className="font-semibold text-rose-200">{msg.sender}</span>
                    {msg.senderCountryFlag && <span>{msg.senderCountryFlag}</span>}
                    {msg.senderGender && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-rose-300">
                        {msg.senderGender}
                      </span>
                    )}
                    <span>• {msg.time}</span>
                  </div>
                  
                  <div className={`p-3.5 rounded-2xl max-w-sm sm:max-w-md text-xs sm:text-sm font-serif leading-relaxed shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-tr-none'
                      : 'bg-[#1e1128] text-rose-100 border border-rose-900/40 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#120819] border-t border-rose-900/40 flex items-center gap-2">
          <input
            type="text"
            required
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={chatMode === 'public' ? "Type a real message to the public lounge..." : `Message ${selectedChatUser.name} in real-time...`}
            className="flex-1 bg-[#180e22] border border-rose-900/50 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
          />
          <button
            type="submit"
            className="p-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white rounded-2xl shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}
