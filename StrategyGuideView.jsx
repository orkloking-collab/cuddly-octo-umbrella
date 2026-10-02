import React from 'react';
import { 
  Lightbulb, 
  CheckCircle, 
  Layers, 
  Smartphone, 
  TrendingUp, 
  DollarSign, 
  Palette, 
  Users, 
  Share2, 
  Code,
  Flame,
  Zap
} from 'lucide-react';

export default function StrategyGuideView() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Hero Opinion Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-rose-950/80 via-[#2a0e38] to-purple-950/80 border border-rose-500/30 shadow-2xl overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Strategic Opinion & Launch Blueprint</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-cinzel text-white leading-snug">
            Mature Romance & Thriller Platform: <br />
            <span className="bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 bg-clip-text text-transparent font-serif">
              Comprehensive Analysis & Execution Roadmap
            </span>
          </h1>

          <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-rose-500/20 backdrop-blur-md">
            <p className="text-sm sm:text-base text-rose-100/90 leading-relaxed font-serif">
              <strong className="text-rose-300 font-semibold">Executive Assessment:</strong> Your idea of creating an attractive, image-driven adult romance and romantic thriller platform with open community discussions is <span className="text-amber-300 font-bold">one of the highest-converting digital publishing niches in the world</span>. Romance and erotic romance readers are the most voracious and loyal consumers on the web (dominating BookTok, Kindle Unlimited, and serialized fiction platforms).
            </p>
          </div>
        </div>
      </div>

      {/* 6 Core Pillars */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-white">
            6 Pillars to Make This Website Irresistible
          </h2>
          <p className="text-xs sm:text-sm text-rose-200/60 mt-1">
            How to stand out from generic blog sites and build a thriving digital brand
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-900/40 hover:border-rose-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-cinzel">1. Atmospheric Visuals</h3>
            <p className="text-xs text-rose-100/70 leading-relaxed font-serif">
              High-aesthetic, moody photography for every story (candlelight, penthouse rain, silk sheets, intimate silhouettes) that sets the emotional temperature immediately.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-900/40 hover:border-rose-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-cinzel">2. Genre Tropes Readers Love</h3>
            <p className="text-xs text-rose-100/70 leading-relaxed font-serif">
              Billionaire enemies-to-lovers, romantic suspense, bodyguard protection, late-night confessions, and intense workplace romance.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-900/40 hover:border-rose-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-cinzel">3. Midnight Confessions Forum</h3>
            <p className="text-xs text-rose-100/70 leading-relaxed font-serif">
              An open community discussion board where readers and writers share unfiltered romantic thoughts, dating debates, and secret confessions.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-900/40 hover:border-rose-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-cinzel">4. Immersive Reader Ambience</h3>
            <p className="text-xs text-rose-100/70 leading-relaxed font-serif">
              Built-in background sounds (gentle penthouse rain, warm velvet synth), adjustable font sizing, and multiple reading themes (Velvet Noir, Candlelight Sepia).
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-900/40 hover:border-rose-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-cinzel">5. User Creator Submission</h3>
            <p className="text-xs text-rose-100/70 leading-relaxed font-serif">
              A self-publishing portal allowing other authors to upload their chapters, select alluring cover art, and grow their personal audience.
            </p>
          </div>

          {/* Pillar 6 */}
          <div className="p-6 rounded-2xl bg-[#1b0e26] border border-rose-900/40 hover:border-rose-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-cinzel">6. Mobile-First Experience</h3>
            <p className="text-xs text-rose-100/70 leading-relaxed font-serif">
              Over 85% of romance fiction readers read in bed on their smartphones. Blazing-fast page transitions and tactile tap reactions are essential.
            </p>
          </div>

        </div>
      </div>

      {/* Tech Stack Options Comparison */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#170c22] border border-rose-900/40 space-y-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold font-cinzel text-white flex items-center gap-2">
            <Code className="w-6 h-6 text-rose-400" />
            <span>Recommended Technology Stack</span>
          </h3>
          <p className="text-xs sm:text-sm text-rose-200/60 mt-1">
            Choose the best foundation according to your timeline and technical goals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Option A: WordPress */}
          <div className="p-5 rounded-2xl bg-[#1f102c] border border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-rose-300">Option A: WordPress (Fast & No-Code)</h4>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                Easiest Launch
              </span>
            </div>
            <ul className="text-xs text-rose-100/80 space-y-2 font-serif">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span><strong>Themes:</strong> Newspaper, Astra Pro, or bespoke dark romance blog layouts.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span><strong>Plugins:</strong> Elementor Pro (page builder), wpDiscuz (rich reader comments), User Submitted Posts (guest authoring).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span><strong>Pros:</strong> Requires zero coding; simple admin dashboard for non-technical editors.</span>
              </li>
            </ul>
          </div>

          {/* Option B: Custom Modern App */}
          <div className="p-5 rounded-2xl bg-[#1f102c] border border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-pink-300">Option B: Next.js / React (High-Performance)</h4>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-semibold">
                Premium & Scalable
              </span>
            </div>
            <ul className="text-xs text-rose-100/80 space-y-2 font-serif">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Stack:</strong> React / Next.js + Tailwind CSS + Supabase / Firebase backend.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Benefits:</strong> Instantaneous page loads, seamless audio synthesizer, offline reading PWA.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Hosting:</strong> Free high-speed deployment on Vercel or Netlify.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Monetization & Marketing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Growth & Marketing */}
        <div className="p-6 rounded-3xl bg-[#180e24] border border-rose-900/40 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-lg font-bold font-cinzel text-white">Audience Growth & BookTok Viral Loop</h3>
          </div>
          <ul className="text-xs text-rose-100/80 space-y-2.5 leading-relaxed font-serif">
            <li>• <strong>Quote Graphic Carousels:</strong> Post aesthetic 3-slide quote snippets on TikTok, Instagram, and Pinterest with mood music.</li>
            <li>• <strong>Audio Teaser Reels:</strong> Pair seductive voiceover snippets with ambient video loops to drive millions of views.</li>
            <li>• <strong>Tropes SEO:</strong> Target high-intent search keywords like "steamy billionaire romance", "romantic thriller chapters", "late night love confessions".</li>
          </ul>
        </div>

        {/* Monetization */}
        <div className="p-6 rounded-3xl bg-[#180e24] border border-rose-900/40 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <DollarSign className="w-5 h-5" />
            <h3 className="text-lg font-bold font-cinzel text-white">High-Margin Monetization</h3>
          </div>
          <ul className="text-xs text-rose-100/80 space-y-2.5 leading-relaxed font-serif">
            <li>• <strong>VIP Membership / Patreon:</strong> Charge $5–$15/month for early access to uncensored chapters and cliffhanger conclusions.</li>
            <li>• <strong>Digital E-Books & Bundles:</strong> Sell full novella collections as PDF/EPUB downloads via Stripe or PayPal.</li>
            <li>• <strong>Google AdSense & Premium Ad Networks:</strong> Earn recurring revenue from high monthly pageviews.</li>
            <li>• <strong>Sponsorships:</strong> Partner with lingerie brands, luxury fragrance houses, and boutique book presses.</li>
          </ul>
        </div>

      </div>

    </div>
  );
}
