import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Heart, 
  Flame, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  Smile, 
  Users,
  ChevronDown,
  Radio
} from 'lucide-react';
import { onlineUsers } from '../data/mockCommunityData';
import { realtimeHub } from '../utils/realtimeHub';

export default function FloatingChatWidget({ activeContact, onCloseContact, userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState(onlineUsers[0]);
  const [inputText, setInputText] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [messages, setMessages] = useState({});
  const messagesEndRef = useRef(null);

  // Sync if externally opened
  useEffect(() => {
    if (activeContact) {
      setCurrentContact(activeContact);
      setIsOpen(true);
    }
  }, [activeContact]);

  // Hook into real-time hub
  useEffect(() => {
    const unsub = realtimeHub.onMessage((msg) => {
      const key = msg.channel === 'public' ? 'public' : (msg.recipientId || msg.senderId);
      setMessages(prev => {
        const list = prev[key] || [];
        if (list.some(m => m.id === msg.id)) return prev;
        return {
          ...prev,
          [key]: [...list, msg]
        };
      });
    });

    return unsub;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentContact, isOpen]);

  const contactKey = currentContact?.id;
  const targetMessages = messages[contactKey] || currentContact?.initialChat || [];

  const handleSendMessage = async (customText) => {
    const text = customText || inputText;
    if (!text.trim()) return;

    setInputText('');

    await realtimeHub.sendMessage({
      channel: 'direct',
      recipientId: currentContact.id,
      text: text.trim(),
      sender: userProfile?.name || 'You',
      senderGender: userProfile?.gender || 'Female',
      senderCountry: userProfile?.country || 'Bangladesh',
      senderCountryFlag: userProfile?.countryFlag || '🇧🇩',
      avatar: userProfile?.avatar
    });
  };

  const quickPills = [
    "💖 Loved your chapter!",
    "🔥 So intense!",
    "🍷 What happens next?",
    "✨ You are amazing"
  ];

  return (
    <>
      {/* Floating Trigger Bubble (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 p-3.5 sm:p-4 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 text-white shadow-2xl shadow-rose-600/50 hover:scale-110 active:scale-95 transition-all flex items-center gap-2.5 group"
          title="Open Live Chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-rose-600 animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-rose-600"></span>
          </div>
          <span className="text-xs font-bold hidden sm:inline pr-1">
            Live Chat ({onlineUsers.length})
          </span>
        </button>
      )}

      {/* Floating Chat Box Window */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-2 sm:right-6 z-50 w-[94vw] sm:w-96 max-h-[560px] h-[520px] rounded-3xl bg-[#170c22] border border-rose-500/40 shadow-2xl shadow-black flex flex-col overflow-hidden animate-slide-in">
          
          {/* Chat Header */}
          <div className="p-3.5 bg-[#120819] border-b border-rose-900/40 flex items-center justify-between">
            <div 
              onClick={() => setSelectorOpen(!selectorOpen)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 flex-1 min-w-0 pr-2"
            >
              <div className="relative shrink-0">
                <img
                  src={currentContact.avatar}
                  alt={currentContact.name}
                  className="w-10 h-10 rounded-xl object-cover border border-rose-500/50"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#120819]"></span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{currentContact.name}</span>
                  <span className="text-xs">{currentContact.countryFlag}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-rose-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
                </div>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span>● Online Now (0ms Sync)</span>
                  <span className="text-rose-200/50">• {currentContact.gender}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onCloseContact) onCloseContact();
                }}
                className="p-1.5 rounded-full text-rose-200 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Contact Switcher Dropdown */}
          {selectorOpen && (
            <div className="bg-[#120819] border-b border-rose-900/40 p-2 space-y-1 max-h-48 overflow-y-auto">
              <div className="text-[10px] text-rose-300 font-bold px-2 py-0.5 uppercase tracking-wider">
                Switch Online Member:
              </div>
              {onlineUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    setCurrentContact(u);
                    setSelectorOpen(false);
                  }}
                  className={`p-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    currentContact.id === u.id ? 'bg-rose-600/30 text-white' : 'hover:bg-white/5 text-rose-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-lg object-cover" />
                    <span className="text-xs font-semibold">{u.name}</span>
                    <span className="text-xs">{u.countryFlag}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">● Online</span>
                </div>
              ))}
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#0f0715]/70">
            {targetMessages.map((msg) => {
              const isMe = msg.sender === 'You' || msg.senderId === userProfile?.id || msg.sender?.startsWith(userProfile?.name);
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[9px] text-rose-200/50 mb-0.5 px-1">{msg.sender} • {msg.time}</span>
                  <div className={`p-2.5 rounded-2xl max-w-[85%] text-xs font-serif leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-tr-none'
                      : 'bg-[#1e1128] text-rose-100 border border-rose-900/40 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Pills */}
          <div className="px-3 py-1.5 bg-[#120819] border-t border-rose-900/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPills.map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(pill)}
                className="px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-600 text-[10px] text-rose-200 hover:text-white whitespace-nowrap border border-rose-900/40 transition-all shrink-0"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-[#120819] border-t border-rose-900/40 flex items-center gap-2"
          >
            <input
              type="text"
              required
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${currentContact.name} live...`}
              className="flex-1 bg-[#180e22] border border-rose-900/50 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="p-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
