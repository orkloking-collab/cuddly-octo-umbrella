import React, { useState } from 'react';
import { 
  Heart, 
  X, 
  Star, 
  Sparkles, 
  Flame, 
  MapPin, 
  MessageCircle, 
  Gift, 
  ShieldCheck, 
  Info, 
  RotateCcw,
  Volume2,
  Check,
  User,
  Zap
} from 'lucide-react';
import { InstagramIcon, TwitterIcon, WebsiteIcon } from './SocialIcons';
import confetti from 'canvas-confetti';
import { onlineUsers } from '../data/mockCommunityData';

const DATING_PROFILES = [
  {
    id: 'date-1',
    name: 'Elena Vance',
    age: 24,
    gender: 'Female',
    country: 'United States',
    countryFlag: '🇺🇸',
    city: 'New York / Manhattan',
    distance: '3 km away',
    occupation: 'Romance Author & Model',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
    ],
    bio: 'Lover of late-night rainstorms, Cabernet Sauvignon, and dark psychological thrillers. Looking for someone who knows how to hold an intense conversation at 2 AM.',
    passions: ['🍷 Red Wine', '🌧️ Rain Lover', '🕯️ Candlelight', '🖤 Dark Romance', '✈️ Paris Nights'],
    prompt: {
      question: 'My ideal midnight date would be...',
      answer: 'A high-rise rooftop overlooking the rainy city skyline with vintage jazz and slow dancing.'
    },
    voiceNote: 'Hey there... let me know what your favorite romance trope is.',
    matchRate: '98% Romance Match'
  },
  {
    id: 'date-2',
    name: 'Damian Cross',
    age: 28,
    gender: 'Male',
    country: 'United Kingdom',
    countryFlag: '🇬🇧',
    city: 'London / Mayfair',
    distance: '5 km away',
    occupation: 'Billionaire Thriller Novelist',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    ],
    bio: 'Single malt scotch, sharp tailored suits, and adrenaline-fueled nights. Looking for a passionate muse for my next high-stakes casino thriller.',
    passions: ['🥃 Single Malt', '🏎️ Fast Cars', '♟️ High Stakes', '🎩 Luxury', '📖 Fiction'],
    prompt: {
      question: 'The key to my heart is...',
      answer: 'Unapologetic confidence and a taste for dangerous romantic suspense.'
    },
    voiceNote: 'Greetings from London. Hope you enjoy high-stakes romance.',
    matchRate: '95% Passion Match'
  },
  {
    id: 'date-3',
    name: 'Aria Montgomery',
    age: 22,
    gender: 'Female',
    country: 'Bangladesh',
    countryFlag: '🇧🇩',
    city: 'Dhaka / Gulshan',
    distance: '1 km away',
    occupation: 'Poet & Sensual Storyteller',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    ],
    bio: 'Moonlit rooftops, warm monsoon tea, and whispered verses. I believe true romance is felt in the lingering silences between two heartbeats.',
    passions: ['☕ Monsoon Tea', '🌙 Moon Gazing', '📜 Poetry', '🌸 Soft Whispers', '🎹 Piano'],
    prompt: {
      question: 'Together we could...',
      answer: 'Escape the chaos, listen to rain audio, and write our own eternal love chapter.'
    },
    voiceNote: 'Hi! Let us share a cup of tea under the monsoon sky.',
    matchRate: '99% Soulmate Match'
  },
  {
    id: 'date-4',
    name: 'Matteo Rossi',
    age: 27,
    gender: 'Male',
    country: 'Italy',
    countryFlag: '🇮🇹',
    city: 'Amalfi Coast',
    distance: '8 km away',
    occupation: 'Italian Villa Host & Author',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80'
    ],
    bio: 'Sun-drenched Mediterranean terraces, fresh limoncello, and passionate Italian romance. Looking for someone to sail with me at golden hour.',
    passions: ['⛵ Sailing', '🍋 Limoncello', '🌊 Sea Breeze', '🍝 Italian Cuisine', '🌅 Sunsets'],
    prompt: {
      question: 'Don’t message me if...',
      answer: 'You don’t enjoy sunset wine on cliffside balconies.'
    },
    voiceNote: 'Buonasera! Ready for an Italian getaway?',
    matchRate: '94% Chemistry Match'
  },
  {
    id: 'date-5',
    name: 'Camille Laurent',
    age: 25,
    gender: 'Female',
    country: 'France',
    countryFlag: '🇫🇷',
    city: 'Paris / Montmartre',
    distance: '4 km away',
    occupation: 'Fashion & Erotic Poetry Creator',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    ],
    bio: 'Silk bedsheets, Parisian bakery mornings, and deep French conversations under the glimmer of the Eiffel Tower.',
    passions: ['🥐 Croissants', '🗼 Paris Nights', '💄 Red Lipstick', '👠 Fashion', '🎨 Art'],
    prompt: {
      question: 'A secret talent of mine is...',
      answer: 'Whispering romantic French verses that make your heart skip a beat.'
    },
    voiceNote: 'Bonjour mon amour... let us fall in love in Paris.',
    matchRate: '97% Seduction Match'
  }
];

export default function SwipeMatchDeck({ onOpenDirectChat, onViewPublicProfile, userProfile }) {
  const [deck, setDeck] = useState(DATING_PROFILES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' | 'right' | 'super'
  const [sentGifts, setSentGifts] = useState({});

  const currentProfile = deck[currentIndex];

  const handleSwipe = (direction) => {
    if (!currentProfile) return;

    setSwipeDirection(direction);

    if (direction === 'right' || direction === 'super') {
      confetti({
        particleCount: direction === 'super' ? 70 : 45,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#fb7185', '#fbbf24']
      });

      // 60% chance of instant romantic match
      setTimeout(() => {
        setMatchedProfile(currentProfile);
      }, 350);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setPhotoIndex(0);
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const handleSendGift = (giftName, giftIcon) => {
    if (!currentProfile) return;
    setSentGifts(prev => ({
      ...prev,
      [currentProfile.id]: giftName
    }));

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleResetDeck = () => {
    setCurrentIndex(0);
    setPhotoIndex(0);
  };

  return (
    <div className="w-full max-w-md mx-auto py-4 px-3 sm:px-0 flex flex-col items-center">
      
      {/* Top Match Deck Header */}
      <div className="w-full flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-600/20 text-rose-400 rounded-xl">
            <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <h2 className="text-base font-bold font-cinzel text-white leading-tight">Speed Dating Deck</h2>
            <p className="text-[11px] text-rose-200/60 font-serif">Swipe right to match & unlock secret chat</p>
          </div>
        </div>

        <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800/40 text-pink-300 font-bold">
          {currentIndex < deck.length ? `${deck.length - currentIndex} Profiles Nearby` : 'Deck Complete'}
        </span>
      </div>

      {/* Main Tinder-Style Dating Card */}
      {currentProfile ? (
        <div 
          className={`relative w-full h-[580px] sm:h-[620px] rounded-3xl overflow-hidden bg-[#160a20] border-2 border-rose-500/40 shadow-2xl flex flex-col justify-between transition-transform duration-300 ${
            swipeDirection === 'left' ? '-translate-x-full rotate-[-15deg] opacity-0' :
            swipeDirection === 'right' ? 'translate-x-full rotate-[15deg] opacity-0' :
            swipeDirection === 'super' ? '-translate-y-full scale-110 opacity-0' : 'translate-x-0'
          }`}
        >
          
          {/* Photos Carousel with tap left/right */}
          <div className="absolute inset-0">
            <img
              src={currentProfile.photos[photoIndex] || currentProfile.avatar}
              alt={currentProfile.name}
              className="w-full h-full object-cover"
            />
            
            {/* Top Photo Story Indicator Bars */}
            <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5">
              {currentProfile.photos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i === photoIndex ? 'bg-white shadow' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Left/Right Tap zones for photos */}
            <div 
              className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
              onClick={() => setPhotoIndex(prev => prev > 0 ? prev - 1 : currentProfile.photos.length - 1)}
            />
            <div 
              className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
              onClick={() => setPhotoIndex(prev => prev < currentProfile.photos.length - 1 ? prev + 1 : 0)}
            />

            {/* Dark Gradient Overlay for Text Visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 pointer-events-none" />
          </div>

          {/* Top Badges */}
          <div className="relative z-20 p-4 pt-7 flex items-center justify-between">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online • {currentProfile.distance}</span>
            </span>

            <span className="px-3 py-1 rounded-full bg-rose-600/90 text-white font-bold text-xs shadow-lg border border-rose-400/40">
              {currentProfile.matchRate}
            </span>
          </div>

          {/* Bottom Profile Details */}
          <div className="relative z-20 p-5 space-y-3 pointer-events-auto">
            
            {/* Name, Age, Verification */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl sm:text-3xl font-bold font-serif text-white leading-tight">
                  {currentProfile.name}, {currentProfile.age}
                </h3>
                {currentProfile.verified && (
                  <ShieldCheck className="w-5 h-5 text-sky-400 fill-sky-400/20 shrink-0" />
                )}
                <span className="text-xl">{currentProfile.countryFlag}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-rose-200/80 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{currentProfile.city}</span>
                <span>•</span>
                <span className="text-pink-300 font-semibold">{currentProfile.occupation}</span>
              </div>
            </div>

            {/* Bio */}
            <p className="text-xs sm:text-sm text-rose-100 font-serif leading-relaxed line-clamp-2">
              {currentProfile.bio}
            </p>

            {/* Prompt Card */}
            {currentProfile.prompt && (
              <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 space-y-0.5">
                <span className="text-[10px] text-pink-300 uppercase font-bold tracking-wider block">
                  {currentProfile.prompt.question}
                </span>
                <p className="text-xs text-white font-serif italic">
                  "{currentProfile.prompt.answer}"
                </p>
              </div>
            )}

            {/* Passions Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentProfile.passions.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] text-rose-100 border border-white/10 font-medium"
                >
                  {p}
                </span>
              ))}
            </div>

            {/* Quick Virtual Dating Gifts Bar */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[11px] text-pink-300 font-semibold">Send Dating Gift:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { name: 'Red Rose', icon: '🌹' },
                  { name: 'Champagne', icon: '🍾' },
                  { name: 'Diamond Ring', icon: '💎' },
                  { name: 'Chocolate', icon: '🍫' }
                ].map((gift) => (
                  <button
                    key={gift.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendGift(gift.name, gift.icon);
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-base transition-all hover:scale-110 active:scale-95"
                    title={`Send ${gift.name}`}
                  >
                    {gift.icon}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Sent Gift Alert Banner */}
          {sentGifts[currentProfile.id] && (
            <div className="absolute top-16 inset-x-4 z-30 p-2.5 rounded-2xl bg-rose-600/90 text-white text-xs font-bold text-center shadow-xl animate-bounce">
              🎁 You sent a {sentGifts[currentProfile.id]} to {currentProfile.name}!
            </div>
          )}

        </div>
      ) : (
        /* Empty Deck State */
        <div className="w-full h-[520px] rounded-3xl bg-[#160a20] border border-rose-900/40 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Heart className="w-8 h-8 fill-current text-rose-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold font-cinzel text-white">You've Seen All Nearby Creators!</h3>
          <p className="text-xs text-rose-200/70 font-serif max-w-xs leading-relaxed">
            Check back later for new arrivals or reset your speed dating deck to browse passionate creators again.
          </p>
          <button
            onClick={handleResetDeck}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold shadow-xl shadow-rose-900/50 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Dating Deck</span>
          </button>
        </div>
      )}

      {/* Bottom Tinder Controls Action Bar */}
      {currentProfile && (
        <div className="w-full max-w-sm mt-4 flex items-center justify-around px-2">
          
          {/* Rewind / View Profile */}
          <button
            onClick={() => {
              if (onViewPublicProfile) {
                onViewPublicProfile({
                  name: currentProfile.name,
                  avatar: currentProfile.avatar,
                  gender: currentProfile.gender,
                  country: currentProfile.country,
                  countryFlag: currentProfile.countryFlag,
                  bio: currentProfile.bio,
                  followers: 3200
                });
              }
            }}
            className="p-3.5 rounded-full bg-[#1b0d26] text-amber-400 border border-amber-500/30 shadow-lg hover:scale-110 active:scale-95 transition-all"
            title="View Full Bio Profile"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Pass (Swipe Left) */}
          <button
            onClick={() => handleSwipe('left')}
            className="p-4 rounded-full bg-[#1b0d26] text-rose-400 border border-rose-500/40 shadow-xl hover:bg-rose-950 hover:scale-110 active:scale-95 transition-all"
            title="Pass (Swipe Left)"
          >
            <X className="w-7 h-7" />
          </button>

          {/* Super Like (Star) */}
          <button
            onClick={() => handleSwipe('super')}
            className="p-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-xl shadow-amber-500/30 hover:scale-115 active:scale-95 transition-all"
            title="Super Like ⭐"
          >
            <Star className="w-6 h-6 fill-current" />
          </button>

          {/* Love / Match (Swipe Right) */}
          <button
            onClick={() => handleSwipe('right')}
            className="p-4 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-xl shadow-rose-600/50 hover:scale-110 active:scale-95 transition-all"
            title="Like & Match (Swipe Right)"
          >
            <Heart className="w-7 h-7 fill-current" />
          </button>

          {/* Instant 1-on-1 Chat */}
          <button
            onClick={() => {
              if (onOpenDirectChat) {
                onOpenDirectChat(currentProfile);
              }
            }}
            className="p-3.5 rounded-full bg-[#1b0d26] text-pink-400 border border-pink-500/40 shadow-lg hover:scale-110 active:scale-95 transition-all"
            title="Send Direct Message"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

        </div>
      )}

      {/* Romantic "It's A Match!" Modal */}
      {matchedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
          <div className="w-full max-w-sm bg-[#180a22] border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            
            <div className="space-y-1">
              <span className="text-3xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 block">
                IT'S A MATCH! 💖
              </span>
              <p className="text-xs text-rose-200/80 font-serif">
                You and <strong>{matchedProfile.name}</strong> both ignited desire for each other!
              </p>
            </div>

            {/* Matched Avatars */}
            <div className="flex items-center justify-center -space-x-4 py-2">
              <img
                src={userProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt="Me"
                className="w-20 h-20 rounded-full object-cover border-4 border-rose-500 shadow-xl"
              />
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center z-10 shadow-lg border-2 border-[#180a22]">
                <Heart className="w-5 h-5 fill-current animate-pulse" />
              </div>
              <img
                src={matchedProfile.avatar}
                alt={matchedProfile.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-pink-500 shadow-xl"
              />
            </div>

            {/* Match Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const target = matchedProfile;
                  setMatchedProfile(null);
                  if (onOpenDirectChat) {
                    onOpenDirectChat(target);
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-900/50 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send 1-on-1 Message Now (Photos/Videos)</span>
              </button>

              <button
                onClick={() => setMatchedProfile(null)}
                className="w-full py-2.5 rounded-xl text-xs text-rose-300/80 hover:text-white"
              >
                Keep Swiping Deck
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
