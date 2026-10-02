import React, { useMemo, useState } from 'react'
import { Heart, Sparkles, Mail, UserPlus, UserCheck, User } from 'lucide-react'
import confetti from 'canvas-confetti';
import { onlineUsers } from '../data/mockCommunityData'
import { InstagramIcon, TwitterIcon, WebsiteIcon } from './SocialIcons'
import { useDating } from '../utils/useDating'

const LABEL = { Woman: 'Female', Man: 'Male', 'Non-binary': 'Trans/Non-binary' };

/** Radar rows are the same people as the deck, so "Send love" is a real like. */
function toRadarCard(c) {
  return {
    ...c,
    avatar: c.photos?.[0] || '',
    gender: LABEL[c.gender] || c.gender,
    genderRaw: c.gender,
    countryFlag: c.countryFlag,
    status: c.online ? 'Online Now' : `Active ${c.lastActiveMins}m ago`,
    activity: c.job,
    bio: c.bio,
    isVip: Boolean(c.verified),
    compatibility: c.match?.score,
    followers: 0,
    username: c.handle,
    socialLinks: { instagram: '', twitter: '', website: '' },
    isDatingProfile: true,
  };
}
export default function LiveOnlineLoveMatch({ 
  onOpenDirectChat, 
  _userProfile, 
  _onOpenContactAuthor, 
  followingAuthors, 
  onToggleFollow,
  onViewPublicProfile
}) {
  const { store, state } = useDating();
  const [filterGender, setFilterGender] = useState('All'); // 'All', 'Female', 'Male'
  const [lovedUserIds, setLovedUserIds] = useState(() =>
    Object.entries(store.getState().decisions).filter(([, k]) => k === 'like' || k === 'super').map(([id]) => id),
  );
  const [matchFlash, setMatchFlash] = useState(null);

  const users = useMemo(() => {
    const radar = store.deck({ limit: 12 }).map(toRadarCard);
    const seen = new Set(radar.map((u) => u.name));
    return [...radar, ...onlineUsers.filter((u) => !seen.has(u.name))];
    // `state` is the store snapshot: any swipe/blocked change re-derives this list.
  }, [store, state]);

  const handleSendLove = (user) => {
    if (user.isDatingProfile) {
      const res = store.swipe(user.id, 'like');
      if (!res.ok && res.reason === 'out-of-likes') {
        setMatchFlash({ kind: 'warn', text: 'Daily like limit reached — passes are still free. Gold removes the cap.' });
        setTimeout(() => setMatchFlash(null), 4000);
        return;
      }
      setLovedUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 }, colors: ['#f43f5e', '#ec4899', '#fb7185'] });
      if (res.matched) {
        setMatchFlash({ kind: 'match', text: `You and ${user.name.split(' ')[0]} matched — open the inbox to say something.` });
        setTimeout(() => onOpenDirectChat?.({ ...user, datingId: user.id }), 900);
      } else {
        setMatchFlash({ kind: 'sent', text: `Like sent to ${user.name.split(' ')[0]}. If they like you back, the chat opens.` });
        setTimeout(() => setMatchFlash(null), 4000);
      }
      return;
    }

    if (!lovedUserIds.includes(user.id)) {
      setLovedUserIds([...lovedUserIds, user.id]);
      
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#f59e0b']
      });

      // Show match modal or trigger chat
      setTimeout(() => {
        if (onOpenDirectChat) {
          onOpenDirectChat(user);
        }
      }, 700);
    } else {
      // Already loved -> Open chat directly
      if (onOpenDirectChat) {
        onOpenDirectChat(user);
      }
    }
  };

  const filteredUsers = filterGender === 'All'
    ? users
    : users.filter(u => u.gender === filterGender);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-rose-950/80 via-[#2f1038] to-purple-950/80 border border-rose-500/30 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Romance Radar & Speed Dating</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-white leading-tight">
              Real Online Members & Love Matches
            </h1>
            
            <p className="text-xs sm:text-sm text-rose-100/80 max-w-xl font-light leading-relaxed font-serif">
              See who is online right now in real-time. Click any creator to view their <strong>Full Profile & Bio</strong>, or <strong>Send Love 💖</strong> to match and send text, photos & videos!
            </p>
          </div>

          {/* Quick Gender Filter Pills */}
          <div className="flex bg-[#14081c] p-1.5 rounded-2xl border border-rose-900/40 shrink-0 self-start md:self-center">
            {['All', 'Female', 'Male'].map((g) => (
              <button
                key={g}
                onClick={() => setFilterGender(g)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filterGender === g
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                    : 'text-rose-200/70 hover:text-white'
                }`}
              >
                {g === 'All' ? '⚡ All Online' : g === 'Female' ? '🌸 Women' : '🔥 Men'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Online Count Radar Alert Bar */}
      <div className="p-4 rounded-2xl bg-[#170e22] border border-rose-900/40 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-emerald-500/30 animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          </div>
          <span className="text-white font-medium">
            <strong className="text-emerald-400 font-bold">{filteredUsers.length} Romance Creators</strong> currently active on Romancha Radar
          </span>
        </div>

        <span className="text-[11px] text-pink-300 font-serif italic hidden sm:block">
          Tap card or name to view full bio, socials & stories
        </span>
      </div>

      {matchFlash && (
        <div className={`mx-auto max-w-6xl rounded-2xl border px-4 py-2.5 text-center text-[13px] font-semibold ${
          matchFlash.kind === 'match' ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200'
            : matchFlash.kind === 'warn' ? 'border-amber-400/40 bg-amber-500/12 text-amber-200'
              : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
        }`} role="status">
          {matchFlash.text}
        </div>
      )}

      {/* Online Users Romance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredUsers.map((user) => {
          const isLoved = lovedUserIds.includes(user.id);
          const isFollowed = followingAuthors ? followingAuthors.includes(user.name) : false;

          return (
            <div
              key={user.id}
              className={`group relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#1d0e28] to-[#120718] border transition-all duration-300 flex flex-col justify-between shadow-xl ${
                isLoved
                  ? 'border-pink-500/60 ring-2 ring-pink-500/30 shadow-rose-950/70'
                  : 'border-rose-900/40 hover:border-rose-500/50 hover:shadow-2xl'
              }`}
            >
              {/* Photo & Live Tag */}
              <div 
                className="relative h-64 overflow-hidden cursor-pointer"
                onClick={() => {
                  if (onViewPublicProfile) onViewPublicProfile(user);
                }}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1d0e28] via-transparent to-black/30"></div>

                {/* Live Online Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/40 text-[10px] text-emerald-300 font-semibold shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{user.status}</span>
                </div>

                {/* Country Flag Badge */}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs text-white font-bold flex items-center gap-1">
                  <span>{user.countryFlag}</span>
                  <span className="text-[10px] text-rose-200">{user.country.slice(0, 3)}</span>
                </div>

                {/* Gender Tag & VIP */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    user.gender === 'Female' 
                      ? 'bg-pink-600/90 text-white border-pink-400/40' 
                      : 'bg-rose-600/90 text-white border-rose-400/40'
                  }`}>
                    {user.gender} • {user.age}y
                  </span>

                  {user.isVip && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/90 text-black font-bold uppercase tracking-wider">
                      VIP Author
                    </span>
                  )}
                </div>

                {/* Follow Quick Button on Top right corner of image */}
                {onToggleFollow && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFollow(user.name);
                    }}
                    className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md transition-all ${
                      isFollowed
                        ? 'bg-rose-600 text-white border border-rose-400/40'
                        : 'bg-black/70 text-rose-200 hover:text-white border border-white/20 hover:bg-rose-900/80'
                    }`}
                  >
                    {isFollowed ? (
                      <>
                        <UserCheck className="w-3 h-3 text-pink-200" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 text-pink-300" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                <div>
                  <div 
                    onClick={() => {
                      if (onViewPublicProfile) onViewPublicProfile(user);
                    }}
                    className="flex items-center justify-between cursor-pointer group/title"
                  >
                    <h3 className="text-base font-bold font-serif text-white group-hover/title:text-rose-300 transition-colors">
                      {user.name}
                    </h3>
                    <span className="text-xs text-rose-300/70">{user.username}</span>
                  </div>

                  {/* Current Activity */}
                  <p className="text-[11px] text-pink-300/90 font-medium italic mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                    <span className="truncate">{user.activity}</span>
                  </p>

                  {/* Bio */}
                  <p className="text-xs text-rose-100/70 mt-2 font-serif line-clamp-2 leading-relaxed">
                    {user.bio}
                  </p>

                  {/* Social Links if available */}
                  {user.socialLinks && (
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-rose-900/30">
                      {user.socialLinks.instagram && (
                        <a
                          href={user.socialLinks.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/25 transition-colors"
                          title="Instagram"
                        >
                          <InstagramIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {user.socialLinks.twitter && (
                        <a
                          href={user.socialLinks.twitter}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/25 transition-colors"
                          title="Twitter"
                        >
                          <TwitterIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {user.socialLinks.website && (
                        <a
                          href={user.socialLinks.website}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                          title="Portfolio Website"
                        >
                          <WebsiteIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className="text-[10px] text-rose-300/50 ml-auto font-mono">
                        {user.isDatingProfile
                          ? `${user.compatibility ?? 0}% match`
                          : `${(user.followers ?? 0).toLocaleString()} Fans`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Send Love / Chat Now */}
                <div className="pt-2 border-t border-rose-900/40 space-y-2">
                  <button
                    onClick={() => handleSendLove(user)}
                    className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                      isLoved
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/30'
                        : 'bg-rose-950/60 hover:bg-gradient-to-r hover:from-rose-600 hover:to-pink-600 text-rose-200 hover:text-white border border-rose-600/40'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLoved ? 'fill-current text-white animate-bounce' : 'text-rose-400'}`} />
                    <span>{isLoved ? 'Matched! 1-on-1 Chat 💬' : 'Send Love 💖 & Match'}</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-rose-200/60 px-1">
                    <button
                      onClick={() => {
                        if (onViewPublicProfile) onViewPublicProfile(user);
                      }}
                      className="text-rose-300 hover:text-white hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <User className="w-3 h-3" />
                      <span>View Bio & About</span>
                    </button>
                    
                    <button
                      onClick={() => onOpenDirectChat(user)}
                      className="text-pink-300 hover:text-white hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Direct DM</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
