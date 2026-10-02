import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Heart, 
  Flame, 
  Sparkles, 
  Maximize2, 
  X,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function VideoCallModal({ isOpen, onClose, partnerUser, userProfile }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting secret encrypted line...');

  useEffect(() => {
    let timer;
    if (isOpen) {
      setCallStatus('Connecting...');
      const connectTimeout = setTimeout(() => {
        setCallStatus('Connected • 1080p HD Private Line 🔒');
        timer = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }, 1200);

      return () => {
        clearTimeout(connectTimeout);
        clearInterval(timer);
      };
    } else {
      setCallDuration(0);
    }
  }, [isOpen]);

  if (!isOpen || !partnerUser) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleSendHeartReaction = () => {
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      
      {/* Video Call Window */}
      <div className="relative w-full h-full sm:max-w-4xl sm:h-[88vh] bg-[#120719] sm:rounded-3xl border-0 sm:border border-rose-500/40 shadow-2xl overflow-hidden flex flex-col justify-between">
        
        {/* Main Partner Video Stream */}
        <div className="absolute inset-0">
          <video
            src="https://assets.mixkit.co/videos/preview/mixkit-candles-in-the-dark-at-a-romantic-dinner-43527-large.mp4"
            autoPlay
            loop
            muted={false}
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />
        </div>

        {/* Top Call Info Bar */}
        <div className="relative z-20 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={partnerUser.avatar}
                alt={partnerUser.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-500 shadow-xl"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#120719]"></span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-bold font-serif text-white">{partnerUser.name}</h3>
                <span>{partnerUser.countryFlag}</span>
              </div>
              <p className="text-xs text-emerald-400 font-mono">
                {formatTime(callDuration)} • {callStatus}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-rose-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Small Self Camera Preview (Picture in Picture) */}
        <div className="relative z-20 self-end mr-4 sm:mr-6 mb-4 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-rose-500/60 shadow-2xl bg-[#1b0d26]">
          {isVideoOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-rose-300 text-xs">
              <VideoOff className="w-6 h-6 mb-1 opacity-60" />
              <span>Camera Off</span>
            </div>
          ) : (
            <img
              src={userProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
              alt="My camera"
              className="w-full h-full object-cover"
            />
          )}
          <span className="absolute bottom-1 left-2 text-[10px] text-white font-bold drop-shadow">You</span>
        </div>

        {/* Bottom Call Action Controls Bar */}
        <div className="relative z-20 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center gap-4 sm:gap-6">
          
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all shadow-xl ${
              isMuted ? 'bg-red-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Camera Toggle Button */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-4 rounded-full transition-all shadow-xl ${
              isVideoOff ? 'bg-red-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          {/* Heart Love Reaction Button */}
          <button
            onClick={handleSendHeartReaction}
            className="p-4 rounded-full bg-pink-600 hover:bg-pink-500 text-white shadow-xl shadow-pink-600/50 hover:scale-115 active:scale-95 transition-all"
            title="Send Heart Reaction"
          >
            <Heart className="w-6 h-6 fill-current animate-bounce" />
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="p-4 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-900/60 font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            title="End Video Call"
          >
            <PhoneOff className="w-6 h-6" />
            <span className="hidden sm:inline text-xs">End Call</span>
          </button>

        </div>

      </div>

    </div>
  );
}
