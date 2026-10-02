import React from 'react';
import { Heart, Bookmark, Feather, ArrowUpRight, Mail } from 'lucide-react';

export default function StoryGrid({ 
  stories, 
  onReadStory, 
  bookmarkedIds, 
  onToggleBookmark,
  likedIds,
  onToggleLike,
  onOpenContactAuthor,
  onViewPublicProfile,
  onOpenDirectChat
}) {
  if (stories.length === 0) {
    return (
      <div className="py-20 text-center bg-rose-950/20 rounded-3xl border border-rose-900/30 max-w-xl mx-auto my-8 p-8">
        <Feather className="w-12 h-12 text-rose-400 mx-auto mb-3 opacity-60" />
        <h3 className="text-xl font-bold font-serif text-white">No Stories Found</h3>
        <p className="text-sm text-rose-200/60 mt-1">Try searching with a different keyword or category.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => {
          const isBookmarked = bookmarkedIds.includes(story.id);
          const isLiked = likedIds.includes(story.id);

          const authorObj = {
            name: story.author,
            avatar: story.authorAvatar,
            gender: story.authorGender || 'Female',
            country: story.authorCountry || 'Bangladesh',
            countryFlag: story.authorCountryFlag || '🇧🇩',
            bio: story.excerpt || 'Romancha verified romance writer.',
            followers: 1850,
            isVip: true
          };

          return (
            <article
              key={story.id}
              className="group relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#1c0f26]/90 to-[#140a1c] border border-rose-900/30 overflow-hidden hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-950/50 transition-all duration-300"
            >
              {/* Image & Badges */}
              <div 
                className="relative h-60 overflow-hidden cursor-pointer"
                onClick={() => onReadStory(story)}
              >
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#140a1c] via-transparent to-transparent"></div>
                
                {/* Category & Mood */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[80%]">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-md text-white border border-rose-400/30 uppercase tracking-wider">
                    {story.category}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30">
                    18+
                  </span>
                </div>

                {/* Bookmark quick button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(story.id);
                  }}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all ${
                    isBookmarked 
                      ? 'bg-rose-600 text-white shadow-lg' 
                      : 'bg-black/50 text-rose-200/80 hover:bg-black/80 hover:text-white'
                  }`}
                  title={isBookmarked ? "Remove Bookmark" : "Save Story"}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Title */}
                  <h3 
                    onClick={() => onReadStory(story)}
                    className="text-lg font-bold font-serif text-white group-hover:text-rose-300 transition-colors line-clamp-2 cursor-pointer leading-snug"
                  >
                    {story.title}
                  </h3>

                  {story.subtitle && (
                    <p className="text-xs text-pink-300/70 mt-1 line-clamp-1 italic font-serif">
                      "{story.subtitle}"
                    </p>
                  )}

                  {/* Excerpt */}
                  <p className="text-xs text-rose-100/60 mt-2.5 line-clamp-3 leading-relaxed">
                    {story.excerpt}
                  </p>
                </div>

                {/* Bottom Meta */}
                <div className="mt-5 pt-4 border-t border-rose-900/40 flex items-center justify-between text-xs text-rose-200/60">
                  {/* Clickable Author Profile Info */}
                  <div 
                    onClick={() => {
                      if (onViewPublicProfile) onViewPublicProfile(authorObj);
                    }}
                    className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-90 group/author"
                    title={`View ${story.author}'s Full Profile & Bio`}
                  >
                    <img
                      src={story.authorAvatar}
                      alt={story.author}
                      className="w-6 h-6 rounded-full border border-rose-500/40 object-cover shrink-0 group-hover/author:ring-2 group-hover/author:ring-rose-500 transition-all"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-white/90 text-xs truncate group-hover/author:text-rose-300 transition-colors">
                        {story.author}
                      </span>
                      {story.authorGender && (
                        <span className={`ml-1 text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                          story.authorGender === 'Female' 
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {story.authorGender}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats and Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Direct 1-on-1 Chat Quick Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenDirectChat) {
                          onOpenDirectChat(authorObj);
                        } else if (onOpenContactAuthor) {
                          onOpenContactAuthor({
                            name: story.author,
                            gender: story.authorGender || 'Female',
                            avatar: story.authorAvatar,
                            title: story.title
                          });
                        }
                      }}
                      className="p-1.5 rounded-lg bg-pink-950/40 hover:bg-pink-600 text-pink-300 hover:text-white transition-all border border-pink-900/30"
                      title={`Send 1-on-1 Message to ${story.author}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(story.id);
                      }}
                      className={`flex items-center gap-1 transition-colors px-2 py-1 rounded-lg ${
                        isLiked ? 'text-rose-400 font-bold bg-rose-950/40' : 'hover:text-rose-300'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{(story.likes || 0) + (isLiked ? 1 : 0)}</span>
                    </button>

                    <button
                      onClick={() => onReadStory(story)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white transition-all"
                      title="Read full story"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
