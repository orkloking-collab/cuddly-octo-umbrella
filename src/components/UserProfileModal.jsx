import React, { useState } from 'react';
import { X, User, Camera, Feather, Check, LogOut, Link2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { countriesList } from '../data/mockCommunityData';
import { authStore } from '../utils/authStore';
import { realtimeHub } from '../utils/realtimeHub';
import { InstagramIcon, TwitterIcon, WebsiteIcon } from './SocialIcons';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
];

export default function UserProfileModal({ isOpen, onClose, userProfile, onSaveProfile, userStoriesCount, onOpenAuthModal, onLogout }) {
  const [name, setName] = useState(userProfile.name || 'Sophia Valentine');
  const [username, setUsername] = useState(userProfile.username || '@sophia_v');
  const [gender, setGender] = useState(userProfile.gender || 'Female');
  const [country, setCountry] = useState(userProfile.country || 'Bangladesh');
  const [countryFlag, setCountryFlag] = useState(userProfile.countryFlag || '🇧🇩');
  const [bio, setBio] = useState(userProfile.bio || 'Lover of late-night rain, dark romance thrillers & candlelight poetry.');
  const [avatar, setAvatar] = useState(userProfile.avatar || PRESET_AVATARS[0]);
  const [instagram, setInstagram] = useState(userProfile.socialLinks?.instagram || '');
  const [twitter, setTwitter] = useState(userProfile.socialLinks?.twitter || '');
  const [website, setWebsite] = useState(userProfile.socialLinks?.website || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCountryChange = (cName) => {
    setCountry(cName);
    const found = countriesList.find(c => c.name === cName);
    if (found) setCountryFlag(found.flag);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updated = {
      ...userProfile,
      name: name.trim(),
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      gender,
      country,
      countryFlag,
      bio: bio.trim(),
      avatar,
      socialLinks: {
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        website: website.trim()
      }
    };

    authStore.updateProfile(updated);
    onSaveProfile(updated);

    // Broadcast updated profile & links live in real time to everyone!
    await realtimeHub.publishProfileUpdate(updated);

    setSavedSuccess(true);
    
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      
      {/* Click Backdrop to close */}
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-[#180e22] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 my-auto z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-900/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-white">Your Creator ID Profile</h2>
              <p className="text-xs text-rose-200/60">Real-time synced bio, photo & social links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-rose-900/40 text-rose-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Status / Switch ID Banner */}
        <div className="p-3 rounded-2xl bg-[#120819] border border-rose-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
            <div className="truncate">
              <span className="text-white font-bold block truncate">{userProfile.email}</span>
              <span className="text-[10px] text-emerald-300">Active Creator ID • Real-Time Synced 🌐</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="text-[11px] text-pink-300 hover:text-white underline font-semibold"
            >
              Switch Account
            </button>
            <button
              type="button"
              onClick={() => {
                // Sign out of the server too, or a reload would silently
                // put you straight back in via the session cookie.
                authStore.signOut();
                if (onLogout) onLogout();
                onClose();
              }}
              className="p-1 text-rose-300 hover:text-red-400"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {savedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-serif text-white">Profile & Links Broadcasted Live!</h3>
            <p className="text-xs text-rose-200/70">All other users will now see your updated bio and social links in real time.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Avatar & File Upload */}
            <div className="flex items-center gap-4 bg-[#120819] p-3 rounded-2xl border border-rose-900/30">
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt={name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500/50 shadow-md"
                />
                <label 
                  htmlFor="avatar-file-edit-2"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white cursor-pointer transition-opacity"
                  title="Upload from device"
                >
                  <Camera className="w-5 h-5" />
                </label>
                <input
                  id="avatar-file-edit-2"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Profile Photo</span>
                  <label htmlFor="avatar-file-edit-2" className="text-[11px] text-pink-400 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>Upload Device Photo</span>
                  </label>
                </div>
                
                {/* Presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {PRESET_AVATARS.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatar(p)}
                      className={`w-6 h-6 rounded-lg overflow-hidden border transition-all ${
                        avatar === p ? 'border-rose-500 ring-2 ring-rose-500/40 scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={p} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Author / Display Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Elena Vance"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Handle / Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Country & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                  Country ({countryFlag})
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

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                  Gender Identity
                </label>
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
            </div>

            {/* Bio / About */}
            <div>
              <label className="block text-xs font-semibold text-rose-200/80 mb-1">About / Bio Section</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What kinds of romances or thrillers do you write/read?"
                className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-serif"
              ></textarea>
            </div>

            {/* Social & Portfolio Links (Real-time Broadcasted to everyone) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-rose-200/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Social Links & Portfolio</span>
                </span>
                <span className="text-[10px] text-emerald-400">⚡ Live broadcast to other users</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative flex items-center">
                  <div className="absolute left-2.5 text-pink-400">
                    <InstagramIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="Instagram link"
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl pl-8 pr-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-2.5 text-sky-400">
                    <TwitterIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="Twitter/X link"
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl pl-8 pr-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-2.5 text-emerald-400">
                    <WebsiteIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website / Blog link"
                    className="w-full bg-[#12081a] border border-rose-900/50 rounded-xl pl-8 pr-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-rose-900/30">
              <span className="text-[11px] text-rose-300 flex items-center gap-1">
                <Feather className="w-3.5 h-3.5" />
                <span>{userStoriesCount || 0} Stories</span>
                <span>•</span>
                <span>{userProfile.followers || 0} Fans</span>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-rose-200/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  Save & Broadcast Live ⚡
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
