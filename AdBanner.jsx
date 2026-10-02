import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles, X, Flame, ShieldCheck } from 'lucide-react';
import { sponsorAds } from '../data/mockCommunityData';

const CPM_DIRECT_LINK = 'https://www.profitableratecpmnetwork.com/um7z1ma2ir?key=f941ffb705335e9fdc5572377ad5b615';

// 728x90 Leaderboard Banner Loader Component
export function Banner728x90() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous children
    containerRef.current.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.width = '728';
    iframe.height = '90';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    iframe.title = 'Advertisement 728x90';

    containerRef.current.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    const iframeDoc = doc.document ? doc.document : doc;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }</style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key' : 'fd9e16e990b77192f01e7a8edbc1b49a',
              'format' : 'iframe',
              'height' : 90,
              'width' : 728,
              'params' : {}
            };
          <\/script>
          <script type="text/javascript" src="https://www.highrevenueformat.com/fd9e16e990b77192f01e7a8edbc1b49a/invoke.js"><\/script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center overflow-hidden my-3">
      <div className="text-[10px] uppercase tracking-wider text-rose-300/40 mb-1 flex items-center gap-1 font-mono">
        <span>Sponsored Advertisement</span>
      </div>
      <div ref={containerRef} className="max-w-full overflow-x-auto rounded-xl shadow-lg border border-rose-900/40 bg-[#12081a] flex justify-center" />
    </div>
  );
}

// 320x50 Mobile Banner Loader Component
export function Banner320x50() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.width = '320';
    iframe.height = '50';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    iframe.title = 'Advertisement 320x50';

    containerRef.current.appendChild(iframe);

    const doc = iframe.contentWindow || iframe.contentDocument;
    const iframeDoc = doc.document ? doc.document : doc;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }</style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key' : '7a17594429028327e0d54e18dc8b6cc7',
              'format' : 'iframe',
              'height' : 50,
              'width' : 320,
              'params' : {}
            };
          <\/script>
          <script type="text/javascript" src="https://www.highrevenueformat.com/7a17594429028327e0d54e18dc8b6cc7/invoke.js"><\/script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center overflow-hidden my-2">
      <div className="text-[9px] uppercase tracking-wider text-rose-300/40 mb-1 flex items-center gap-1 font-mono">
        <span>Sponsored</span>
      </div>
      <div ref={containerRef} className="rounded-lg shadow border border-rose-900/40 bg-[#12081a] flex justify-center" />
    </div>
  );
}

// Native Container Ad Component
export function NativeContainerAd() {
  return (
    <div className="w-full my-6 p-4 rounded-3xl bg-gradient-to-r from-[#1f0b2a] via-[#160820] to-[#280d38] border border-rose-500/30 shadow-2xl">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-900/30 text-xs">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Recommended for You</span>
        </span>
        <a 
          href={CPM_DIRECT_LINK} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[11px] text-pink-400 hover:text-white hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Explore Partner Content</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Target Container for invoke.js */}
      <div id="container-c1d608ec01b1d9a4677b6e9fc686a7d2" className="min-h-[90px] flex items-center justify-center text-center">
        {/* Fallback Direct Link CTA if ad blocker is active */}
        <a
          href={CPM_DIRECT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-2xl bg-[#14081c] border border-rose-900/50 hover:border-rose-500/60 w-full flex items-center justify-between gap-4 transition-all group"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                Exclusive VIP Romantic Offers & Novels
              </h5>
              <p className="text-xs text-rose-200/70 font-serif">
                Access curated midnight romance series, premium gifts & author collectibles.
              </p>
            </div>
          </div>
          <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs shrink-0 group-hover:shadow-lg group-hover:shadow-rose-600/30 transition-all">
            Unlock Now →
          </span>
        </a>
      </div>
    </div>
  );
}

// Master Responsive Ad Banner Component
export default function AdBanner({ type = 'banner', adIndex = 0 }) {
  const [closed, setClosed] = useState(false);
  const ad = sponsorAds[adIndex % sponsorAds.length] || sponsorAds[0];

  if (closed) return null;

  if (type === 'native') {
    return <NativeContainerAd />;
  }

  if (type === '728x90') {
    return <Banner728x90 />;
  }

  if (type === '320x50') {
    return <Banner320x50 />;
  }

  // Responsive Luxury Banner (Desktop 728x90 + Mobile 320x50 + Direct Smartlink)
  return (
    <div className="my-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* Desktop Banner Display */}
      <div className="hidden md:block">
        <Banner728x90 />
      </div>

      {/* Mobile Banner Display */}
      <div className="block md:hidden">
        <Banner320x50 />
      </div>

      {/* Direct Smartlink Bar */}
      <div className="mt-2 rounded-2xl p-3 sm:p-3.5 bg-gradient-to-r from-[#180922] via-[#240d33] to-[#12061b] border border-rose-900/50 flex items-center justify-between gap-4 text-xs shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-600/20 text-rose-300 uppercase shrink-0 border border-rose-500/30">
            Featured Partner
          </span>
          <p className="text-rose-100/90 truncate font-serif text-xs">
            <strong className="text-white font-semibold">{ad.title}:</strong> {ad.tagline || ad.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={CPM_DIRECT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow transition-all flex items-center gap-1"
          >
            <span>{ad.cta || 'Explore Deal'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button 
            onClick={() => setClosed(true)} 
            className="p-1 rounded-full text-rose-300/40 hover:text-white transition-colors"
            title="Dismiss ad"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
