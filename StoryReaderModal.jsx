import React, { useState, useEffect } from 'react';
import { 
  X, 
  Heart, 
  Bookmark, 
  Share2, 
  MessageCircle, 
  CloudRain, 
  Music, 
  VolumeX, 
  Send, 
  Check, 
  Flame, 
  Sparkles,
  Mail,
  User
} from 'lucide-react';
import confetti from 'canvas-confetti';
import AdBanner from './AdBanner';

export default function StoryReaderModal({ 
  story, 
  onClose, 
  isBookmarked, 
  onToggleBookmark,
  isLiked,
  onToggleLike,
  soundState,
  toggleSound,
  onOpenContactAuthor
}) {
  const [theme, setTheme] = useState('velvet'); // 'velvet', 'sepia', 'rose', 'midnight'
  const [fontSize, setFontSize] = useState('md'); // 'sm', 'md', 'lg', 'xl'
  const [comments, setComments] = useState([
    {
      id: 1,
      author: 'Scarlett V.',
      gender: 'Female',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80',
      time: '15 mins ago',
      text: 'The raw chemistry and sensory details in this chapter gave me literal chills! Exquisitely written.'
    },
    {
      id: 2,
      author: 'Julian Cole',
      gender: 'Male',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
      time: '1 hour ago',
      text: 'The dialogue and pacing are dangerously addictive. Need the next chapter immediately!'
    }
  ]);
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!story) return null;

  // Trigger floating heart confetti
  const triggerLoveReaction = () => {
    onToggleLike(story.id);
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#f43f5e', '#ec4899', '#fb7185', '#fda4af']
    });
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentObj = {
      id: Date.now(),
      author: 'You (Reader)',
      gender: 'Reader',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      time: 'Just now',
      text: newComment.trim()
    };

    setComments([commentObj, ...comments]);
    setNewComment('');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Theme styling presets
  const themes = {
    velvet: 'bg-[#130819] text-[#fce7f3] border-rose-900/40',
    sepia: 'bg-[#1f1914] text-[#fed7aa] border-amber-900/40',
    rose: 'bg-[#1b0d18] text-[#ffe4e6] border-pink-900/40',
    midnight: 'bg-[#08050e] text-[#f1f5f9] border-purple-950/60'
  };

  const fontSizes = {
    sm: 'text-base leading-relaxed',
    md: 'text-lg leading-loose',
    lg: 'text-xl leading-loose',
    xl: 'text-2xl leading-loose'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      
      {/* Container Card */}
      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors duration-300 ${themes[theme]}`}>
        
        {/* Sticky Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold tracking-wide uppercase">
              {story.category}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              18+ MATURE
            </span>
            <span className="text-xs text-white/50 hidden sm:inline">• {story.readTime}</span>
          </div>

          {/* Reader Preferences Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Ambient Sound Trigger */}
            <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => toggleSound('rain')}
                className={`p-1.5 rounded text-xs transition-all ${soundState === 'rain' ? 'bg-rose-600 text-white' : 'text-white/70 hover:text-white'}`}
                title="Rain Ambiance"
              >
                <CloudRain className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSound('warm')}
                className={`p-1.5 rounded text-xs transition-all ${soundState === 'warm' ? 'bg-pink-600 text-white' : 'text-white/70 hover:text-white'}`}
                title="Sensual Ambient Music"
              >
                <Music className="w-3.5 h-3.5" />
              </button>
              {soundState && (
                <button
                  onClick={() => toggleSound('stop')}
                  className="p-1.5 rounded text-xs text-rose-300 hover:text-white"
                  title="Mute"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10 text-xs">
              <button 
                onClick={() => setFontSize('sm')} 
                className={`px-1.5 py-0.5 rounded ${fontSize === 'sm' ? 'bg-white/20 font-bold' : 'text-white/60'}`}
              >
                S
              </button>
              <button 
                onClick={() => setFontSize('md')} 
                className={`px-1.5 py-0.5 rounded ${fontSize === 'md' ? 'bg-white/20 font-bold' : 'text-white/60'}`}
              >
                M
              </button>
              <button 
                onClick={() => setFontSize('lg')} 
                className={`px-1.5 py-0.5 rounded ${fontSize === 'lg' ? 'bg-white/20 font-bold' : 'text-white/60'}`}
              >
                L
              </button>
            </div>

            {/* Theme Color Dots */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setTheme('velvet')}
                className={`w-4 h-4 rounded-full bg-[#3b1236] border ${theme === 'velvet' ? 'ring-2 ring-rose-400' : 'border-white/20'}`}
                title="Velvet Noir"
              />
              <button
                onClick={() => setTheme('sepia')}
                className={`w-4 h-4 rounded-full bg-[#523d29] border ${theme === 'sepia' ? 'ring-2 ring-amber-400' : 'border-white/20'}`}
                title="Candlelight Sepia"
              />
              <button
                onClick={() => setTheme('midnight')}
                className={`w-4 h-4 rounded-full bg-[#160d2e] border ${theme === 'midnight' ? 'ring-2 ring-purple-400' : 'border-white/20'}`}
                title="Midnight Star"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-rose-600 text-white transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Story Content Area */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-8 space-y-8">
          
          {/* Cover & Title Banner */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-white leading-snug">
              {story.title}
            </h1>
            {story.subtitle && (
              <p className="text-sm sm:text-base text-rose-300/80 italic font-serif">
                "{story.subtitle}"
              </p>
            )}

            {/* Author details & Direct Contact CTA */}
            <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
              <div className="flex items-center gap-3">
                <img
                  src={story.authorAvatar}
                  alt={story.author}
                  className="w-10 h-10 rounded-full border-2 border-rose-500/50 object-cover"
                />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white">{story.author}</span>
                    {story.authorGender && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                        story.authorGender === 'Female' 
                          ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' 
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {story.authorGender}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50">{story.date}</div>
                </div>
              </div>

              {/* Contact Button */}
              <button
                onClick={() => onOpenContactAuthor({
                  name: story.author,
                  gender: story.authorGender || 'Female',
                  avatar: story.authorAvatar,
                  title: story.title
                })}
                className="px-3 py-1.5 rounded-xl bg-pink-600/30 hover:bg-pink-600 text-pink-200 hover:text-white border border-pink-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Author</span>
              </button>
            </div>
          </div>

          {/* Full Cover Image */}
          <div className="relative rounded-2xl overflow-hidden border border-white/15 max-h-96 shadow-xl">
            <img
              src={story.coverImage}
              alt={story.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>

          {/* Story Body Text */}
          <div className="max-w-2xl mx-auto font-serif">
            <div className={`${fontSizes[fontSize]} whitespace-pre-line text-justify opacity-95 space-y-4`}>
              {story.content}
            </div>

            <div className="my-8 text-center text-rose-400 text-xl font-cinzel">
              ✦ ✦ ✦
            </div>

            {/* In-Story Sponsored Content */}
            <div className="my-6">
              <AdBanner type="native" />
            </div>
          </div>

          {/* Interactive Reactions & Actions Bar */}
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={triggerLoveReaction}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
                  isLiked
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 scale-105'
                    : 'bg-white/10 hover:bg-rose-600/50 text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{(story.likes || 0) + (isLiked ? 1 : 0)} Desires</span>
              </button>

              <button
                onClick={() => onToggleBookmark(story.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isBookmarked
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                <span>{isBookmarked ? 'Saved' : 'Save Story'}</span>
              </button>

              <button
                onClick={() => onOpenContactAuthor({
                  name: story.author,
                  gender: story.authorGender || 'Female',
                  avatar: story.authorAvatar,
                  title: story.title
                })}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-xs text-pink-200 hover:text-white border border-pink-500/30 transition-all"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Secret Note</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Share Story'}</span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="max-w-2xl mx-auto pt-6 border-t border-white/10">
            <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-rose-400" />
              <span>Reader Reactions & Confessions ({comments.length})</span>
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts or reaction on this chapter..."
                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>

            {/* Comment List */}
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex gap-3">
                  <img
                    src={c.avatar}
                    alt={c.author}
                    className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">{c.author}</span>
                        {c.gender && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-rose-200">
                            {c.gender}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/40">{c.time}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed font-serif">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
