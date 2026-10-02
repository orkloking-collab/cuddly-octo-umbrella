import React from 'react';
import { Heart, Flame, Send } from 'lucide-react';

export default function Footer({ onOpenWriteModal, setActiveTab }) {
  return (
    <footer className="border-t border-rose-900/30 bg-[#0c0612] text-rose-200/70 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold font-cinzel text-white">ROMANCHA</span>
            </div>
            <p className="text-xs text-rose-200/60 leading-relaxed font-serif">
              The premier destination for mature romance, erotic thrillers, visual micro-tales, and unfiltered late-night confessions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Categories</h4>
            <ul className="text-xs space-y-2">
              <li><button onClick={() => setActiveTab('stories')} className="hover:text-rose-300">Sensual Romance</button></li>
              <li><button onClick={() => setActiveTab('stories')} className="hover:text-rose-300">Romantic Thrillers</button></li>
              <li><button onClick={() => setActiveTab('photos')} className="hover:text-rose-300">Visual Desires</button></li>
              <li><button onClick={() => setActiveTab('discussions')} className="hover:text-rose-300">Midnight Confessions</button></li>
            </ul>
          </div>

          {/* Community & Writers */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Writers & Guild</h4>
            <ul className="text-xs space-y-2">
              <li><button onClick={onOpenWriteModal} className="hover:text-rose-300">Publish Your Story</button></li>
              <li><button onClick={() => setActiveTab('discover')} className="hover:text-rose-300">Discover People</button></li>
              <li><button onClick={() => setActiveTab('safety')} className="hover:text-rose-300">Trust &amp; Safety</button></li>
              <li><button onClick={() => setActiveTab('safety')} className="hover:text-rose-300">Content Guidelines</button></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Midnight Dispatch</h4>
            <p className="text-xs text-rose-200/60 font-serif">Receive weekly curated adult romance chapters and new releases directly in your inbox.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email..."
                className="w-full bg-[#170a20] border border-rose-900/40 rounded-xl px-3 py-2 text-xs text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
              />
              <button 
                onClick={() => alert('Welcome to the Romancha Midnight Dispatch. Check your inbox for your first curated chapter.')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-rose-900/20 flex flex-col sm:flex-row items-center justify-between text-xs text-rose-200/40 gap-4">
          <p>© 2026 Romancha Platform. All Rights Reserved. 18+ Mature Romance & Thrillers.</p>
          <p className="flex items-center gap-1 font-serif">
            <span>Crafted with raw passion</span>
            <Heart className="w-3 h-3 text-rose-500 fill-current" />
          </p>
        </div>
      </div>
    </footer>
  );
}
