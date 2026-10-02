import React, { useState } from 'react';
import { X, Mail, ShieldCheck, Sparkles, Check, Globe, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { countriesList } from '../data/mockCommunityData';

export default function GmailAuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('google'); // 'google' or 'email'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [country, setCountry] = useState(countriesList[0].name); // 'Bangladesh'
  const [countryFlag, setCountryFlag] = useState(countriesList[0].flag); // '🇧🇩'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCountryChange = (cName) => {
    setCountry(cName);
    const found = countriesList.find(c => c.name === cName);
    if (found) setCountryFlag(found.flag);
  };

  const handleGoogleOneClick = () => {
    setLoading(true);
    setTimeout(() => {
      const generatedProfile = {
        id: `usr-${Date.now()}`,
        name: name.trim() || 'Elena Vance',
        username: `@${(name.trim() || 'elena_vance').toLowerCase().replace(/\s+/g, '_')}`,
        email: email.trim() || 'elena.vance@gmail.com',
        gender: gender,
        country: country,
        countryFlag: countryFlag,
        avatar: gender === 'Female' 
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        bio: 'Passionate reader & creator of midnight romance thrillers.',
        role: 'Verified Google Author',
        followers: 120,
        following: 15
      };

      setLoading(false);
      setSuccess(true);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        onLoginSuccess(generatedProfile);
        setSuccess(false);
        onClose();
      }, 1200);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#180e22] border border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-rose-900/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-white">Sign In with Gmail / Google</h2>
              <p className="text-xs text-rose-200/60">Create your author profile & link your country</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-rose-900/40 text-rose-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold font-serif text-white">Welcome, {name || 'Elena'}!</h3>
            <p className="text-xs text-rose-200/70">Your Google account & Country ({countryFlag} {country}) have been connected.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Quick Google Auth Button */}
            <button
              onClick={handleGoogleOneClick}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google / Gmail</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-rose-900/40 flex-1"></div>
              <span className="text-[11px] text-rose-200/40 uppercase">Or Profile Details</span>
              <div className="h-px bg-rose-900/40 flex-1"></div>
            </div>

            {/* Custom Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Your Full Name / Pen Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Gmail Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Country Selection */}
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1 flex items-center justify-between">
                  <span>Your Country / Location</span>
                  <span className="text-pink-400 font-normal">{countryFlag} {country}</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {countriesList.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Female', 'Male', 'Non-Binary'].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        gender === g
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-[#12081a] text-rose-200/70 border-rose-900/40'
                      }`}
                    >
                      {g === 'Female' ? '🌸 Female' : g === 'Male' ? '🔥 Male' : '✨ Other'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Direct Create Account Button */}
            <button
              onClick={handleGoogleOneClick}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-rose-600/30 transition-all"
            >
              Create Account with Gmail ✦
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
