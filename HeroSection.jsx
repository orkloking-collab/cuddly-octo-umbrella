import React from 'react';
import { Sparkles, BookOpen, Heart, Search, TrendingUp, Flame, ArrowRight, ShieldCheck } from 'lucide-react';

export default function HeroSection({ 
  selectedCategory, 
  setSelectedCategory, 
  searchQuery, 
  setSearchQuery,
  featuredStory,
  onReadStory,
  onOpenWriteModal
}) {
  const categories = [
    { id: 'All', label: 'All Stories' },
    { id: 'Sensual Romance', label: '🔥 Sensual Romance' },
    { id: 'Romantic Thriller', label: '⚡ Romantic Thriller' },
    { id: 'Dark Romance', label: '🖤 Dark Romance' },
    { id: 'Passionate Escapade', label: '🌴 Passionate Escapade' },
    { id: 'Workplace Desire', label: '💼 Workplace Desire' },
  ];

  return (
    <div className="relative overflow-hidden pt-6 pb-12">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-24 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Tagline */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-5 shadow-inner">
            <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-500/40" />
            <span>Uncensored Passion, Midnight Desires & Romantic Thrillers</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-cinzel tracking-tight text-white leading-tight">
            Where Every Touch <br />
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent font-serif">
              Ignites the Imagination
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-rose-100/75 max-w-2xl font-light leading-relaxed">
            Discover a curated collection of steamy adult romance novels, heart-pounding romantic thrillers, high-aesthetic photo tales, and unfiltered midnight confessions.
          </p>

          {/* Search Bar & Write CTA */}
          <div className="mt-7 w-full max-w-xl flex items-center gap-2 bg-[#1a0f24]/90 p-1.5 rounded-2xl border border-rose-500/30 shadow-xl shadow-rose-950/50 backdrop-blur-lg">
            <div className="relative flex-1 flex items-center pl-3">
              <Search className="w-4 h-4 text-rose-400/80 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stories, authors, tropes or moods..."
                className="w-full bg-transparent text-sm text-white placeholder-rose-200/40 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-rose-300/70 hover:text-white px-2 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={onOpenWriteModal}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shrink-0 flex items-center gap-1.5"
            >
              <span>Publish</span>
            </button>
          </div>
        </div>

        {/* Featured Story Spotlight Banner */}
        {featuredStory && !searchQuery && (
          <div className="mb-12 relative rounded-3xl overflow-hidden border border-rose-500/30 bg-gradient-to-r from-[#1b0d25] via-[#230f30] to-[#160c20] shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              
              {/* Image side */}
              <div className="lg:col-span-7 relative h-72 sm:h-96 overflow-hidden group">
                <img
                  src={featuredStory.coverImage}
                  alt={featuredStory.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1b0d25] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#1b0d25]"></div>
                
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="bg-rose-600/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Featured Spotlight</span>
                  </div>
                  <span className="bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                    18+ MATURE
                  </span>
                </div>
              </div>

              {/* Text info side */}
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {featuredStory.category}
                    </span>
                    <span className="text-xs text-rose-200/50">• {featuredStory.readTime}</span>
                  </div>

                  <h2 
                    className="text-2xl sm:text-3xl font-bold font-serif text-white leading-snug mb-2 hover:text-rose-300 transition-colors cursor-pointer" 
                    onClick={() => onReadStory(featuredStory)}
                  >
                    {featuredStory.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-pink-300/80 mb-3 italic font-serif">
                    "{featuredStory.subtitle}"
                  </p>
                  <p className="text-xs sm:text-sm text-rose-100/70 line-clamp-3 leading-relaxed mb-6">
                    {featuredStory.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-rose-900/40">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={featuredStory.authorAvatar}
                      alt={featuredStory.author}
                      className="w-8 h-8 rounded-full border border-rose-400/40 object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{featuredStory.author}</div>
                      <div className="text-[10px] text-rose-200/50">{featuredStory.date}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onReadStory(featuredStory)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30 transition-all hover:translate-x-1"
                  >
                    <span>Read Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105'
                    : 'bg-rose-950/40 text-rose-200/70 hover:text-white hover:bg-rose-900/40 border border-rose-900/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-xs text-rose-200/60 shrink-0">
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" /> 24,000+ Desires</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-pink-400" /> 22+ Adult Stories</span>
          </div>
        </div>

      </div>
    </div>
  );
}
