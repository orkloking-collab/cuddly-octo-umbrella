import React, { useState } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Feather, 
  MessageSquareHeart, 
  Sparkles, 
  VolumeX, 
  CloudRain, 
  Music, 
  Bookmark, 
  Menu, 
  X,
  Flame,
  Video,
  Users,
  Trophy,
  Mail,
  Zap
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenWriteModal, 
  bookmarksCount, 
  onOpenBookmarks,
  soundState,
  toggleSound,
  userProfile,
  onOpenProfileModal,
  onOpenAuthModal,
  unreadCount = 0,
  newMatchCount = 0,
  likesCount = 0,
  onOpenPremium,
  isPremium = false
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'discover', label: 'Discover', icon: Heart },
    { id: 'inbox', label: 'Matches', icon: MessageSquareHeart, count: unreadCount + newMatchCount },
    { id: 'likes', label: 'Likes You', icon: Sparkles, count: likesCount },
    { id: 'reels', label: 'Moments', icon: Video },
    { id: 'stories', label: 'Stories', icon: Feather },
    { id: 'chat', label: 'Lounge', icon: Users },
    { id: 'photos', label: 'Visuals', icon: Flame },
    { id: 'leaderboard', label: 'Creator Board', icon: Trophy },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-900/30 bg-[#0f0a15]/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('discover')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 p-0.5 shadow-lg shadow-rose-600/30 group-hover:shadow-rose-500/50 transition-all duration-300">
              <div className="w-full h-full bg-[#140b1c] rounded-[14px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-rose-400 fill-rose-500/30 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-cinzel glow-text">
                  ROMANCHA
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/40 font-semibold tracking-wider hidden sm:inline-block">
                  18+
                </span>
                {userProfile?.countryFlag && (
                  <span className="text-xs sm:text-sm">{userProfile.countryFlag}</span>
                )}
              </div>
              <p className="text-[11px] text-rose-200/60 font-light -mt-0.5 hidden md:block tracking-wide">
                Verified dating · Real conversations · 18+
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1 bg-rose-950/30 p-1.5 rounded-full border border-rose-900/40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-rose-100/70 hover:text-white hover:bg-rose-900/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <span className="ml-0.5 min-w-[16px] rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Ambient Sound Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Ambient Sound Trigger */}
            <div className="hidden lg:flex items-center bg-rose-950/40 border border-rose-800/40 rounded-full p-1">
              <button
                onClick={() => toggleSound('rain')}
                title="Rain on Penthouse Window"
                className={`p-1.5 rounded-full text-xs flex items-center gap-1 transition-all ${
                  soundState === 'rain'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-rose-200/70 hover:text-white hover:bg-rose-900/40'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium pr-1">Rain</span>
              </button>
              <button
                onClick={() => toggleSound('warm')}
                title="Velvet Ambient Pad"
                className={`p-1.5 rounded-full text-xs flex items-center gap-1 transition-all ${
                  soundState === 'warm'
                    ? 'bg-pink-600 text-white shadow'
                    : 'text-rose-200/70 hover:text-white hover:bg-rose-900/40'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium pr-1">Velvet</span>
              </button>
              {soundState && (
                <button
                  onClick={() => toggleSound('stop')}
                  title="Mute Sound"
                  className="p-1 text-rose-300 hover:text-white"
                >
                  <VolumeX className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Matches inbox shortcut with live unread pressure */}
            <button
              onClick={() => setActiveTab('inbox')}
              className="relative p-2 rounded-full text-rose-200/80 hover:text-white hover:bg-rose-900/40 transition-all"
              title={`Matches inbox (${unreadCount} unread)`}
              aria-label={`Open matches inbox, ${unreadCount} unread`}
            >
              <Mail className="w-4 h-4 text-pink-300" />
              {unreadCount + newMatchCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-[17px] rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-[17px] text-white">
                  {unreadCount + newMatchCount}
                </span>
              ) : (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f0a15]"></span>
              )}
            </button>

            {/* Gold upsell / status */}
            <button
              onClick={onOpenPremium}
              title={isPremium ? 'Gold active' : 'See who liked you'}
              className={`hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition ${
                isPremium
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-gradient-to-r from-amber-400 to-rose-500 text-white hover:brightness-110'
              }`}
            >
              <Zap className="w-3 h-3" />
              {isPremium ? 'GOLD' : likesCount > 0 ? `${likesCount} LIKES` : 'GOLD'}
            </button>

            {/* Bookmarks */}
            <button
              onClick={onOpenBookmarks}
              className="relative p-2 rounded-full text-rose-200/80 hover:text-white hover:bg-rose-900/40 transition-all"
              title="Saved Stories"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarksCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {bookmarksCount}
                </span>
              )}
            </button>

            {/* Publish Story CTA Button */}
            <button
              onClick={onOpenWriteModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-semibold text-xs bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white shadow-lg shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>

            {/* Author Profile / Auth Button */}
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 p-1 pl-2 pr-2.5 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 transition-all"
              title="Your Author ID & Profile"
            >
              <img
                src={userProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt="Profile"
                className="w-7 h-7 rounded-xl object-cover border border-rose-500/50"
              />
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white truncate max-w-[85px]">
                    {userProfile?.name?.split(' ')[0] || 'Profile'}
                  </span>
                  <span className="text-xs">{userProfile?.countryFlag}</span>
                </div>
                <div className="text-[9px] text-pink-300 font-medium">
                  {userProfile?.gender || 'Female'} ID
                </div>
              </div>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-rose-200 hover:text-white hover:bg-rose-900/40 border border-rose-900/30"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-rose-900/40 bg-[#140b1c] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-950/30 text-rose-200/80 hover:bg-rose-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[8px] bg-amber-400 text-black font-bold px-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-rose-900/30 text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="text-pink-300 font-semibold underline flex items-center gap-1"
            >
              <span>Login / Account DB</span>
            </button>
            
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenWriteModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
