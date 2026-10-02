import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Music, 
  Volume2, 
  VolumeX, 
  Flame, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  Send,
  X,
  Upload,
  UserCheck,
  UserPlus,
  Play,
  Pause,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { initialReels } from '../data/mockCommunityData';
import { realtimeHub } from '../utils/realtimeHub';
import { authStore } from '../utils/authStore';

export default function ReelsVideoFeed({ followingAuthors, onToggleFollow, userProfile, onOpenDirectChat, onViewPublicProfile }) {
  const [reels, setReels] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_reels');
    return saved ? JSON.parse(saved) : initialReels;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedReels, setLikedReels] = useState(['reel-1', 'reel-2']);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsMap, setCommentsMap] = useState({
    'reel-1': [
      { id: 1, user: 'Damian Cross', text: 'The atmosphere in this video is pure cinematic velvet 🔥', time: '2h ago' },
      { id: 2, user: 'Aria Montgomery', text: 'Listening to rain while watching this is heavenly ✨', time: '1h ago' }
    ]
  });
  const [commentInput, setCommentInput] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  // Upload Form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadVideoUrl, setUploadVideoUrl] = useState('');
  const [uploadMusic, setUploadMusic] = useState('Velvet Night • Romantic Lo-fi');

  const containerRef = useRef(null);
  const videoRefs = useRef([]);

  // Save reels
  useEffect(() => {
    localStorage.setItem('romancha_v5_reels', JSON.stringify(reels));
  }, [reels]);

  // Real-time Hub listener for newly published reels
  useEffect(() => {
    const unsub = realtimeHub.onReel((incomingReel) => {
      setReels(prev => {
        if (prev.some(r => r.id === incomingReel.id)) return prev;
        return [incomingReel, ...prev];
      });
    });
    return unsub;
  }, []);

  // Control video playback based on active index
  useEffect(() => {
    videoRefs.current.forEach((videoEl, idx) => {
      if (videoEl) {
        if (idx === currentIndex) {
          videoEl.currentTime = 0;
          videoEl.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoEl.pause();
        }
      }
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0); // loop back to first
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Wheel scroll navigation for desktop
  const handleWheel = (e) => {
    if (Math.abs(e.deltaY) > 50) {
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length]);

  const togglePlayPause = () => {
    const currentVid = videoRefs.current[currentIndex];
    if (currentVid) {
      if (currentVid.paused) {
        currentVid.play();
        setIsPlaying(true);
      } else {
        currentVid.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleDoubleTapLike = (reelId) => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 900);
    if (!likedReels.includes(reelId)) {
      setLikedReels([...likedReels, reelId]);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleToggleLike = (reelId) => {
    if (likedReels.includes(reelId)) {
      setLikedReels(likedReels.filter(id => id !== reelId));
    } else {
      setLikedReels([...likedReels, reelId]);
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleShare = (reel) => {
    navigator.clipboard?.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const currentReel = reels[currentIndex];
    const newComment = {
      id: Date.now(),
      user: userProfile?.name || 'You',
      text: commentInput.trim(),
      time: 'Just now'
    };

    setCommentsMap(prev => ({
      ...prev,
      [currentReel.id]: [...(prev[currentReel.id] || []), newComment]
    }));

    setCommentInput('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadVideoUrl(url);
    }
  };

  const handlePublishReel = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadVideoUrl) return;

    const newReel = {
      id: `reel-${Date.now()}`,
      title: uploadTitle.trim(),
      caption: uploadCaption.trim() || uploadTitle.trim(),
      videoUrl: uploadVideoUrl,
      poster: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
      author: userProfile?.name || 'Sophia Valentine',
      authorGender: userProfile?.gender || 'Female',
      authorCountry: userProfile?.country || 'Bangladesh',
      authorCountryFlag: userProfile?.countryFlag || '🇧🇩',
      authorAvatar: userProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      musicName: uploadMusic || 'Original Audio • Velvet Passion',
      likes: 1,
      commentsCount: 0,
      shares: 0,
      views: '1'
    };

    setReels([newReel, ...reels]);
    setCurrentIndex(0);
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadCaption('');
    setUploadVideoUrl('');

    confetti({ particleCount: 50, spread: 80, origin: { y: 0.5 } });
    await realtimeHub.publishReel(newReel);

    // Save uploaded reel reference to user account
    const active = authStore.getCurrentUser();
    if (active && active.email) {
      const existing = active.uploadedReels || [];
      authStore.updateProfile({
        uploadedReels: [newReel.id, ...existing.filter(id => id !== newReel.id)]
      });
    }
  };

  const currentReel = reels[currentIndex] || reels[0];
  const isCurrentLiked = likedReels.includes(currentReel?.id);
  const isAuthorFollowed = followingAuthors ? followingAuthors.includes(currentReel?.author) : false;
  const currentComments = commentsMap[currentReel?.id] || [];

  return (
    <div 
      className="relative w-full h-[calc(100vh-80px)] min-h-[550px] bg-black flex items-center justify-center overflow-hidden select-none"
      onWheel={handleWheel}
    >
      
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
          <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="text-xs font-bold text-white tracking-wide">ROMANCHA REELS</span>
          <span className="text-[10px] text-rose-300">
            {currentIndex + 1} / {reels.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload Reel Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Reel</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/90 transition-all"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main 9:16 Vertical Phone Container (TikTok Style) */}
      <div className="relative w-full max-w-[420px] h-full sm:h-[95%] sm:rounded-3xl overflow-hidden bg-[#100818] shadow-2xl border-0 sm:border border-rose-900/40 flex items-center justify-center">
        
        {/* HTML5 Video Element */}
        <video
          ref={el => videoRefs.current[currentIndex] = el}
          src={currentReel?.videoUrl}
          poster={currentReel?.poster}
          playsInline
          muted={isMuted}
          loop={false}
          onEnded={handleNext} // Auto-play continuous next video on end!
          onClick={togglePlayPause}
          onDoubleClick={() => handleDoubleTapLike(currentReel?.id)}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Big Double-Tap Heart Animation */}
        {heartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
            <Heart className="w-28 h-28 text-rose-500 fill-rose-500 drop-shadow-2xl" />
          </div>
        )}

        {/* Play / Pause Overlay Icon */}
        {!isPlaying && (
          <div 
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer pointer-events-auto"
          >
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <Play className="w-8 h-8 fill-current ml-1 text-rose-400" />
            </div>
          </div>
        )}

        {/* Video Gradient Shadow Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none"></div>

        {/* Right-Side Action Bar (TikTok / Reels Style) */}
        <div className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4">
          
          {/* Author Avatar with Follow Plus */}
          <div className="relative mb-2">
            <img
              src={currentReel?.authorAvatar}
              alt={currentReel?.author}
              onClick={() => {
                if (onViewPublicProfile) {
                  onViewPublicProfile({
                    name: currentReel.author,
                    avatar: currentReel.authorAvatar,
                    gender: currentReel.authorGender,
                    country: currentReel.authorCountry,
                    countryFlag: currentReel.authorCountryFlag,
                    bio: `Creator of "${currentReel.title}" video reel.`,
                    followers: 2800
                  });
                }
              }}
              className="w-11 h-11 rounded-full object-cover border-2 border-rose-500 cursor-pointer hover:scale-105 transition-transform"
              title="View Author Profile"
            />
            {onToggleFollow && !isAuthorFollowed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFollow(currentReel.author);
                }}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow font-bold hover:scale-110 active:scale-95"
                title="Follow Author"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Like Button */}
          <button
            onClick={() => handleToggleLike(currentReel?.id)}
            className="flex flex-col items-center gap-1 group active:scale-125 transition-transform"
          >
            <div className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
              isCurrentLiked 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/50' 
                : 'bg-black/50 text-white hover:bg-black/80'
            }`}>
              <Heart className={`w-6 h-6 ${isCurrentLiked ? 'fill-current text-white' : 'text-white'}`} />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              {(currentReel?.likes + (isCurrentLiked ? 1 : 0)).toLocaleString()}
            </span>
          </button>

          {/* Comments Button */}
          <button
            onClick={() => setShowCommentsModal(true)}
            className="flex flex-col items-center gap-1 group active:scale-110 transition-transform"
          >
            <div className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              {currentComments.length || currentReel?.commentsCount || 0}
            </span>
          </button>

          {/* Direct 1-on-1 Chat with Author */}
          <button
            onClick={() => {
              if (onOpenDirectChat) {
                onOpenDirectChat({
                  id: `author-${currentReel.author.toLowerCase().replace(/\s+/g, '-')}`,
                  name: currentReel.author,
                  avatar: currentReel.authorAvatar,
                  gender: currentReel.authorGender,
                  country: currentReel.authorCountry,
                  countryFlag: currentReel.authorCountryFlag,
                  activity: `Watching reel: ${currentReel.title}`
                });
              }
            }}
            className="flex flex-col items-center gap-1 group active:scale-110 transition-transform"
            title="Chat privately with this creator"
          >
            <div className="p-2.5 rounded-full bg-pink-600/80 backdrop-blur-md text-white hover:bg-pink-600 transition-colors shadow">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-pink-300 drop-shadow">
              Chat 💬
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => handleShare(currentReel)}
            className="flex flex-col items-center gap-1 group active:scale-110 transition-transform"
          >
            <div className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow">
              Share
            </span>
          </button>

          {/* Spinning Audio Vinyl Disc */}
          <div className="mt-1 w-9 h-9 rounded-full bg-gradient-to-tr from-stone-800 to-black p-1 border-2 border-white/20 shadow-lg animate-spin" style={{ animationDuration: '4s' }}>
            <img src={currentReel?.authorAvatar} alt="disc" className="w-full h-full rounded-full object-cover" />
          </div>

        </div>

        {/* Bottom Video Metadata & Author Info */}
        <div className="absolute left-4 right-16 bottom-4 z-20 space-y-2 pointer-events-auto">
          
          {/* Author Name, Tag & Country */}
          <div 
            onClick={() => {
              if (onViewPublicProfile) {
                onViewPublicProfile({
                  name: currentReel.author,
                  avatar: currentReel.authorAvatar,
                  gender: currentReel.authorGender,
                  country: currentReel.authorCountry,
                  countryFlag: currentReel.authorCountryFlag,
                  bio: `Creator of "${currentReel.title}" video reel.`,
                  followers: 2800
                });
              }
            }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 w-fit"
          >
            <span className="text-sm font-bold text-white drop-shadow flex items-center gap-1 font-serif">
              @{currentReel?.author?.toLowerCase().replace(/\s+/g, '_')}
            </span>
            <span>{currentReel?.authorCountryFlag}</span>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-600/80 text-white font-bold">
              {currentReel?.authorGender}
            </span>
          </div>

          {/* Caption & Title */}
          <p className="text-xs sm:text-sm text-white font-serif drop-shadow leading-relaxed line-clamp-2">
            {currentReel?.caption}
          </p>

          {/* Audio Track Marquee */}
          <div className="flex items-center gap-2 text-[11px] text-pink-300 font-mono">
            <Music className="w-3.5 h-3.5 animate-pulse text-amber-300" />
            <span className="truncate max-w-[200px]">{currentReel?.musicName}</span>
          </div>

        </div>

        {/* Desktop Up/Down Navigation Arrows */}
        <div className="hidden lg:flex absolute -right-16 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-white/10 hover:bg-rose-600 text-white disabled:opacity-30 backdrop-blur-md transition-all shadow-lg"
            title="Previous Video (Up Arrow)"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="p-3 rounded-full bg-white/10 hover:bg-rose-600 text-white backdrop-blur-md transition-all shadow-lg"
            title="Next Video (Down Arrow)"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-24 z-50 bg-emerald-600 text-white px-4 py-2 rounded-2xl shadow-2xl text-xs font-bold animate-bounce">
          Link copied to clipboard! 🔗
        </div>
      )}

      {/* Comments Drawer Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-md bg-[#160a20] border-t sm:border border-rose-500/40 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[80vh] flex flex-col space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold font-cinzel text-white">
                  Comments ({currentComments.length})
                </h3>
              </div>
              <button
                onClick={() => setShowCommentsModal(false)}
                className="p-1 rounded-full text-rose-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-72">
              {currentComments.length === 0 ? (
                <div className="py-8 text-center text-xs text-rose-200/50">
                  Be the first to leave a comment on this reel! 🔥
                </div>
              ) : (
                currentComments.map((c) => (
                  <div key={c.id} className="p-3 bg-[#100618] rounded-2xl border border-rose-900/30 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-300">{c.user}</span>
                      <span className="text-rose-200/40 text-[9px]">{c.time}</span>
                    </div>
                    <p className="text-xs text-rose-100 font-serif">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-rose-900/40">
              <input
                type="text"
                required
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-[#100618] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl text-xs font-bold"
              >
                Send
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-[#180e22] border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
              <h3 className="text-lg font-bold font-cinzel text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-rose-400" />
                <span>Upload Romantic Video Reel</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 text-rose-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishReel} className="space-y-3.5">
              
              {/* File upload or URL */}
              <div className="p-4 bg-[#100718] rounded-2xl border-2 border-dashed border-rose-500/40 text-center space-y-2">
                <input
                  type="file"
                  id="reel-file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="reel-file" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-rose-400 mx-auto mb-1 animate-bounce" />
                  <span className="text-xs font-bold text-white block">Select MP4/MOV Video from Device</span>
                  <span className="text-[10px] text-rose-200/50">Vertical 9:16 aspect ratio recommended</span>
                </label>
                {uploadVideoUrl && (
                  <p className="text-xs text-emerald-400 font-bold">✓ Video selected & ready!</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Reel Title *</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Midnight Rain & Whispers"
                  className="w-full bg-[#100718] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Caption & Hashtags</label>
                <textarea
                  rows={2}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Tell your viewers the mood... #Romance #Midnight"
                  className="w-full bg-[#100718] border border-rose-900/50 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Background Audio Track</label>
                <input
                  type="text"
                  value={uploadMusic}
                  onChange={(e) => setUploadMusic(e.target.value)}
                  placeholder="e.g. Velvet Lo-fi Nocturne"
                  className="w-full bg-[#100718] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rose-900/30">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-rose-200/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Publish Reel 🚀
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
