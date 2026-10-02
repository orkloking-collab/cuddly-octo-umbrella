import React, { useState } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Heart, 
  Users, 
  BookOpen, 
  DollarSign, 
  Sparkles, 
  Check, 
  Plus, 
  ArrowUpRight 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { leaderboardCreators } from '../data/mockCommunityData';

export default function LeaderboardView({ followingAuthors, onToggleFollow, onReadStory, stories }) {
  const [creators, setCreators] = useState(leaderboardCreators);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">👑 #1 VIP Queen</span>;
    if (rank === 2) return <span className="p-2 rounded-xl bg-slate-300/20 text-slate-200 border border-slate-400/40 text-xs font-bold flex items-center gap-1">🥈 #2 Velvet King</span>;
    if (rank === 3) return <span className="p-2 rounded-xl bg-amber-700/20 text-amber-400 border border-amber-700/40 text-xs font-bold flex items-center gap-1">🥉 #3 Passion Star</span>;
    return <span className="p-2 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-900/40 text-xs font-bold">#{rank} Ranked</span>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-amber-950/60 via-[#2f1038] to-purple-950/60 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Live Hall of Fame & Top Romance Creators</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-white">
            Romancha Creator Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-rose-200/70 font-light max-w-xl">
            Real-time rankings based on reader desires, followers, published chapters, and creator monetization payouts.
          </p>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {creators.slice(0, 3).map((c, i) => {
          const isFollowed = followingAuthors.includes(c.name);

          return (
            <div
              key={c.rank}
              className={`relative rounded-3xl p-6 bg-gradient-to-b from-[#1e102a] to-[#14081c] border transition-all duration-300 flex flex-col justify-between shadow-xl ${
                c.rank === 1 
                  ? 'border-amber-500/60 ring-2 ring-amber-500/30 md:-translate-y-3' 
                  : 'border-rose-900/40'
              }`}
            >
              {/* Crown / Rank icon */}
              <div className="flex items-center justify-between mb-4">
                {getRankBadge(c.rank)}
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{c.monthlyEarned} /mo</span>
                </span>
              </div>

              {/* Creator details */}
              <div className="flex flex-col items-center text-center space-y-2.5 my-2">
                <div className="relative">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-rose-500 shadow-xl"
                  />
                  <span className="absolute -top-2 -right-2 text-xl drop-shadow">{c.countryFlag}</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold font-serif text-white">{c.name}</h3>
                  <div className="flex items-center justify-center gap-2 text-xs text-rose-200/60">
                    <span>{c.username}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      c.gender === 'Female' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      {c.gender}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full pt-3 border-t border-rose-900/30 text-xs">
                  <div className="p-2 rounded-xl bg-[#120718] border border-rose-900/30">
                    <div className="text-rose-400 font-bold">{c.totalDesires}</div>
                    <div className="text-[10px] text-rose-200/50">Total Desires</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#120718] border border-rose-900/30">
                    <div className="text-pink-300 font-bold">{c.followers.toLocaleString()}</div>
                    <div className="text-[10px] text-rose-200/50">Followers</div>
                  </div>
                </div>
              </div>

              {/* Follow Button */}
              <button
                onClick={() => onToggleFollow(c.name)}
                className={`w-full mt-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isFollowed
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg'
                }`}
              >
                {isFollowed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isFollowed ? 'Following Author' : 'Follow Author'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="rounded-3xl bg-[#180e22] border border-rose-900/40 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-rose-900/40 flex items-center justify-between">
          <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Complete Global Creator Ranking</span>
          </h3>
          <span className="text-xs text-rose-200/50">Updated in real-time</span>
        </div>

        <div className="divide-y divide-rose-900/30">
          {creators.map((c) => {
            const isFollowed = followingAuthors.includes(c.name);

            return (
              <div
                key={c.rank}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="w-7 text-center font-cinzel font-bold text-sm text-rose-300">
                    #{c.rank}
                  </span>

                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-12 h-12 rounded-xl object-cover border border-rose-500/40 shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold font-serif text-white truncate">{c.name}</span>
                      <span className="text-xs">{c.countryFlag} {c.country}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                        c.gender === 'Female' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {c.gender}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-rose-200/60 mt-0.5">
                      <span>{c.publishedStories} Stories Published</span>
                      <span>•</span>
                      <span className="text-rose-300 font-semibold">{c.totalDesires} Desires</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-bold text-emerald-400">{c.monthlyEarned}</div>
                    <div className="text-[10px] text-rose-200/40">Est. Creator Pay</div>
                  </div>

                  <button
                    onClick={() => onToggleFollow(c.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isFollowed
                        ? 'bg-white/10 text-rose-200'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                    }`}
                  >
                    {isFollowed ? 'Following' : '+ Follow'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
