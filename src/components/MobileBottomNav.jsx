import React from 'react';
import { Heart, MessageSquare, Sparkles, ShieldCheck, User } from 'lucide-react';
import { useDating } from '../utils/useDating';

/**
 * Mobile tab bar. Rewritten for the dating flow: Deck / Likes / Inbox / Profile,
 * with real badge counts instead of a decorative ping dot.
 */
export default function MobileBottomNav({ activeTab, setActiveTab, onOpenProfileModal, onOpenLikes }) {
  const { store } = useDating();
  const unread = store.unreadTotal();
  const newMatches = store.inboxes().filter((m) => m.needsHello).length;
  const likes = store.pendingLikes().length;

  const items = [
    { id: 'discover', label: 'Deck', icon: Heart, active: 'text-pink-400' },
    { id: 'likes', label: 'Likes', icon: Sparkles, count: likes },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare, count: unread + newMatches },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
  ];

  return (
    <div className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-[#120819]/95 backdrop-blur-lg border-t border-rose-900/40 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.slice(0, 2).map((it) => (
          <TabButton key={it.id} item={it} activeTab={activeTab} setActiveTab={setActiveTab} onOpenLikes={onOpenLikes} />
        ))}

        {/* Center: primary action — go swipe */}
        <button
          onClick={() => setActiveTab('discover')}
          aria-label="Open your deck"
          className="relative -top-2.5 w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 p-0.5 shadow-xl shadow-rose-600/50 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <span className="w-full h-full bg-[#180924] rounded-full flex flex-col items-center justify-center">
            <Heart className="w-5 h-5 text-rose-400 fill-rose-500/40" />
          </span>
          {newMatches > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-[18px] text-white">
              {newMatches}
            </span>
          )}
        </button>

        {items.slice(2).map((it) => (
          <TabButton key={it.id} item={it} activeTab={activeTab} setActiveTab={setActiveTab} onOpenLikes={onOpenLikes} />
        ))}

        <button
          onClick={onOpenProfileModal}
          className={`flex flex-col items-center gap-0.5 p-1 transition-all ${
            activeTab === 'profile' ? 'text-rose-400 font-bold scale-105' : 'text-rose-200/60'
          }`}
          aria-label="Your profile"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">You</span>
        </button>
      </div>
    </div>
  );
}

function TabButton({ item, activeTab, setActiveTab, onOpenLikes }) {
  const isActive = activeTab === item.id;
  const Icon = item.icon;
  return (
    <button
      onClick={() => (item.id === 'likes' ? onOpenLikes?.() : setActiveTab(item.id))}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={`flex flex-col items-center gap-0.5 p-1 transition-all relative ${
        isActive ? `${item.active || 'text-rose-400'} font-bold scale-105` : 'text-rose-200/60'
      }`}
    >
      <span className="relative">
        <Icon className="w-5 h-5" />
        {item.count > 0 && (
          <span className="absolute -right-2 -top-1.5 min-w-[15px] rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-[15px] text-white">
            {item.count > 9 ? '9+' : item.count}
          </span>
        )}
      </span>
      <span className="text-[10px]">{item.label}</span>
    </button>
  );
}
