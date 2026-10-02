import React, { useState } from 'react';
import { 
  MessageSquareHeart, 
  MessageCircle, 
  Heart, 
  Send, 
  PlusCircle, 
  Sparkles,
  ChevronDown,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DiscussionForum({ discussions, onAddDiscussion, onAddReply }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // New topic state
  const [topicTitle, setTopicTitle] = useState('');
  const [topicAuthor, setTopicAuthor] = useState('');
  const [topicCategory, setTopicCategory] = useState('Midnight Confessions');
  const [topicContent, setTopicContent] = useState('');
  
  // New reply state
  const [replyText, setReplyText] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');

  // Local likes tracking
  const [likedTopicIds, setLikedTopicIds] = useState([]);

  const categories = ['All', 'Midnight Confessions', 'Writing & Tropes', 'Book Club & Debates', 'Intimacy & Desires'];

  const filteredDiscussions = activeCategory === 'All' 
    ? discussions 
    : discussions.filter(d => d.category === activeCategory);

  const toggleTopicLike = (id) => {
    if (likedTopicIds.includes(id)) {
      setLikedTopicIds(likedTopicIds.filter(i => i !== id));
    } else {
      setLikedTopicIds([...likedTopicIds, id]);
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.7 }
      });
    }
  };

  const handleCreateTopic = (e) => {
    e.preventDefault();
    if (!topicTitle.trim() || !topicContent.trim()) return;

    const newDisc = {
      id: `disc-${Date.now()}`,
      title: topicTitle.trim(),
      author: topicAuthor.trim() || 'Midnight Dreamer',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      timeAgo: 'Just now',
      category: topicCategory,
      likes: 1,
      repliesCount: 0,
      tags: [topicCategory],
      content: topicContent.trim(),
      replies: []
    };

    onAddDiscussion(newDisc);
    setTopicTitle('');
    setTopicAuthor('');
    setTopicContent('');
    setShowNewTopicForm(false);
  };

  const handleCreateReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTopic) return;

    const reply = {
      id: `rep-${Date.now()}`,
      author: replyAuthor.trim() || 'You (Reader)',
      timeAgo: 'Just now',
      content: replyText.trim()
    };

    onAddReply(selectedTopic.id, reply);
    setReplyText('');
    setReplyAuthor('');
    
    setSelectedTopic({
      ...selectedTopic,
      replies: [...(selectedTopic.replies || []), reply],
      repliesCount: (selectedTopic.repliesCount || 0) + 1
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-[#210d2e] via-[#2d123b] to-[#170a20] border border-rose-900/40 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Midnight Confession Booth & Forum</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-cinzel text-white">
              Whispers in the Dark
            </h2>
            <p className="text-sm text-rose-200/70 max-w-xl font-light">
              Share your deepest late-night thoughts, secret fantasies, book debates, and romantic confessions anonymously or openly.
            </p>
          </div>

          <button
            onClick={() => setShowNewTopicForm(!showNewTopicForm)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 shrink-0 transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start a Confession</span>
          </button>
        </div>
      </div>

      {/* New Topic Creation Form */}
      {showNewTopicForm && (
        <form onSubmit={handleCreateTopic} className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-500/30 shadow-xl space-y-4">
          <h3 className="text-lg font-bold font-cinzel text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Create New Discussion or Confession</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-rose-200/80 mb-1">Topic Title *</label>
              <input
                type="text"
                required
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="e.g., The touch you can never forget..."
                className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3.5 py-2 text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-rose-200/80 mb-1">Your Name / Pseudonym</label>
                <input
                  type="text"
                  value={topicAuthor}
                  onChange={(e) => setTopicAuthor(e.target.value)}
                  placeholder="e.g., Velvet Whisper"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs text-rose-200/80 mb-1">Category</label>
                <select
                  value={topicCategory}
                  onChange={(e) => setTopicCategory(e.target.value)}
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Midnight Confessions">Midnight Confessions</option>
                  <option value="Writing & Tropes">Writing & Tropes</option>
                  <option value="Book Club & Debates">Book Club & Debates</option>
                  <option value="Intimacy & Desires">Intimacy & Desires</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-rose-200/80 mb-1">Details / Thoughts *</label>
            <textarea
              required
              rows={3}
              value={topicContent}
              onChange={(e) => setTopicContent(e.target.value)}
              placeholder="Express your raw thoughts or questions..."
              className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl p-3 text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500 font-serif"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewTopicForm(false)}
              className="px-4 py-2 rounded-xl text-xs text-rose-200/70 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Post Topic
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-rose-950/30 text-rose-200/70 hover:text-white hover:bg-rose-900/30 border border-rose-900/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Discussions List */}
      <div className="space-y-4">
        {filteredDiscussions.map((topic) => {
          const isLiked = likedTopicIds.includes(topic.id);
          const isSelected = selectedTopic?.id === topic.id;

          return (
            <div
              key={topic.id}
              className="rounded-2xl bg-gradient-to-r from-[#1c0f26] to-[#160a20] border border-rose-900/30 p-5 sm:p-6 transition-all hover:border-rose-600/40 shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <img
                    src={topic.authorAvatar}
                    alt={topic.author}
                    className="w-10 h-10 rounded-full object-cover border border-rose-500/40 shrink-0"
                  />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{topic.author}</span>
                      <span className="text-xs text-rose-200/40">• {topic.timeAgo}</span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30 font-medium">
                        {topic.category}
                      </span>
                    </div>

                    <h3 
                      onClick={() => setSelectedTopic(isSelected ? null : topic)}
                      className="text-base sm:text-lg font-bold font-serif text-white hover:text-rose-300 cursor-pointer transition-colors"
                    >
                      {topic.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-rose-100/70 font-serif leading-relaxed line-clamp-3">
                      {topic.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons & stats */}
              <div className="mt-4 pt-3.5 border-t border-rose-900/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleTopicLike(topic.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      isLiked
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-950/40 text-rose-200/80 hover:bg-rose-900/40'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{(topic.likes || 0) + (isLiked ? 1 : 0)} Likes</span>
                  </button>

                  <button
                    onClick={() => setSelectedTopic(isSelected ? null : topic)}
                    className="flex items-center gap-1.5 text-xs text-rose-200/80 hover:text-white px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-pink-400" />
                    <span>{(topic.replies?.length || topic.repliesCount || 0)} Confessions</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedTopic(isSelected ? null : topic)}
                  className="text-xs text-rose-300 hover:text-white font-medium flex items-center gap-1"
                >
                  <span>{isSelected ? 'Hide Thread' : 'Read & Reply'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expanded Replies Thread */}
              {isSelected && (
                <div className="mt-5 pt-4 border-t border-rose-900/40 space-y-4">
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    Community Responses:
                  </h4>

                  {/* Replies List */}
                  <div className="space-y-2.5">
                    {topic.replies && topic.replies.length > 0 ? (
                      topic.replies.map((rep) => (
                        <div key={rep.id} className="p-3 rounded-xl bg-[#120819] border border-rose-900/20 text-xs space-y-1">
                          <div className="flex items-center justify-between text-rose-200/60">
                            <span className="font-semibold text-rose-200">{rep.author}</span>
                            <span className="text-[10px]">{rep.timeAgo}</span>
                          </div>
                          <p className="text-white/80 font-serif leading-relaxed">{rep.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-rose-200/50 italic py-2">
                        No responses yet. Be the first to share your confession!
                      </p>
                    )}
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handleCreateReply} className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyAuthor}
                        onChange={(e) => setReplyAuthor(e.target.value)}
                        placeholder="Your Alias"
                        className="w-1/3 bg-[#12081a] border border-rose-900/40 rounded-xl px-3 py-2 text-xs text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
                      />
                      <input
                        type="text"
                        required
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your secret reply or thought..."
                        className="flex-1 bg-[#12081a] border border-rose-900/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
