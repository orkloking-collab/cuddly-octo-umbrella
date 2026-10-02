import React, { useState } from 'react';
import { Heart, Maximize2, X, Flame, Sparkles, Upload, Plus, Camera, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PhotoStoryGallery({ photoStories, userProfile, onViewPublicProfile, onOpenDirectChat }) {
  const [photos, setPhotos] = useState(photoStories);
  const [likedPhotoIds, setLikedPhotoIds] = useState([]);
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');

  const toggleLike = (id) => {
    if (likedPhotoIds.includes(id)) {
      setLikedPhotoIds(likedPhotoIds.filter(i => i !== id));
    } else {
      setLikedPhotoIds([...likedPhotoIds, id]);
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.6 }
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishPhoto = (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadImageUrl) return;

    const newPhoto = {
      id: `photo-${Date.now()}`,
      title: uploadTitle.trim(),
      caption: uploadCaption.trim() || 'A passionate visual moment captured in silence.',
      image: uploadImageUrl,
      author: userProfile?.name || 'Sophia Valentine',
      likes: 1
    };

    setPhotos([newPhoto, ...photos]);
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadCaption('');
    setUploadImageUrl('');

    confetti({ particleCount: 40, spread: 70, origin: { y: 0.5 } });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-900/30 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-950/50 border border-pink-500/30 text-pink-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Visual Micro-Fiction & Gallery</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-cinzel text-white">
            Visual Desires & Photo Tales
          </h2>
          <p className="text-sm text-rose-200/70 font-light font-serif">
            Evocative photography paired with sensual micro-fiction. Upload and share your visual stories.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="self-start sm:self-center px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white font-bold text-xs shadow-xl shadow-rose-900/40 flex items-center gap-2 shrink-0 hover:scale-105 active:scale-95 transition-all"
        >
          <Camera className="w-4 h-4" />
          <span>Upload Visual Story</span>
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((item) => {
          const isLiked = likedPhotoIds.includes(item.id);

          return (
            <div
              key={item.id}
              className="group relative rounded-3xl overflow-hidden bg-[#180e22] border border-rose-900/30 hover:border-rose-500/50 shadow-xl transition-all duration-500 flex flex-col justify-between"
            >
              {/* Photo Area */}
              <div 
                className="relative h-80 overflow-hidden cursor-pointer"
                onClick={() => setActivePhotoModal(item)}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#180e22] via-[#180e22]/20 to-transparent"></div>
                
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full text-white">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>

              {/* Text & Caption */}
              <div className="p-5 flex-1 flex flex-col justify-between -mt-6 relative z-10 bg-[#180e22]">
                <div>
                  <h3 className="text-base font-bold font-serif text-white group-hover:text-rose-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-rose-100/80 font-serif italic mt-2 leading-relaxed">
                    {item.caption}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-900/40 flex items-center justify-between text-xs">
                  <span 
                    onClick={() => {
                      if (onViewPublicProfile) {
                        onViewPublicProfile({
                          name: item.author,
                          avatar: item.image,
                          gender: 'Female',
                          bio: `Creator of "${item.title}" visual photo tale.`,
                          followers: 1400
                        });
                      }
                    }}
                    className="text-rose-300/80 hover:text-white cursor-pointer font-semibold underline"
                  >
                    by {item.author}
                  </span>
                  
                  <button
                    onClick={() => toggleLike(item.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                      isLiked ? 'bg-rose-600 text-white font-bold' : 'text-rose-200/70 hover:text-white bg-rose-950/40'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{(item.likes || 12) + (isLiked ? 1 : 0)}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Photo Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#180e22] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-rose-900/40">
              <h3 className="text-base font-bold font-cinzel text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-400" />
                <span>Upload New Visual Story</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 text-rose-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishPhoto} className="space-y-3.5">
              
              {/* File upload zone */}
              <div className="p-4 bg-[#100718] rounded-2xl border-2 border-dashed border-rose-500/40 text-center space-y-2">
                <input
                  type="file"
                  id="photo-file-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="photo-file-upload" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-rose-400 mx-auto mb-1 animate-bounce" />
                  <span className="text-xs font-bold text-white block">Choose Photo from Device</span>
                  <span className="text-[10px] text-rose-200/50">High-resolution romantic or moody photo</span>
                </label>
                {uploadImageUrl && (
                  <div className="mt-2 relative w-24 h-24 mx-auto rounded-xl overflow-hidden border border-rose-500/50">
                    <img src={uploadImageUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Visual Title *</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Whispers in the Amber Light"
                  className="w-full bg-[#100718] border border-rose-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-200/80 mb-1">Poetic Story / Caption</label>
                <textarea
                  rows={3}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Describe the romantic sensation..."
                  className="w-full bg-[#100718] border border-rose-900/50 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-serif"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-rose-900/30">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-rose-200/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Publish Photo Story 🚀
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Expanded Photo View Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-[#160a1e] border border-rose-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="md:w-3/5 h-80 md:h-[500px]">
              <img
                src={activePhotoModal.image}
                alt={activePhotoModal.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-between space-y-4 bg-[#14081c]">
              <div className="space-y-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40">
                  Visual Micro-Fiction
                </span>
                <h3 className="text-xl md:text-2xl font-bold font-cinzel text-white leading-tight">
                  {activePhotoModal.title}
                </h3>
                <p className="text-sm text-rose-100/90 font-serif leading-relaxed italic">
                  "{activePhotoModal.caption}"
                </p>
                <p className="text-xs text-rose-300">
                  Captured by <strong>{activePhotoModal.author}</strong>
                </p>
              </div>

              <div className="pt-4 border-t border-rose-900/40 flex items-center justify-between">
                <button
                  onClick={() => toggleLike(activePhotoModal.id)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  <span>Like Visual</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
