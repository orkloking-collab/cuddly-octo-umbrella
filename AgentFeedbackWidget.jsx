import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Lightbulb, Check, Heart, HelpCircle, ChevronDown, Minimize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { realtimeHub } from '../utils/realtimeHub';

export default function AgentFeedbackWidget({ userProfile, onOpenFeedbackTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commentType, setCommentType] = useState('Feedback'); // 'Feedback' | 'Suggestion' | 'Support'
  const [messageText, setMessageText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const payload = {
      id: `fb-agent-${Date.now()}`,
      title: `${commentType}: ${messageText.trim().slice(0, 40)}...`,
      description: messageText.trim(),
      category: commentType === 'Feedback' ? 'New Feature Idea' : 'Community Wishlist',
      author: `${userProfile?.name || 'Reader'} ${userProfile?.countryFlag || '🇧🇩'}`,
      votes: 1,
      status: 'Sent to Agent 📩'
    };

    await realtimeHub.publishFeedback(payload);

    setSubmitted(true);
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.8 }
    });

    setTimeout(() => {
      setSubmitted(false);
      setMessageText('');
      setIsOpen(false);
    }, 1800);
  };

  return (
    <>
      {/* Floating Trigger Button - Clean & Compact */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 px-3.5 py-2.5 rounded-full bg-[#1e0d2d]/95 hover:bg-rose-900/90 text-rose-200 hover:text-white border border-rose-500/40 shadow-xl backdrop-blur-md transition-all flex items-center gap-2 group hover:scale-105 active:scale-95"
          title="Send comments or feedback to Agent"
        >
          <Lightbulb className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-semibold tracking-wide hidden sm:inline">
            Agent Feedback & Help
          </span>
          <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.2 rounded-full font-bold">
            Live
          </span>
        </button>
      )}

      {/* Floating Agent Comment & Feedback Panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-2 sm:right-6 z-50 w-[92vw] sm:w-96 bg-[#160a20] border border-rose-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
          
          {/* Header */}
          <div className="p-4 bg-[#110619] border-b border-rose-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold font-cinzel text-white">Agent Feedback & Support</h3>
                <p className="text-[10px] text-rose-200/60">Share your thoughts & feature wishes</p>
              </div>
            </div>

            {/* Close / Minimize Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-rose-300 hover:text-white transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {submitted ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white font-serif">Thank you for your feedback!</h4>
                <p className="text-xs text-rose-200/70">Your comment has been broadcasted to the community board.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Type Selection */}
                <div className="flex bg-[#0f0516] p-1 rounded-xl border border-rose-900/40 text-[11px]">
                  {['Feedback', 'Suggestion', 'Support'].map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setCommentType(type)}
                      className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                        commentType === type
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-rose-200/60 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-[11px] font-semibold text-rose-200/80 mb-1">
                    Your Message / Comment:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Write your feedback, feature request, or comments..."
                    className="w-full bg-[#100617] border border-rose-900/50 rounded-2xl p-3 text-xs text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500 font-serif leading-relaxed"
                  />
                </div>

                {/* Submit & Wishlist Link */}
                <div className="flex items-center justify-between pt-1">
                  {onOpenFeedbackTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenFeedbackTab();
                      }}
                      className="text-[10px] text-pink-300 hover:text-white underline"
                    >
                      View Wishlist Board →
                    </button>
                  )}

                  <button
                    type="submit"
                    className="ml-auto px-4 py-2 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      )}
    </>
  );
}
