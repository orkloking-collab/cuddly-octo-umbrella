import React, { useState, useEffect } from 'react';
import { Flame, Heart, Mail, Sparkles, X, MessageSquare, Feather } from 'lucide-react';
import { simulatedLiveAlerts } from '../data/mockData';

export default function LiveNotificationToast({ customAlert, onClearCustomAlert }) {
  const [currentAlert, setCurrentAlert] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (customAlert) {
      setCurrentAlert(customAlert);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClearCustomAlert) onClearCustomAlert();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [customAlert, onClearCustomAlert]);

  useEffect(() => {
    // Rotate simulated alerts every 10 seconds if no custom alert active
    let index = 0;
    const interval = setInterval(() => {
      if (!customAlert) {
        const item = simulatedLiveAlerts[index % simulatedLiveAlerts.length];
        setCurrentAlert(item);
        setVisible(true);

        setTimeout(() => {
          setVisible(false);
        }, 4500);

        index++;
      }
    }, 11000);

    return () => clearInterval(interval);
  }, [customAlert]);

  if (!visible || !currentAlert) return null;

  const getIcon = () => {
    if (currentAlert.type === 'contact') return <Mail className="w-4 h-4 text-pink-400" />;
    if (currentAlert.type === 'like') return <Heart className="w-4 h-4 text-rose-400 fill-current" />;
    if (currentAlert.type === 'forum') return <MessageSquare className="w-4 h-4 text-amber-400" />;
    return <Flame className="w-4 h-4 text-rose-500 fill-rose-500/50" />;
  };

  return (
    <div className="fixed top-24 right-4 sm:right-6 z-50 max-w-sm w-full animate-slide-in pointer-events-auto">
      <div className="bg-[#1b0d26]/95 border border-rose-500/40 rounded-2xl p-3.5 shadow-2xl shadow-rose-950/70 backdrop-blur-md flex items-start gap-3">
        <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/40 shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-white truncate">{currentAlert.user}</span>
            {currentAlert.gender && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                currentAlert.gender === 'Female' 
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {currentAlert.gender}
              </span>
            )}
            <span className="text-[10px] text-rose-200/40">• Live</span>
          </div>

          <p className="text-xs text-rose-100/90 mt-0.5 line-clamp-2 font-serif">
            {currentAlert.text}
          </p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="text-rose-300/60 hover:text-white p-1 rounded-lg hover:bg-white/5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
