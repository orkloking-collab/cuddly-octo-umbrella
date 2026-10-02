import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  Mail, 
  Sparkles, 
  Globe, 
  ShieldCheck, 
  Feather, 
  Video, 
  UserPlus, 
  UserCheck, 
  MapPin, 
  Flame,
  MessageCircle,
  Share2,
  ExternalLink,
  BookOpen,
  Camera,
  Play,
  Gift,
  Clock,
  Eye,
  Link as LinkIcon
} from 'lucide-react';
import { InstagramIcon, TwitterIcon, WebsiteIcon } from './SocialIcons';
import confetti from 'canvas-confetti';

export default function PublicUserProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  isFollowing, 
  onToggleFollow, 
  onOpenDirectChat, 
  onReadStory,
  onPlayReel,
  allStories = [],
  allReels = [],
  allPhotos = []
}) {
  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'stories' | 'reels' | 'photos'
  const [sentGiftAlert, setSentGiftAlert] = useState(null);

  if (!isOpen || !user) return null;

  const handleFollowClick = () => {
    if (onToggleFollow) {
      onToggleFollow(user.name);
      if (!isFollowing) {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleChatClick = () => {
    onClose();
    if (onOpenDirectChat) {
      onOpenDirectChat(user);
    }
  };

  const handleSendGift = (giftName, giftIcon) => {
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.6 }
    });
    setSentGiftAlert(`You sent a ${giftIcon} ${giftName} to ${user.name}!`);
    setTimeout(() => setSentGiftAlert(null), 3000);
  };

  // Dynamically filter stories, reels, and photos authored by this person in real-time
  const authorStories = allStories.filter(s => 
    s.author?.toLowerCase() === user.name?.toLowerCase() || 
    s.authorId === user.id
  );

  const authorReels = allReels.filter(r => 
    r.author?.toLowerCase() === user.name?.toLowerCase() || 
    r.authorId === user.id
  );

  const authorPhotos = allPhotos.filter(p => 
    p.author?.toLowerCase() === user.name?.toLowerCase() || 
    p.authorId === user.id
  );

  const hasSocialLinks = user.socialLinks && (
    user.socialLinks.instagram || 
    user.socialLinks.twitter || 
    user.socialLinks.website
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      
      {/* Backdrop click to close */}
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-2xl bg-[#170a22] border-2 border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Cover Banner */}
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-rose-900 via-[#3a1240] to-purple-950 overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-black/70"></div>
          
          {/* Close Button - Big & Always Visible */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2.5 rounded-full bg-black/70 hover:bg-rose-600 text-white border border-white/20 transition-all z-30 cursor-pointer shadow-xl hover:scale-110 active:scale-95"
            title="Close Profile (Escape)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Live Online & Verified Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 text-[11px] text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online Now</span>
            </span>

            <span className="px-3 py-1 rounded-full bg-rose-600/90 text-white font-bold text-[11px] shadow border border-rose-400/40">
              {user.isVip ? '👑 VIP Creator' : 'Verified Author'}
            </span>
          </div>
        </div>

        {/* Profile Header (Avatar, Name, Actions) */}
        <div className="relative px-5 sm:px-8 pt-0 pb-3 shrink-0 bg-[#170a22]">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-14 sm:-mt-16">
            
            {/* Avatar & Flag */}
            <div className="flex items-end gap-3.5">
              <div className="relative">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-[#170a22] shadow-2xl"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#170a22]" title="Live Active"></span>
              </div>

              <div className="space-y-0.5 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white leading-tight">
                    {user.name}
                  </h2>
                  <span className="text-xl">{user.countryFlag}</span>
                </div>
                <p className="text-xs font-mono text-pink-400">
                  {user.username || `@${user.name?.toLowerCase().replace(/\s+/g, '_')}`}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-rose-200/70">
                  <span className={`px-2 py-0.2 rounded-full font-bold border ${
                    user.gender === 'Female' 
                      ? 'bg-pink-600/30 text-pink-300 border-pink-500/40' 
                      : 'bg-rose-600/30 text-rose-300 border-rose-500/40'
                  }`}>
                    {user.gender || 'Female'} {user.age ? `• ${user.age}y` : ''}
                  </span>
                  <span>•</span>
                  <span>{user.country || 'International'}</span>
                </div>
              </div>
            </div>

            {/* Actions: Follow + 1-on-1 Chat */}
            <div className="flex items-center gap-2 self-start sm:self-end pt-2 sm:pt-0">
              <button
                onClick={handleFollowClick}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isFollowing
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50 hover:bg-red-950'
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white shadow-rose-900/40'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>+ Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={handleChatClick}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-900/40 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>Message 💬 (Photos/Videos)</span>
              </button>
            </div>

          </div>

          {/* Real-time Profile Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-rose-900/40 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('about')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'about'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white/5 text-rose-200/70 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>About & Links</span>
            </button>

            <button
              onClick={() => setActiveTab('stories')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'stories'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white/5 text-rose-200/70 hover:text-white'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Published Stories ({authorStories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'reels'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white/5 text-rose-200/70 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-rose-400" />
              <span>Video Reels ({authorReels.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('photos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'photos'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white/5 text-rose-200/70 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-pink-400" />
              <span>Photo Moments ({authorPhotos.length})</span>
            </button>
          </div>

        </div>

        {/* Tab Content Stream (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 space-y-4 bg-[#14081c]/70">
          
          {/* Sent Gift Notification Toast */}
          {sentGiftAlert && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold text-center shadow-xl animate-bounce">
              {sentGiftAlert}
            </div>
          )}

          {/* TAB 1: ABOUT & SOCIAL LINKS */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              
              {/* Bio Card */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold font-cinzel text-rose-200/90 tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>About & Romance Desires</span>
                </h4>
                <p className="text-xs sm:text-sm text-rose-100 font-serif leading-relaxed bg-[#190d24] p-4 rounded-2xl border border-rose-900/40">
                  {user.bio || 'Passionate author creating late-night romance stories, dark thrillers, and heartfelt poetry.'}
                </p>
              </div>

              {/* Social Links & External URLs Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-cinzel text-rose-200/90 tracking-wider uppercase flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-pink-400" />
                    <span>Social Links & Creator Channels</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">● Real-time synced</span>
                </div>

                {hasSocialLinks ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {user.socialLinks.instagram && (
                      <a
                        href={user.socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-pink-950/40 to-rose-950/30 hover:from-pink-900/60 hover:to-rose-900/50 border border-pink-500/40 text-pink-300 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-pink-500/20 rounded-xl group-hover:scale-110 transition-transform">
                            <InstagramIcon className="w-4 h-4 text-pink-400" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">Instagram</span>
                            <span className="text-[10px] text-rose-300/60 truncate max-w-[100px] block">View Profile</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </a>
                    )}

                    {user.socialLinks.twitter && (
                      <a
                        href={user.socialLinks.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-sky-950/40 to-blue-950/30 hover:from-sky-900/60 hover:to-blue-900/50 border border-sky-500/40 text-sky-300 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-sky-500/20 rounded-xl group-hover:scale-110 transition-transform">
                            <TwitterIcon className="w-4 h-4 text-sky-400" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">Twitter / X</span>
                            <span className="text-[10px] text-sky-300/60 truncate max-w-[100px] block">Follow Feed</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </a>
                    )}

                    {user.socialLinks.website && (
                      <a
                        href={user.socialLinks.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/30 hover:from-emerald-900/60 hover:to-teal-900/50 border border-emerald-500/40 text-emerald-300 hover:text-white transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                            <WebsiteIcon className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-xs font-bold block">Website / Blog</span>
                            <span className="text-[10px] text-emerald-300/60 truncate max-w-[100px] block">Visit Site</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#190d24] border border-rose-900/30 text-center text-xs text-rose-200/50">
                    No external social links attached yet. Links added by this author will appear here in real time.
                  </div>
                )}
              </div>

              {/* Creator Stats */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#190d24] rounded-2xl border border-rose-900/40 text-center">
                <div>
                  <span className="text-lg font-bold font-cinzel text-white block">
                    {(user.followers || 2450).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-rose-200/60 uppercase">Fans / Followers</span>
                </div>
                <div>
                  <span className="text-lg font-bold font-cinzel text-white block">
                    {authorStories.length} Stories • {authorReels.length} Reels
                  </span>
                  <span className="text-[10px] text-rose-200/60 uppercase">Content Published</span>
                </div>
                <div>
                  <span className="text-lg font-bold font-cinzel text-pink-400 block">
                    99% Match
                  </span>
                  <span className="text-[10px] text-rose-200/60 uppercase">Romance Score</span>
                </div>
              </div>

              {/* Virtual Dating Gifts Sending Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#200e2b] to-[#160a20] border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-pink-400" />
                    <span>Send Virtual Dating Gift to {user.name}:</span>
                  </span>
                  <span className="text-[10px] text-pink-300">Boosts popularity</span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { name: 'Red Rose', icon: '🌹', desc: '+10 Desires' },
                    { name: 'Champagne', icon: '🍾', desc: '+25 Spark' },
                    { name: 'Diamond Ring', icon: '💎', desc: '+100 Love' },
                    { name: 'Chocolates', icon: '🍫', desc: '+15 Sweet' }
                  ].map((g) => (
                    <button
                      key={g.name}
                      onClick={() => handleSendGift(g.name, g.icon)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-600/80 text-center transition-all hover:scale-105 active:scale-95 group border border-white/5"
                    >
                      <span className="text-2xl block mb-0.5 group-hover:scale-110 transition-transform">{g.icon}</span>
                      <span className="text-[11px] font-bold text-white block truncate">{g.name}</span>
                      <span className="text-[9px] text-rose-300/70 block">{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PUBLISHED STORIES (Updated in Real-Time) */}
          {activeTab === 'stories' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-rose-200/70">
                <span>All stories authored by <strong>{user.name}</strong></span>
                <span className="text-emerald-400 font-mono">● Real-time updated</span>
              </div>

              {authorStories.length === 0 ? (
                <div className="py-12 text-center bg-[#190d24] rounded-2xl border border-rose-900/30 p-6 space-y-2">
                  <Feather className="w-8 h-8 text-rose-400/60 mx-auto" />
                  <p className="text-xs text-rose-200/70 font-serif">
                    {user.name} has not published stories yet. When they publish, it will appear here in real time!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {authorStories.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => {
                        onClose();
                        if (onReadStory) onReadStory(story);
                      }}
                      className="group p-3 rounded-2xl bg-[#190d24] hover:bg-[#231233] border border-rose-900/40 hover:border-rose-500/50 transition-all cursor-pointer flex gap-3 shadow-md"
                    >
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-16 h-20 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-600/40 text-pink-300 uppercase">
                            {story.category}
                          </span>
                          <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors line-clamp-2 mt-1 font-serif">
                            {story.title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-rose-200/50 pt-1">
                          <span>{story.readTime || '6 min read'}</span>
                          <span className="text-pink-400 font-semibold flex items-center gap-0.5">
                            <BookOpen className="w-3 h-3" /> Read Now →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPLOADED VIDEO REELS (Updated in Real-Time) */}
          {activeTab === 'reels' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-rose-200/70">
                <span>Romantic video reels created by <strong>{user.name}</strong></span>
                <span className="text-emerald-400 font-mono">● Real-time synced</span>
              </div>

              {authorReels.length === 0 ? (
                <div className="py-12 text-center bg-[#190d24] rounded-2xl border border-rose-900/30 p-6 space-y-2">
                  <Video className="w-8 h-8 text-rose-400/60 mx-auto" />
                  <p className="text-xs text-rose-200/70 font-serif">
                    {user.name} hasn't uploaded video reels yet. New uploads will show up here live!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {authorReels.map((reel) => (
                    <div
                      key={reel.id}
                      onClick={() => {
                        onClose();
                        if (onPlayReel) onPlayReel(reel);
                      }}
                      className="group relative rounded-2xl overflow-hidden aspect-[9/14] bg-black border border-rose-900/40 hover:border-rose-500/60 shadow-lg cursor-pointer"
                    >
                      <video
                        src={reel.videoUrl}
                        poster={reel.poster}
                        muted
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2.5">
                        <div className="self-end p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                          <Play className="w-3.5 h-3.5 fill-current text-rose-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white line-clamp-1 font-serif drop-shadow">
                            {reel.title}
                          </p>
                          <span className="text-[9px] text-pink-300 font-mono">
                            {(reel.likes || 1200).toLocaleString()} Likes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PHOTO MOMENTS */}
          {activeTab === 'photos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-rose-200/70">
                <span>Visual photography by <strong>{user.name}</strong></span>
                <span className="text-emerald-400 font-mono">● Live Gallery</span>
              </div>

              {authorPhotos.length === 0 ? (
                <div className="py-12 text-center bg-[#190d24] rounded-2xl border border-rose-900/30 p-6 space-y-2">
                  <Camera className="w-8 h-8 text-rose-400/60 mx-auto" />
                  <p className="text-xs text-rose-200/70 font-serif">
                    No visual photos uploaded yet by {user.name}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {authorPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-2xl overflow-hidden aspect-square bg-[#190d24] border border-rose-900/40 shadow-md"
                    >
                      <img
                        src={photo.image}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex items-end">
                        <p className="text-[10px] font-bold text-white truncate font-serif">
                          {photo.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 bg-[#110619] border-t border-rose-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-rose-200/70 truncate hidden sm:block">
            Want to start an intimate conversation with <strong>{user.name}</strong>?
          </div>

          <button
            onClick={handleChatClick}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 text-white rounded-xl text-xs font-bold shadow-xl shadow-rose-900/50 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Mail className="w-4 h-4" />
            <span>Open 1-on-1 Secret Chat (Photos & Videos)</span>
          </button>
        </div>

      </div>

    </div>
  );
}
