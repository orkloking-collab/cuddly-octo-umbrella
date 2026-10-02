import React, { useState } from 'react';
import { X, Send, Heart, Mail, MessageSquare, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ContactWriterModal({ isOpen, onClose, targetAuthor, storyTitle, onMessageSent }) {
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [messageType, setMessageType] = useState('Secret Note'); // 'Secret Note', 'Chapter Inquiry', 'Tip & Appreciation'
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen || !targetAuthor) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (onMessageSent) {
      onMessageSent({
        id: Date.now(),
        author: targetAuthor.name || targetAuthor.author || 'Author',
        storyTitle: storyTitle || 'Story',
        senderName: senderName.trim() || 'Anonymous Admirer',
        senderContact: senderContact.trim() || 'Hidden',
        messageType,
        message: message.trim()
      });
    }

    setSentSuccess(true);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setSentSuccess(false);
      onClose();
      setMessage('');
    }, 1600);
  };

  const authorName = targetAuthor.name || targetAuthor.author || 'Elena Vance';
  const authorGender = targetAuthor.authorGender || targetAuthor.gender || 'Female';
  const authorAvatar = targetAuthor.authorAvatar || targetAuthor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#180e22] border border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-rose-900/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-600/20 text-pink-400 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-white">Contact & Message Author</h2>
              <p className="text-xs text-rose-200/60">Send a direct message or romantic appreciation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-rose-900/40 text-rose-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold font-serif text-white">Message Delivered to {authorName}!</h3>
            <p className="text-xs text-rose-200/70">Your confidential note has been dispatched to the author's private vault.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Target Author Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#120819] border border-rose-900/30">
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-12 h-12 rounded-xl object-cover border border-rose-500/40 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold font-serif text-white truncate">{authorName}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    authorGender === 'Female' 
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {authorGender}
                  </span>
                </div>
                {storyTitle && (
                  <p className="text-xs text-pink-300/80 italic truncate font-serif">
                    Re: "{storyTitle}"
                  </p>
                )}
              </div>
            </div>

            {/* Note Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-rose-200/80 mb-1">Message Purpose</label>
              <div className="grid grid-cols-3 gap-2">
                {['Secret Note', 'Chapter Inquiry', 'Appreciation'].map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setMessageType(type)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                      messageType === type
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-[#12081a] text-rose-200/70 border-rose-900/40 hover:border-rose-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Your Name / Pen Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Anonymous Admirer"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Your Email or Handle</label>
                <input
                  type="text"
                  value={senderContact}
                  onChange={(e) => setSenderContact(e.target.value)}
                  placeholder="reader@email.com / @handle"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-rose-200/80 mb-1">Your Message *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Dear ${authorName}, your latest story chapter left me breathless...`}
                className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-serif leading-relaxed"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-900/30">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-rose-200/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Note</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
