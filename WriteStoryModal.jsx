import React, { useState } from 'react';
import { X, Feather, Image, Sparkles, Eye, CheckCircle2, Flame, Upload, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { realtimeHub } from '../utils/realtimeHub';

const PRESET_IMAGES = [
  { label: 'Midnight Penthouse', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Silk Sheets & Candles', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Moody Noir Alley', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Mediterranean Villa', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Rooftop Midnight Pool', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Champagne & Masquerade', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80' },
];

export default function WriteStoryModal({ isOpen, onClose, onPublishStory, defaultAuthor, defaultGender, userProfile }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState(defaultAuthor || 'Elena Vance');
  const [gender, setGender] = useState(defaultGender || 'Female'); // 'Female', 'Male', 'Non-Binary'
  const [category, setCategory] = useState('Sensual Romance');
  const [mood, setMood] = useState('Steamy & Intimate');
  const [coverImage, setCoverImage] = useState(PRESET_IMAGES[0].url);
  const [customImage, setCustomImage] = useState('');
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle local image file upload directly from device/mobile
  const handleDeviceImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result);
        setCustomImage('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please provide a title and story content!');
      return;
    }

    const wordCount = content.trim().split(/\s+/).length;
    const estReadTime = `${Math.max(1, Math.ceil(wordCount / 130))} min read`;
    const finalCover = uploadedImagePreview || customImage.trim() || coverImage;

    const newStory = {
      id: `story-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || 'A tale of forbidden desire and midnight passion',
      author: author.trim() || userProfile?.name || 'Anonymous Writer',
      authorGender: gender || userProfile?.gender || 'Female',
      authorCountry: userProfile?.country || 'Bangladesh',
      authorCountryFlag: userProfile?.countryFlag || '🇧🇩',
      authorAvatar: userProfile?.avatar || (gender === 'Female' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'),
      date: 'Just now',
      readTime: estReadTime,
      category: category,
      mood: mood,
      rating: '18+ Mature',
      coverImage: finalCover,
      likes: 1,
      bookmarks: 0,
      views: '1',
      featured: false,
      excerpt: content.slice(0, 160) + '...',
      content: content.trim()
    };

    // Broadcast live over SSE to all open clients/tabs!
    await realtimeHub.publishStory(newStory);

    onPublishStory(newStory);
    setSuccess(true);
    
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#170e20] border border-rose-900/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-900/40 bg-[#120819]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-white">Publish Story with Photo (Live Sync)</h2>
              <p className="text-xs text-rose-200/60 font-serif">Instantly appears across all connected readers & devices</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-rose-950/40 border border-rose-900/40 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`px-3 py-1 rounded-md transition-all ${activeTab === 'write' ? 'bg-rose-600 text-white font-semibold' : 'text-rose-200/70'}`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md transition-all ${activeTab === 'preview' ? 'bg-rose-600 text-white font-semibold' : 'text-rose-200/70'}`}
              >
                Preview
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-rose-900/40 text-rose-200 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {success ? (
          <div className="p-12 text-center space-y-4 my-auto">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-2xl font-bold font-serif text-white">Story Broadcasted Live!</h3>
            <p className="text-sm text-rose-200/70">Your story is now live across all active devices & readers in real-time.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'write' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title & Subtitle */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                      Story Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Whispers Behind the Velvet Curtain"
                      className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                      Subtitle / Hook (Optional)
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="e.g., When the fire between us burned hotter than the rules"
                      className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-4 py-2 text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Author, Gender, Category, Mood */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                      Author / Pen Name
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Elena Vance"
                      className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                      Gender Identity
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Female">Female 🌸</option>
                      <option value="Male">Male 🔥</option>
                      <option value="Non-Binary">Non-Binary ✨</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Sensual Romance">Sensual Romance</option>
                      <option value="Romantic Thriller">Romantic Thriller</option>
                      <option value="Dark Romance">Dark Romance</option>
                      <option value="Passionate Escapade">Passionate Escapade</option>
                      <option value="Workplace Desire">Workplace Desire</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-200/80 mb-1">
                      Mood Tag
                    </label>
                    <input
                      type="text"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="e.g., Seductive & Tense"
                      className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Cover Image Upload (Device Photo Upload + Presets + Custom URL) */}
                <div className="bg-[#120819] p-4 rounded-2xl border border-rose-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-rose-400" />
                      <span>Story Cover Image (Upload or Choose)</span>
                    </label>

                    {/* Direct Device Upload Button */}
                    <label 
                      htmlFor="cover-file-upload-2"
                      className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Device Photo</span>
                    </label>
                    <input
                      id="cover-file-upload-2"
                      type="file"
                      accept="image/*"
                      onChange={handleDeviceImageUpload}
                      className="hidden"
                    />
                  </div>

                  {uploadedImagePreview && (
                    <div className="relative rounded-xl overflow-hidden h-32 border-2 border-rose-500">
                      <img src={uploadedImagePreview} alt="Uploaded preview" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-semibold">
                        Uploaded from device ✓
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedImagePreview(null)}
                        className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Preset thumbnails */}
                  <div>
                    <span className="text-[11px] text-rose-200/60 block mb-1.5">Or choose high-aesthetic preset:</span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PRESET_IMAGES.map((img, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => {
                            setCoverImage(img.url);
                            setCustomImage('');
                            setUploadedImagePreview(null);
                          }}
                          className={`relative rounded-xl overflow-hidden h-14 border-2 transition-all ${
                            coverImage === img.url && !customImage && !uploadedImagePreview
                              ? 'border-rose-500 ring-2 ring-rose-500/50 scale-95'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] text-center text-white py-0.5 truncate px-0.5">
                            {img.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="url"
                    value={customImage}
                    onChange={(e) => {
                      setCustomImage(e.target.value);
                      setUploadedImagePreview(null);
                    }}
                    placeholder="Or paste any custom image link (URL) here..."
                    className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Content Area */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-rose-200/80">
                      Story Body / Chapter Content *
                    </label>
                    <span className="text-[11px] text-rose-200/50">
                      {content.trim() ? `${content.trim().split(/\s+/).length} words` : '0 words'}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your passionate story, dialogue, and intimate moments here..."
                    className="w-full bg-[#1e122b] border border-rose-900/40 rounded-xl p-4 text-sm text-white placeholder-rose-200/30 focus:outline-none focus:border-rose-500 font-serif leading-relaxed"
                  ></textarea>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-rose-900/40">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-200/70 hover:text-white hover:bg-rose-950/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Publish Story Live ✦</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Live Preview */
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden h-52 border border-rose-900/40">
                  <img
                    src={uploadedImagePreview || customImage || coverImage}
                    alt={title || 'Preview'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded bg-rose-600 text-white font-medium uppercase tracking-wider">
                        {category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-black/60 text-pink-300 border border-pink-500/30">
                        {gender}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-serif text-white mt-1.5">
                      {title || 'Story Title Preview'}
                    </h3>
                  </div>
                </div>

                <div className="bg-[#120819] p-5 rounded-2xl border border-rose-900/30 font-serif space-y-3">
                  <p className="text-xs text-rose-300">Author: {author || 'Anonymous Writer'} ({gender})</p>
                  <div className="text-sm text-white/90 whitespace-pre-line leading-relaxed">
                    {content || 'Your story content will be previewed here...'}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('write')}
                  className="w-full py-2 bg-rose-900/40 hover:bg-rose-900/60 text-xs text-rose-200 rounded-xl"
                >
                  Return to Edit
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
