import React, { useState } from 'react';
import { X, Mail, Lock, ShieldCheck, Sparkles, Check, Camera, LogIn, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { authStore } from '../utils/authStore';
import { countriesList } from '../data/mockCommunityData';


export default function AccountAuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('Female');
  const [country, setCountry] = useState('Bangladesh');
  const [countryFlag, setCountryFlag] = useState('🇧🇩');
  const [bio, setBio] = useState('Lover of late-night rain, dark romance thrillers & candlelight poetry.');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCountrySelect = (cName) => {
    setCountry(cName);
    const item = countriesList.find(c => c.name === cName);
    if (item) setCountryFlag(item.flag);
  };

  const handleAvatarFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    setTimeout(() => {
      if (authMode === 'signup') {
        const result = authStore.register({
          email,
          password,
          name,
          username,
          gender,
          country,
          countryFlag,
          bio,
          avatar
        });

        if (!result.success) {
          setErrorMessage(result.error);
          setLoading(false);
          return;
        }

        setSuccessMessage('Account created successfully! Your stories and profile are now saved.');
        confetti({
          particleCount: 50,
          spread: 80,
          origin: { y: 0.6 }
        });

        setTimeout(() => {
          onLoginSuccess(result.account);
          setLoading(false);
          onClose();
        }, 1200);

      } else {
        // Login mode
        const result = authStore.login(email, password);
        if (!result.success) {
          setErrorMessage(result.error);
          setLoading(false);
          return;
        }

        setSuccessMessage(`Welcome back, ${result.account.name}! Your stories & data have been restored.`);
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.6 }
        });

        setTimeout(() => {
          onLoginSuccess(result.account);
          setLoading(false);
          onClose();
        }, 1200);
      }
    }, 400);
  };

  // Demo 1-Click Fast Login for quick switching
  const handleQuickLoginAs = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    const result = authStore.login(demoEmail, demoPass);
    if (result.success) {
      setSuccessMessage(`Switched to ID: ${result.account.name}`);
      setTimeout(() => {
        onLoginSuccess(result.account);
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#180e22] border border-rose-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-rose-900/40 text-rose-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
            <span>Persistent Author & Reader Database</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-cinzel text-white">
            {authMode === 'login' ? 'Sign In to Romancha' : 'Create Romancha ID'}
          </h2>
          <p className="text-xs sm:text-sm text-rose-200/70 font-light font-serif">
            {authMode === 'login'
              ? 'Access your published romance stories, chats, followers, and saved bookmarks.'
              : 'Create your permanent author ID with email and password to sync across all devices.'}
          </p>
        </div>

        {/* Tab Switcher: Login / Sign Up */}
        <div className="flex bg-[#12081a] p-1 rounded-2xl border border-rose-900/40">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-rose-200/60 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In (Login)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-rose-200/60 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create New ID (Sign Up)</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Sign Up Specific Fields */}
          {authMode === 'signup' && (
            <>
              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-3.5 bg-[#12081a] p-3 rounded-2xl border border-rose-900/30">
                <div className="relative group shrink-0">
                  <img
                    src={avatar}
                    alt="avatar preview"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-500/60 shadow"
                  />
                  <label
                    htmlFor="signup-avatar-upload"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white cursor-pointer transition-opacity"
                    title="Upload photo"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                  <input
                    id="signup-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Profile Photo</span>
                    <label htmlFor="signup-avatar-upload" className="text-[11px] text-pink-400 font-semibold cursor-pointer hover:underline">
                      Upload from Device
                    </label>
                  </div>
                  <p className="text-[10px] text-rose-200/50">PNG, JPG or WEBP image format</p>
                </div>
              </div>

              {/* Name & Handle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Author Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Scarlett Rose"
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Username / Handle *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@scarlett"
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Gender & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Female">Female 🌸</option>
                    <option value="Male">Male 🔥</option>
                    <option value="Non-Binary">Non-Binary ✨</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                    Country ({countryFlag}) *
                  </label>
                  <select
                    value={country}
                    onChange={(e) => handleCountrySelect(e.target.value)}
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {countriesList.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">About / Bio</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Lover of dark romance, midnight thrillers & poetry"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-serif"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-rose-200/80 mb-1">Email Address *</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-rose-400 absolute left-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="author@romancha.club"
                className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-rose-200/80 mb-1">Password *</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-rose-400 absolute left-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            {authMode === 'signup' && (
              <p className="text-[10px] text-rose-200/50 mt-1">Minimum 6 characters for security</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : authMode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In & Restore My Data</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Account & Save Profile</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Switcher */}
        <div className="pt-3 border-t border-rose-900/30 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-rose-200/60">
            <span>Or switch to a demo author profile:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLoginAs('sophia@romancha.club', 'romance123')}
              className="p-2 rounded-xl bg-[#12081a] hover:bg-rose-900/40 border border-rose-900/40 flex items-center gap-2 text-left transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                alt="Sophia"
                className="w-7 h-7 rounded-lg object-cover"
              />
              <div className="min-w-0 truncate">
                <span className="text-[11px] text-white font-bold block truncate">Sophia Valentine</span>
                <span className="text-[9px] text-rose-300">🇧🇩 Female Author</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLoginAs('damiano@romancha.club', 'billionaire123')}
              className="p-2 rounded-xl bg-[#12081a] hover:bg-rose-900/40 border border-rose-900/40 flex items-center gap-2 text-left transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                alt="Damian"
                className="w-7 h-7 rounded-lg object-cover"
              />
              <div className="min-w-0 truncate">
                <span className="text-[11px] text-white font-bold block truncate">Damian Cross</span>
                <span className="text-[9px] text-rose-300">🇬🇧 Male Creator</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
