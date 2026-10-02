import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  ThumbsUp, 
  MessageSquare, 
  PlusCircle, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  Clock, 
  Flame,
  X,
  Vote
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { realtimeHub } from '../utils/realtimeHub';

const INITIAL_FEEDBACKS = [
  {
    id: 'fb-1',
    title: 'Voice Notes & 1-on-1 Audio Calls in Secret Chat',
    category: 'Audio / Communication',
    author: 'Elena Vance 🇺🇸',
    votes: 142,
    status: 'Planned 🚀',
    description: 'Allow authors and readers to send short romantic voice notes and audio snippets directly inside the live chat.'
  },
  {
    id: 'fb-2',
    title: 'Virtual Roses & Diamond Coin Gifting to Creators',
    category: 'Monetization',
    author: 'Damian Cross 🇬🇧',
    votes: 189,
    status: 'In Development 🛠️',
    description: 'Let readers tip virtual roses, champagne glasses, and diamonds that authors can convert to real revenue.'
  },
  {
    id: 'fb-3',
    title: 'Background Audio Player with Lo-fi Jazz Playlists',
    category: 'Audio / Video',
    author: 'Aria Montgomery 🇧🇩',
    votes: 95,
    status: 'Live in App ✅',
    description: 'Continuous ambient background synthesizer playing rain and velvet jazz pads while reading stories.'
  },
  {
    id: 'fb-4',
    title: 'Offline Reading & PWA Home Screen Installation',
    category: 'Mobile / App',
    author: 'Matteo Rossi 🇮🇹',
    votes: 120,
    status: 'Planned 🚀',
    description: 'Ability to save entire serialized novel chapters offline for reading during flights or without internet.'
  }
];

export default function FeedbackBoard({ userProfile }) {
  const [feedbacks, setFeedbacks] = useState(INITIAL_FEEDBACKS);
  const [votedIds, setVotedIds] = useState(['fb-3']);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('New Feature Idea');
  const [description, setDescription] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Real-time synchronization for community feedbacks
  useEffect(() => {
    const unsub = realtimeHub.onFeedback((newFb) => {
      setFeedbacks(prev => {
        if (prev.some(f => f.id === newFb.id)) return prev;
        return [newFb, ...prev];
      });
    });

    return unsub;
  }, []);

  const handleVote = (id) => {
    if (votedIds.includes(id)) {
      setVotedIds(votedIds.filter(v => v !== id));
      setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, votes: f.votes - 1 } : f));
    } else {
      setVotedIds([...votedIds, id]);
      setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, votes: f.votes + 1 } : f));
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
    }
  };

  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newFb = {
      id: `fb-${Date.now()}`,
      title: title.trim(),
      category: category,
      author: `${userProfile?.name || 'Anonymous'} ${userProfile?.countryFlag || '🇧🇩'}`,
      votes: 1,
      status: 'Under Review ⏳',
      description: description.trim()
    };

    setVotedIds([...votedIds, newFb.id]);
    await realtimeHub.publishFeedback(newFb);

    setTitle('');
    setDescription('');
    setShowSubmitModal(false);

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const categories = ['All', 'New Feature Idea', 'Audio / Communication', 'Monetization', 'Mobile / App'];
  const filteredFeedbacks = activeCategory === 'All'
    ? feedbacks
    : feedbacks.filter(f => f.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-amber-950/70 via-[#2f1038] to-rose-950/70 border border-amber-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Community Wishlist & Future Update Roadmap</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-white">
            Feature Requests & Feedback Portal
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/80 max-w-xl font-light font-serif">
            Tell us what updates, tools, and romance features you want next! Vote on community ideas and watch them get built into the live platform.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Suggest New Feature</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeCategory === c
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-rose-950/30 text-rose-200/70 hover:text-white border border-rose-900/30'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Feedback Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredFeedbacks.map((fb) => {
          const isVoted = votedIds.includes(fb.id);

          return (
            <div
              key={fb.id}
              className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#1c0f26] to-[#14081c] border border-rose-900/40 hover:border-rose-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                    {fb.category}
                  </span>
                  
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    fb.status.includes('Live') 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : fb.status.includes('Development')
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                    {fb.status}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold font-serif text-white leading-snug">
                  {fb.title}
                </h3>

                <p className="text-xs sm:text-sm text-rose-100/75 font-serif leading-relaxed">
                  {fb.description}
                </p>
              </div>

              <div className="pt-3 border-t border-rose-900/30 flex items-center justify-between text-xs">
                <span className="text-rose-200/50">Suggested by {fb.author}</span>

                <button
                  onClick={() => handleVote(fb.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    isVoted
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 border border-rose-800/40'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isVoted ? 'fill-current' : ''}`} />
                  <span>{fb.votes} Upvotes</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggest Feature Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#180e22] border border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold font-cinzel text-white">Suggest an Update / Feature</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-rose-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFeedback} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Feature Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Private Voice Messaging in Chat"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="New Feature Idea">New Feature Idea</option>
                  <option value="Audio / Communication">Audio / Communication</option>
                  <option value="Monetization">Monetization & Tipping</option>
                  <option value="Mobile / App">Mobile & UI Design</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Detailed Explanation *</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe why this update would make the website even more exciting..."
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-serif"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs text-rose-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Submit Wishlist Idea ✦
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
