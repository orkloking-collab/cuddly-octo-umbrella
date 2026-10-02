import React, { useMemo, useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import StoryGrid from './components/StoryGrid';
import StoryReaderModal from './components/StoryReaderModal';
import DiscussionForum from './components/DiscussionForum';
import PhotoStoryGallery from './components/PhotoStoryGallery';
import WriteStoryModal from './components/WriteStoryModal';
import BookmarksModal from './components/BookmarksModal';
import UserProfileModal from './components/UserProfileModal';
import PublicUserProfileModal from './components/PublicUserProfileModal';
import ContactWriterModal from './components/ContactWriterModal';
import AccountAuthModal from './components/AccountAuthModal';
import FeedbackBoard from './components/FeedbackBoard';
import ReelsVideoFeed from './components/ReelsVideoFeed';
import LiveChatLounge from './components/LiveChatLounge';
import LiveOnlineLoveMatch from './components/LiveOnlineLoveMatch';
import DirectChatModal from './components/DirectChatModal';
import VideoCallModal from './components/VideoCallModal';
import AgentFeedbackWidget from './components/AgentFeedbackWidget';
import LeaderboardView from './components/LeaderboardView';
import SwipeDeck from './components/SwipeDeck';
import InboxList from './components/InboxList';
import LikesYou from './components/LikesYou';
import SafetyCentre from './components/SafetyCentre';
import OnboardingWizard from './components/OnboardingWizard';
import ChatThread from './components/ChatThread';
import PremiumSheet from './components/PremiumSheet';
import AgeGate from './components/AgeGate';
import { hasVerifiedAge } from './utils/ageVerification';
import { datingStore } from './utils/datingStore';
import { useDating } from './utils/useDating';
import AdBanner from './components/AdBanner';
import LiveNotificationToast from './components/LiveNotificationToast';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import { initialStories, initialDiscussions, photoStories } from './data/mockData';
import { initialReels } from './data/mockCommunityData';
import { ambientSound } from './utils/audioSynth';
import { realtimeHub } from './utils/realtimeHub';
import { authStore } from './utils/authStore';
import { Heart, Radio } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('discover'); // discover | inbox | likes | reels | stories | chat | leaderboard | feedback | discussions | photos | safety
  const [datingSubTab, setDatingSubTab] = useState('swipe'); // 'swipe' (deck) | 'radar' (grid)

  const { state: dating, store: datingApi } = useDating();
  const [ageVerifiedAt, setAgeVerifiedAt] = useState(() => (hasVerifiedAge() ? Date.now() : null));
  const [showOnboarding, setShowOnboarding] = useState(() => !datingStore.isOnboarded());
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [safetyTarget, setSafetyTarget] = useState(null);
  const [chatWith, setChatWith] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => authStore.getCurrentUser());
  void currentUser;

  const [stories, setStories] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_stories');
    return saved ? JSON.parse(saved) : initialStories;
  });

  const [reels, setReels] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_reels');
    return saved ? JSON.parse(saved) : initialReels;
  });
  
  const [discussions, setDiscussions] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_discussions');
    return saved ? JSON.parse(saved) : initialDiscussions;
  });
  
  const [userProfile, setUserProfile] = useState(() => {
    const user = authStore.getCurrentUser();
    return {
      id: user.id || 'usr-1',
      name: user.name || 'New Member',
      username: user.username || `@${(user.name || 'member').toLowerCase().replace(/\s+/g, '_')}`,
      gender: user.gender || 'Woman',
      country: user.country || 'Bangladesh',
      countryFlag: user.countryFlag || '🇧🇩',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      bio: user.bio || 'Just joined. Tell me something specific about yourself first.',
      email: user.email || '',
      role: user.role || 'Member',
      followers: user.followers || 0,
      following: user.following || 0,
      socialLinks: user.socialLinks || { instagram: '', twitter: '', website: '' }
    };
  });

  // Identity = legacy author profile + the dating profile the user actually built.
  const identity = useMemo(() => {
    const dp = dating.profile;
    return {
      ...userProfile,
      id: dp.id || userProfile.id,
      name: dp.name || userProfile.name,
      age: dp.age ?? undefined,
      pronouns: dp.pronouns || '',
      gender: dp.gender || userProfile.gender,
      city: dp.city || '',
      lookingFor: dp.lookingFor || '',
      interests: dp.interests || [],
      verified: Boolean(dp.verified) || dating.verification.status === 'verified',
      country: dp.country || userProfile.country,
      countryFlag: dp.countryFlag || userProfile.countryFlag,
      avatar: dp.photos?.[0] || userProfile.avatar,
      photos: dp.photos || [],
      bio: dp.bio || userProfile.bio,
    };
  }, [userProfile, dating.profile, dating.verification]);

  const [followingAuthors, setFollowingAuthors] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_following');
    return saved ? JSON.parse(saved) : ['Elena Vance', 'Damian Cross'];
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoryForReader, setSelectedStoryForReader] = useState(null);
  
  // Modals
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [contactAuthorTarget, setContactAuthorTarget] = useState(null);
  const [directChatTarget, setDirectChatTarget] = useState(null);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);
  const [publicProfileUser, setPublicProfileUser] = useState(null);
  const [isPublicProfileOpen, setIsPublicProfileOpen] = useState(false);
  const [videoCallPartner, setVideoCallPartner] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  
  // Notifications
  const [customToastAlert, setCustomToastAlert] = useState(null);

  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_bookmarks');
    return saved ? JSON.parse(saved) : ['story-1', 'story-2'];
  });
  const [likedStoryIds, setLikedStoryIds] = useState(() => {
    const saved = localStorage.getItem('romancha_v5_likes');
    return saved ? JSON.parse(saved) : ['story-1'];
  });

  const [soundState, setSoundState] = useState(null); // 'rain' | 'warm' | null

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('romancha_v5_stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('romancha_v5_reels', JSON.stringify(reels));
  }, [reels]);

  useEffect(() => {
    localStorage.setItem('romancha_v5_discussions', JSON.stringify(discussions));
  }, [discussions]);

  useEffect(() => {
    localStorage.setItem('romancha_v5_user', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('romancha_v5_following', JSON.stringify(followingAuthors));
  }, [followingAuthors]);

  useEffect(() => {
    localStorage.setItem('romancha_v5_bookmarks', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  useEffect(() => {
    localStorage.setItem('romancha_v5_likes', JSON.stringify(likedStoryIds));
  }, [likedStoryIds]);

  // Real-time Hub listener for Stories, Reels, Profile Updates, Feedbacks published by any connected device
  useEffect(() => {
    const unsubStories = realtimeHub.subscribeStories((incomingStory) => {
      setStories((prev) => {
        if (prev.some(s => s.id === incomingStory.id)) return prev;
        
        setCustomToastAlert({
          id: Date.now(),
          type: 'submit',
          user: incomingStory.author,
          gender: incomingStory.authorGender || 'Creator',
          text: `⚡ LIVE BROADCAST: "${incomingStory.title}" (${incomingStory.countryFlag || '🔥'})`
        });

        return [incomingStory, ...prev];
      });
    });

    const unsubReels = realtimeHub.subscribeReels((incomingReel) => {
      setReels((prev) => {
        if (prev.some(r => r.id === incomingReel.id)) return prev;
        
        setCustomToastAlert({
          id: Date.now(),
          type: 'submit',
          user: incomingReel.author,
          gender: incomingReel.authorGender || 'Creator',
          text: `🎬 NEW REEL UPLOADED: "${incomingReel.title}"`
        });

        return [incomingReel, ...prev];
      });
    });

    const unsubProfiles = realtimeHub.subscribeProfileUpdates((incomingProfile) => {
      // If currently viewing this user's profile, update it dynamically in real time!
      setPublicProfileUser(prev => {
        if (prev && (prev.name?.toLowerCase() === incomingProfile.name?.toLowerCase() || prev.id === incomingProfile.id)) {
          return { ...prev, ...incomingProfile };
        }
        return prev;
      });

      setCustomToastAlert({
        id: Date.now(),
        type: 'like',
        user: incomingProfile.name,
        gender: incomingProfile.gender || 'Creator',
        text: `⚡ Updated their profile, bio & social links in real time!`
      });
    });

    const unsubFeedbacks = realtimeHub.subscribeFeedbacks((incomingFb) => {
      setCustomToastAlert({
        id: Date.now(),
        type: 'forum',
        user: incomingFb.author,
        gender: incomingFb.gender || 'User',
        text: `💡 Submitted new feature wish: "${incomingFb.title}"`
      });
    });

    return () => {
      unsubStories();
      unsubReels();
      unsubProfiles();
      unsubFeedbacks();
    };
  }, []);

  // Ambient sound controller
  const toggleSound = (type) => {
    if (type === 'stop' || soundState === type) {
      ambientSound.stop();
      setSoundState(null);
    } else if (type === 'rain') {
      ambientSound.playRain();
      setSoundState('rain');
    } else if (type === 'warm') {
      ambientSound.playWarmPad();
      setSoundState('warm');
    }
  };

  // Toggle Author Follow
  const handleToggleFollow = (authorName) => {
    setFollowingAuthors((prev) => {
      const isAlready = prev.includes(authorName);
      const updated = isAlready ? prev.filter((a) => a !== authorName) : [...prev, authorName];
      
      setCustomToastAlert({
        id: Date.now(),
        type: 'like',
        user: userProfile.name,
        gender: userProfile.gender,
        text: isAlready ? `unfollowed ${authorName}` : `started following ${authorName} 🔥`
      });

      return updated;
    });
  };

  // Toggle story bookmark
  const handleToggleBookmark = (id) => {
    setBookmarkedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle story like
  const handleToggleLike = (id) => {
    setLikedStoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Publish new story
  const handlePublishStory = (newStory) => {
    setStories(prev => [newStory, ...prev]);
    setActiveTab('stories');
    
    // Save under active account in authStore
    const active = authStore.getCurrentUser();
    if (active && active.email) {
      const existing = active.savedStories || [];
      authStore.updateProfile({
        savedStories: [newStory, ...existing.filter(s => s.id !== newStory.id)]
      });
    }

    setCustomToastAlert({
      id: Date.now(),
      type: 'submit',
      user: newStory.author,
      gender: newStory.authorGender || userProfile.gender,
      text: `just published a new story: "${newStory.title}" (${userProfile.countryFlag})`
    });
  };

  // Add new discussion
  const handleAddDiscussion = (newDisc) => {
    setDiscussions([newDisc, ...discussions]);
    setCustomToastAlert({
      id: Date.now(),
      type: 'forum',
      user: newDisc.author,
      gender: userProfile.gender,
      text: `posted a new midnight confession topic: "${newDisc.title}"`
    });
  };

  // Add reply to discussion
  const handleAddReply = (discussionId, reply) => {
    setDiscussions(discussions.map(d => {
      if (d.id === discussionId) {
        return {
          ...d,
          replies: [...(d.replies || []), reply],
          repliesCount: (d.repliesCount || 0) + 1
        };
      }
      return d;
    }));
  };

  // Handlers for Contact Message
  const handleMessageSent = (msgData) => {
    setCustomToastAlert({
      id: Date.now(),
      type: 'contact',
      user: msgData.senderName,
      gender: 'Reader',
      text: `sent a secret note to ${msgData.author} regarding "${msgData.storyTitle}"`
    });
  };

  // Handle restored login
  const handleAccountLoginSuccess = (account) => {
    setCurrentUser(account);
    setUserProfile(account);
    
    if (account.savedStories && account.savedStories.length > 0) {
      setStories((prev) => {
        const ids = new Set(prev.map(s => s.id));
        const missing = account.savedStories.filter(s => !ids.has(s.id));
        return [...missing, ...prev];
      });
    }

    if (account.savedBookmarks && Array.isArray(account.savedBookmarks)) {
      setBookmarkedIds(account.savedBookmarks);
    }

    if (account.savedLikes && Array.isArray(account.savedLikes)) {
      setLikedStoryIds(account.savedLikes);
    }

    if (account.followingAuthors && Array.isArray(account.followingAuthors)) {
      setFollowingAuthors(account.followingAuthors);
    }

    setCustomToastAlert({
      id: Date.now(),
      type: 'like',
      user: account.name,
      gender: account.gender,
      text: `Welcome back! Account restored (${account.email}) 💖`
    });
  };

  const handleAgePass = ({ age, dob }) => {
    setAgeVerifiedAt(Date.now());
    void dob;
    if (!datingStore.getProfile().age) datingStore.updateProfile({ age, createdAt: Date.now() });
    if (!datingStore.isOnboarded()) setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setActiveTab('discover');
    setCustomToastAlert({
      id: Date.now(),
      type: 'like',
      user: datingStore.getProfile().name || 'You',
      gender: 'Member',
      text: 'profile published — your deck is live 💖'
    });
  };

  const handleOpenChat = (matchId) => setChatWith(matchId);
  const handleOpenSafety = (target) => {
    setSafetyTarget(target?.id ? { ...target } : null);
    setIsSafetyOpen(true);
  };
  const handleMatchUpdates = (updated) => {
    if (updated && typeof updated === 'object') setUserProfile(updated);
  };

  const handleOpenDirectChat = (user) => {
    setDirectChatTarget(user || null);
    setIsDirectChatOpen(true);
  };

  const handleViewPublicProfile = (user) => {
    setPublicProfileUser(user);
    setIsPublicProfileOpen(true);
    if (user?.id && String(user.id).startsWith('dl-')) datingApi.recordVisit(user.id);
  };

  const handleStartVideoCall = (partner) => {
    setVideoCallPartner(partner);
    setIsVideoCallOpen(true);
  };

  // Filter stories
  const filteredStories = stories.filter((story) => {
    const matchesCategory = selectedCategory === 'All' || story.category === selectedCategory;
    const matchesSearch = 
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredStory = stories.find(s => s.featured) || stories[0];
  const bookmarkedStoryObjects = stories.filter(s => bookmarkedIds.includes(s.id));
  const userStoriesCount = stories.filter(s => s.author === userProfile.name).length;

  return (
    <div className="min-h-screen bg-[#0d0714] text-[#f7e8ee] flex flex-col selection:bg-rose-600 selection:text-white pb-16 xl:pb-0">
      
      {/* Live Toast Activity Notifications */}
      <LiveNotificationToast 
        customAlert={customToastAlert}
        onClearCustomAlert={() => setCustomToastAlert(null)}
      />

      {/* Floating Agent Support & Feedback Widget (Easily Minimized & Closed) */}
      <AgentFeedbackWidget
        userProfile={identity}
        onOpenFeedbackTab={() => setActiveTab('feedback')}
      />

      {/* Dedicated 1-on-1 Direct Messaging Inbox Modal (Photos, Videos & Voice Notes) */}
      <DirectChatModal
        isOpen={isDirectChatOpen}
        onClose={() => setIsDirectChatOpen(false)}
        targetUser={directChatTarget}
        userProfile={identity}
      />

      {/* Secret 1-on-1 Video Call Simulator Modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        partnerUser={videoCallPartner}
        userProfile={identity}
      />

      {/* Author / User Public Profile & Bio Modal with Real-Time Stories, Reels & Social Links */}
      <PublicUserProfileModal
        isOpen={isPublicProfileOpen}
        onClose={() => setIsPublicProfileOpen(false)}
        user={publicProfileUser}
        isFollowing={publicProfileUser ? followingAuthors.includes(publicProfileUser.name) : false}
        onToggleFollow={handleToggleFollow}
        onOpenDirectChat={(u) => handleOpenDirectChat(u)}
        onReadStory={(story) => setSelectedStoryForReader(story)}
        onPlayReel={() => setActiveTab('reels')}
        allStories={stories}
        allReels={reels}
        allPhotos={photoStories}
      />

      {/* Top Banner / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={datingApi.unreadTotal()}
        newMatchCount={datingApi.inboxes().filter((m) => m.needsHello).length}
        likesCount={datingApi.pendingLikes().length}
        onOpenPremium={() => setIsPremiumOpen(true)}
        isPremium={datingApi.isPremium()}
        onOpenWriteModal={() => setIsWriteModalOpen(true)}
        bookmarksCount={bookmarkedIds.length}
        onOpenBookmarks={() => setIsBookmarksModalOpen(true)}
        soundState={soundState}
        toggleSound={toggleSound}
        userProfile={identity}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Top Luxury Sponsor Ad Banner (Hidden during Fullscreen Reels) */}
      {activeTab !== 'reels' && (
        <AdBanner type="banner" adIndex={0} />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* DISCOVER: swipe deck + live radar */}
        {activeTab === 'discover' && (
          <div className="space-y-5">
            <div className="mx-auto flex max-w-md items-center gap-2 px-4 pt-6">
              <div className="flex flex-1 bg-[#160a20] p-1.5 rounded-2xl border border-rose-500/40 shadow-xl">
                <button
                  onClick={() => setDatingSubTab('swipe')}
                  aria-pressed={datingSubTab === 'swipe'}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    datingSubTab === 'swipe' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/50' : 'text-rose-200/70 hover:text-white'
                  }`}
                >
                  <Heart className="w-4 h-4 fill-rose-300 text-rose-300" />
                  <span>Deck</span>
                </button>
                <button
                  onClick={() => setDatingSubTab('radar')}
                  aria-pressed={datingSubTab === 'radar'}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    datingSubTab === 'radar' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/50' : 'text-rose-200/70 hover:text-white'
                  }`}
                >
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Nearby ({identity.city || 'you'})</span>
                </button>
              </div>
              <button
                onClick={() => datingApi.boost(datingApi.isPremium() ? 1 : 0.5)}
                title="Boost: 30 min at the top of local decks"
                className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/12 px-3 py-2.5 text-[11px] font-bold text-fuchsia-200 hover:bg-fuchsia-500/20"
              >
                {datingApi.isBoosting() ? 'BOOSTING' : 'BOOST'}
              </button>
            </div>

            {datingSubTab === 'swipe' ? (
              <SwipeDeck
                onOpenChat={handleOpenChat}
                onOpenPremium={() => setIsPremiumOpen(true)}
                onOpenProfile={() => setShowOnboarding(true)}
                onOpenSafety={handleOpenSafety}
              />
            ) : (
              <LiveOnlineLoveMatch
                onOpenDirectChat={handleOpenDirectChat}
                userProfile={identity}
                onOpenContactAuthor={(target) => setContactAuthorTarget(target)}
                followingAuthors={followingAuthors}
                onToggleFollow={handleToggleFollow}
                onViewPublicProfile={handleViewPublicProfile}
              />
            )}
          </div>
        )}

        {/* MATCHES / MESSAGES */}
        {activeTab === 'inbox' && (
          <InboxList
            onOpenLikes={() => setActiveTab('likes')}
            onSwipe={() => { setDatingSubTab('swipe'); setActiveTab('discover'); }}
            onOpenVideoCall={handleStartVideoCall}
            onOpenSafety={handleOpenSafety}
          />
        )}

        {/* WHO LIKES YOU */}
        {activeTab === 'likes' && (
          <LikesYou onOpenPremium={() => setIsPremiumOpen(true)} onOpenChat={handleOpenChat} />
        )}

        {/* SAFETY CENTRE as a full tab */}
        {activeTab === 'safety' && (
          <div className="px-0">
            <SafetyCentre open onClose={() => setActiveTab('discover')} targetProfile={null} />
          </div>
        )}

        {/* FULLSCREEN TIKTOK / INSTAGRAM REELS VIDEO FEED */}
        {activeTab === 'reels' && (
          <ReelsVideoFeed
            followingAuthors={followingAuthors}
            onToggleFollow={handleToggleFollow}
            userProfile={identity}
            onOpenDirectChat={handleOpenDirectChat}
            onViewPublicProfile={handleViewPublicProfile}
          />
        )}

        {/* NOVELS & STORIES TAB */}
        {activeTab === 'stories' && (
          <>
            <HeroSection
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              featuredStory={featuredStory}
              onReadStory={(story) => setSelectedStoryForReader(story)}
              onOpenWriteModal={() => setIsWriteModalOpen(true)}
            />

            <StoryGrid
              stories={filteredStories.slice(0, 6)}
              onReadStory={(story) => setSelectedStoryForReader(story)}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              likedIds={likedStoryIds}
              onToggleLike={handleToggleLike}
              onOpenContactAuthor={(target) => setContactAuthorTarget(target)}
              onViewPublicProfile={handleViewPublicProfile}
              onOpenDirectChat={handleOpenDirectChat}
            />

            {/* In-Feed Native Sponsored Ad */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdBanner type="native" adIndex={1} />
            </div>

            {/* Remaining Stories */}
            <StoryGrid
              stories={filteredStories.slice(6)}
              onReadStory={(story) => setSelectedStoryForReader(story)}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              likedIds={likedStoryIds}
              onToggleLike={handleToggleLike}
              onOpenContactAuthor={(target) => setContactAuthorTarget(target)}
              onViewPublicProfile={handleViewPublicProfile}
              onOpenDirectChat={handleOpenDirectChat}
            />
          </>
        )}

        {/* LIVE CHAT & ONLINE LOUNGE TAB */}
        {activeTab === 'chat' && (
          <LiveChatLounge
            userProfile={identity}
            onOpenContactAuthor={(target) => setContactAuthorTarget(target)}
          />
        )}

        {/* FEEDBACK & FEATURE WISHLIST TAB */}
        {activeTab === 'feedback' && (
          <FeedbackBoard
            userProfile={identity}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            followingAuthors={followingAuthors}
            onToggleFollow={handleToggleFollow}
            onReadStory={(story) => setSelectedStoryForReader(story)}
            stories={stories}
          />
        )}

        {/* FORUM TAB */}
        {activeTab === 'discussions' && (
          <DiscussionForum
            discussions={discussions}
            onAddDiscussion={handleAddDiscussion}
            onAddReply={handleAddReply}
          />
        )}

        {/* VISUALS GALLERY TAB */}
        {activeTab === 'photos' && (
          <PhotoStoryGallery 
            photoStories={photoStories}
            userProfile={identity}
            onViewPublicProfile={handleViewPublicProfile}
            onOpenDirectChat={handleOpenDirectChat}
          />
        )}

      </main>

      {/* Footer (Hidden on Fullscreen Reels for True Cinema Experience) */}
      {activeTab !== 'reels' && (
        <Footer
          onOpenWriteModal={() => setIsWriteModalOpen(true)}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={datingApi.unreadTotal()}
        likesCount={datingApi.pendingLikes().length}
        onOpenWriteModal={() => setIsWriteModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenDirectChat={() => handleOpenDirectChat()}
      />

      {/* Reader Modal */}
      {selectedStoryForReader && (
        <StoryReaderModal
          story={selectedStoryForReader}
          onClose={() => setSelectedStoryForReader(null)}
          isBookmarked={bookmarkedIds.includes(selectedStoryForReader.id)}
          onToggleBookmark={handleToggleBookmark}
          isLiked={likedStoryIds.includes(selectedStoryForReader.id)}
          onToggleLike={handleToggleLike}
          soundState={soundState}
          toggleSound={toggleSound}
          onOpenContactAuthor={(target) => setContactAuthorTarget(target)}
        />
      )}

      {/* Write Story Modal */}
      <WriteStoryModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onPublishStory={handlePublishStory}
        defaultAuthor={userProfile.name}
        defaultGender={userProfile.gender}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={identity}
        onSaveProfile={(updated) => {
          setUserProfile(updated);
          authStore.updateProfile(updated);
          datingApi.updateProfile({
            name: updated.name,
            bio: updated.bio,
            gender: updated.gender,
            country: updated.country,
            countryFlag: updated.countryFlag,
            photos: updated.photos?.length ? updated.photos : (updated.avatar ? [updated.avatar] : []),
          });
        }}
        userStoriesCount={userStoriesCount}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          const fresh = authStore.getCurrentUser();
          setUserProfile(fresh);
          handleMatchUpdates(null);
        }}
      />

      {/* Account Email & Password Auth Modal */}
      <AccountAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleAccountLoginSuccess}
      />

      {/* Direct Contact Author Modal */}
      {contactAuthorTarget && (
        <ContactWriterModal
          isOpen={!!contactAuthorTarget}
          onClose={() => setContactAuthorTarget(null)}
          targetAuthor={contactAuthorTarget}
          storyTitle={contactAuthorTarget.title}
          onMessageSent={handleMessageSent}
        />
      )}

      {/* 18+ gate (first thing anyone sees) */}
      {!ageVerifiedAt && <AgeGate onPass={handleAgePass} />}

      {/* Profile builder */}
      <OnboardingWizard
        open={showOnboarding && Boolean(ageVerifiedAt)}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        prefill={{ ...dating.profile, name: dating.profile.name || identity.name }}
      />

      {/* Match inbox -> 1:1 thread (opened from a match popup) */}
      {chatWith && (
        <ChatThread
          matchId={chatWith}
          onClose={() => setChatWith(null)}
          onOpenVideoCall={handleStartVideoCall}
          onOpenSafety={handleOpenSafety}
          onOpenProfile={handleViewPublicProfile}
        />
      )}

      <PremiumSheet
        open={isPremiumOpen}
        onClose={() => setIsPremiumOpen(false)}
        isPremium={datingApi.isPremium()}
        onActivate={(plan) => { datingApi.setPremium(plan); }}
      />

      <SafetyCentre
        open={isSafetyOpen && activeTab !== 'safety'}
        onClose={() => { setIsSafetyOpen(false); setSafetyTarget(null); }}
        targetProfile={safetyTarget}
      />

      {/* Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksModalOpen}
        onClose={() => setIsBookmarksModalOpen(false)}
        bookmarkedStories={bookmarkedStoryObjects}
        onReadStory={(story) => setSelectedStoryForReader(story)}
        onRemoveBookmark={handleToggleBookmark}
      />
    </div>
  );
}
