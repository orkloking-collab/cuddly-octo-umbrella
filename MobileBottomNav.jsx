import React from 'react';
import { Feather, Video, Users, Trophy, Flame, User, Heart, Mail, MessageSquare } from 'lucide-react';

export default function MobileBottomNav({ 
  activeTab, 
  setActiveTab, 
  onOpenWriteModal, 
  onOpenProfileModal,
  onOpenDirectChat
}) {
  return (
    <div className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-[#120819]/95 backdrop-blur-lg border-t border-rose-900/40 px-2 py-1.5 shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Speed Match Dating Deck */}
        <button
          onClick={() => setActiveTab('match')}
          className={`flex flex-col items-center gap-0.5 p-1 transition-all relative ${
            activeTab === 'match' ? 'text-pink-400 font-bold scale-105' : 'text-rose-200/60'
          }`}
        >
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
          <Heart className="w-5 h-5 text-pink-400 fill-pink-500/30" />
          <span className="text-[10px]">Dating</span>
        </button>

        {/* Reels Video Tab (TikTok Style) */}
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'reels' ? 'text-rose-400 font-bold scale-105' : 'text-rose-200/60'
          }`}
        >
          <Video className="w-5 h-5 text-rose-400" />
          <span className="text-[10px]">Reels</span>
        </button>

        {/* Center Floating Publish Button */}
        <button
          onClick={onOpenWriteModal}
          className="relative -top-2.5 w-11 h-11 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 p-0.5 shadow-xl shadow-rose-600/50 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <div className="w-full h-full bg-[#180924] rounded-full flex items-center justify-center">
            <Flame className="w-5 h-5 text-rose-400 fill-rose-500/40" />
          </div>
        </button>

        {/* Direct Messages (Photos & Videos) */}
        <button
          onClick={() => onOpenDirectChat()}
          className="flex flex-col items-center gap-0.5 p-1 text-rose-200/60 hover:text-pink-400 transition-all relative"
        >
          <span className="absolute -top-0.5 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
          <Mail className="w-5 h-5" />
          <span className="text-[10px]">DMs</span>
        </button>

        {/* Stories Tab */}
        <button
          onClick={() => setActiveTab('stories')}
          className={`flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'stories' ? 'text-rose-400 font-bold scale-105' : 'text-rose-200/60'
          }`}
        >
          <Feather className="w-5 h-5" />
          <span className="text-[10px]">Stories</span>
        </button>

        {/* User Profile */}
        <button
          onClick={onOpenProfileModal}
          className="flex flex-col items-center gap-0.5 p-1 text-rose-200/60 hover:text-rose-300"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>

      </div>
    </div>
  );
}
