import React from 'react';
import { Bookmark, X, Trash2, ArrowUpRight, Feather } from 'lucide-react';

export default function BookmarksModal({ 
  isOpen, 
  onClose, 
  bookmarkedStories, 
  onReadStory, 
  onRemoveBookmark 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#190d24] border border-rose-900/50 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-rose-900/30">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-rose-400 fill-rose-500/20" />
            <h3 className="text-lg font-bold font-cinzel text-white">
              Saved Stories & Desires ({bookmarkedStories.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-rose-900/40 text-rose-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {bookmarkedStories.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Feather className="w-10 h-10 text-rose-400/40 mx-auto" />
              <p className="text-sm text-rose-200/60 font-serif">No stories saved in your vault yet.</p>
              <p className="text-xs text-rose-200/40">Click the bookmark icon on any story to save for later.</p>
            </div>
          ) : (
            bookmarkedStories.map((story) => (
              <div
                key={story.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#120819] border border-rose-900/30 hover:border-rose-500/30 transition-all"
              >
                <img
                  src={story.coverImage}
                  alt={story.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 
                    onClick={() => {
                      onClose();
                      onReadStory(story);
                    }}
                    className="text-sm font-bold font-serif text-white truncate cursor-pointer hover:text-rose-300"
                  >
                    {story.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-rose-200/50 mt-0.5">
                    <span>{story.author}</span>
                    <span>• {story.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onClose();
                      onReadStory(story);
                    }}
                    className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 text-xs"
                    title="Read"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveBookmark(story.id)}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-red-950/80 text-rose-300 hover:text-red-400 text-xs"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
