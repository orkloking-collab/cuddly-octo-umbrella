import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Heart, 
  Flame, 
  Sparkles, 
  Smile, 
  Users, 
  Mail, 
  ShieldCheck, 
  Search,
  CheckCheck,
  ChevronLeft,
  Image,
  Video,
  Mic,
  Paperclip,
  Maximize2
} from 'lucide-react';
import { onlineUsers } from '../data/mockCommunityData';
import { realtimeHub } from '../utils/realtimeHub';
import confetti from 'canvas-confetti';

export default function DirectChatModal({ isOpen, onClose, targetUser, userProfile }) {
  const [selectedUser, setSelectedUser] = useState(targetUser || onlineUsers[0]);
  const [inputText, setInputText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState(null); // { type: 'image'|'video', url: string }
  const [messages, setMessages] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (targetUser) {
      setSelectedUser(targetUser);
      setIsMobileListOpen(false);
    }
  }, [targetUser]);

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
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedUser, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentKey = selectedUser?.id;
  const currentMessages = messages[currentKey] || selectedUser?.initialChat || [];

  const handleMediaUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedMedia({
          type: type || (file.type.startsWith('video') ? 'video' : 'image'),
          url: reader.result,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedMedia) return;

    const textToSend = inputText.trim();
    const mediaToSend = attachedMedia;

    setInputText('');
    setAttachedMedia(null);

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      channel: 'direct',
      recipientId: selectedUser.id,
      text: textToSend,
      media: mediaToSend, // Support for Photo / Video attachments!
      sender: userProfile?.name || 'You',
      senderId: userProfile?.id || 'usr-me',
      senderGender: userProfile?.gender || 'Female',
      senderCountry: userProfile?.country || 'Bangladesh',
      senderCountryFlag: userProfile?.countryFlag || '🇧🇩',
      avatar: userProfile?.avatar,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistic UI update
    setMessages(prev => ({
      ...prev,
      [currentKey]: [...(prev[currentKey] || selectedUser.initialChat || []), newMsg]
    }));

    await realtimeHub.sendMessage(newMsg);
  };

  const handleSendHeart = async () => {
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.7 }
    });

    const heartMsg = {
      id: `msg-heart-${Date.now()}`,
      channel: 'direct',
      recipientId: selectedUser.id,
      text: '💖 Sent a passionate heart kiss!',
      sender: userProfile?.name || 'You',
      senderId: userProfile?.id || 'usr-me',
      senderGender: userProfile?.gender || 'Female',
      senderCountry: userProfile?.country || 'Bangladesh',
      senderCountryFlag: userProfile?.countryFlag || '🇧🇩',
      avatar: userProfile?.avatar,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [currentKey]: [...(prev[currentKey] || selectedUser.initialChat || []), heartMsg]
    }));

    await realtimeHub.sendMessage(heartMsg);
  };

  const filteredContacts = onlineUsers.filter(u => 
    u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    u.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      
      {/* Click Backdrop to Close */}
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />

      {/* Main Chat Modal Box */}
      <div 
        className="relative w-full max-w-4xl h-[94vh] sm:h-[85vh] max-h-[760px] bg-[#150a1e] border border-rose-500/40 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Left Sidebar: Conversations & Online Creators */}
        <div className={`w-full md:w-80 bg-[#110718] border-r border-rose-900/40 flex flex-col ${
          isMobileListOpen ? 'block' : 'hidden md:flex'
        }`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-rose-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold font-cinzel text-white">Direct Messages</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              ● Live Sync
            </span>
          </div>

          {/* Search Contacts */}
          <div className="p-3 border-b border-rose-900/30">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-rose-400 absolute left-3" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search creator or author..."
                className="w-full bg-[#1b0d26] border border-rose-900/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-rose-200/40 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Online Contacts List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredContacts.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user);
                    setIsMobileListOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-r from-rose-600/30 to-pink-600/20 border border-rose-500/40 text-white' 
                      : 'hover:bg-white/5 text-rose-200/80 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl object-cover border border-rose-500/30"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#110718]"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{user.name}</span>
                      <span className="text-xs">{user.countryFlag}</span>
                    </div>
                    <p className="text-[10px] text-pink-300 truncate mt-0.5">{user.activity}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current User Info Bar */}
          <div className="p-3 bg-[#0d0413] border-t border-rose-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <img
                src={userProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt="Me"
                className="w-7 h-7 rounded-lg object-cover border border-rose-500/50 shrink-0"
              />
              <span className="text-xs font-bold text-white truncate">{userProfile?.name || 'You'}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium shrink-0">Online ID</span>
          </div>
        </div>

        {/* Right Section: Active 1-on-1 Chat Conversation */}
        <div className={`flex-1 flex flex-col bg-[#160b20] ${
          isMobileListOpen ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Chat Window Top Bar */}
          <div className="p-3.5 sm:p-4 bg-[#120719] border-b border-rose-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileListOpen(true)}
                className="md:hidden p-1.5 rounded-xl bg-white/5 text-rose-300 hover:text-white"
                title="View All Contacts"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <img
                  src={selectedUser?.avatar}
                  alt={selectedUser?.name}
                  className="w-10 h-10 rounded-xl object-cover border-2 border-rose-500/50"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#120719]"></span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold font-serif text-white truncate">{selectedUser?.name}</h3>
                  <span>{selectedUser?.countryFlag}</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-600/30 text-pink-300 font-semibold border border-rose-500/30">
                    {selectedUser?.gender}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span>● Online Now</span>
                  <span className="text-rose-200/50">• {selectedUser?.followers || 0} Followers</span>
                </p>
              </div>
            </div>

            {/* Top Action & Big Close Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendHeart}
                className="p-2 rounded-full bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white border border-pink-500/40 transition-all"
                title="Send Heart Kiss"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-rose-950/80 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-700/50 transition-all cursor-pointer shadow-lg"
                title="Close Direct Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#0e0516]/60">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
                <Heart className="w-10 h-10 text-rose-400 animate-bounce" />
                <p className="text-sm text-white font-serif font-bold">Start an intimate conversation with {selectedUser?.name}</p>
                <p className="text-xs text-rose-200/60">Send text, romantic photo stories, and video clips in real time.</p>
              </div>
            ) : (
              currentMessages.map((msg, index) => {
                const isMe = msg.sender === 'You' || msg.senderId === userProfile?.id || msg.sender?.startsWith(userProfile?.name);
                return (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-rose-200/50 mb-1 px-1">
                      <span>{msg.sender}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>

                    <div className={`p-3 sm:p-3.5 rounded-2xl max-w-[85%] sm:max-w-[75%] text-xs sm:text-sm font-serif leading-relaxed shadow-md space-y-2 ${
                      isMe
                        ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white rounded-tr-none'
                        : 'bg-[#1e0f2b] text-rose-100 border border-rose-900/50 rounded-tl-none'
                    }`}>
                      
                      {/* Attached Media Rendering (Photos & Videos) */}
                      {msg.media && (
                        <div className="rounded-xl overflow-hidden border border-white/20 mt-1">
                          {msg.media.type === 'video' ? (
                            <video
                              src={msg.media.url}
                              controls
                              className="w-full max-h-64 object-cover rounded-xl"
                            />
                          ) : (
                            <img
                              src={msg.media.url}
                              alt="attachment"
                              onClick={() => setPreviewMediaUrl(msg.media.url)}
                              className="w-full max-h-64 object-cover rounded-xl cursor-pointer hover:opacity-95"
                            />
                          )}
                        </div>
                      )}

                      {msg.text && <p>{msg.text}</p>}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached Media Preview before send */}
          {attachedMedia && (
            <div className="px-4 py-2 bg-[#120719] border-t border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-bold">
                  📎 Ready to send: {attachedMedia.type === 'video' ? 'Video Clip' : 'Photo Image'}
                </span>
              </div>
              <button
                onClick={() => setAttachedMedia(null)}
                className="text-xs text-rose-400 hover:text-white"
              >
                Remove ✕
              </button>
            </div>
          )}

          {/* Quick Compliments & Opener Pills */}
          <div className="px-3 py-1.5 bg-[#120719] border-t border-rose-900/30 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {[
              "💖 Loved your latest story!",
              "🔥 Sending you a secret hug",
              "🍷 Cheers to your writing!",
              "✨ Are you online tonight?"
            ].map((pill, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText(pill);
                }}
                className="px-3 py-1 rounded-full bg-rose-950/60 hover:bg-rose-600 text-[11px] text-rose-200 hover:text-white whitespace-nowrap border border-rose-900/40 transition-all shrink-0"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Message Input Box with Photo & Video attachment tools */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-[#110718] border-t border-rose-900/40 flex items-center gap-2"
          >
            {/* Photo Attachment Input */}
            <input
              type="file"
              id="chat-photo-input"
              accept="image/*"
              onChange={(e) => handleMediaUpload(e, 'image')}
              className="hidden"
            />
            <label
              htmlFor="chat-photo-input"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-900/50 text-rose-300 hover:text-white cursor-pointer transition-colors"
              title="Attach Photo"
            >
              <Image className="w-4 h-4" />
            </label>

            {/* Video Attachment Input */}
            <input
              type="file"
              id="chat-video-input"
              accept="video/*"
              onChange={(e) => handleMediaUpload(e, 'video')}
              className="hidden"
            />
            <label
              htmlFor="chat-video-input"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-900/50 text-rose-300 hover:text-white cursor-pointer transition-colors"
              title="Attach Video Clip"
            >
              <Video className="w-4 h-4" />
            </label>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Write private message to ${selectedUser?.name}...`}
              className="flex-1 bg-[#190d24] border border-rose-900/50 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
            />

            {/* Send Button */}
            <button
              type="submit"
              className="p-3 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl shadow-lg shadow-rose-900/40 transition-all active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>

      {/* Fullscreen Photo Lightbox Preview */}
      {previewMediaUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <img src={previewMediaUrl} alt="expanded" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
          <button className="absolute top-4 right-4 p-2 text-white bg-black/50 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

    </div>
  );
}
