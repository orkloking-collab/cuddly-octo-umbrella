// Persistent Account Database & Auth System (Email + Password + Data Restoration)
const ACCOUNTS_STORAGE_KEY = 'romancha_accounts_database_v2';
const CURRENT_SESSION_KEY = 'romancha_active_session_v2';

class AuthManager {
  constructor() {
    this.accounts = this.loadAccounts();
    this.activeUser = this.loadActiveSession();

    // Default seeded accounts for quick testing
    if (Object.keys(this.accounts).length === 0) {
      this.seedDefaultAccounts();
    }
  }

  loadAccounts() {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveAccounts() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(this.accounts));
    } catch (e) {
      console.error(e);
    }
  }

  loadActiveSession() {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(CURRENT_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveActiveSession(user) {
    if (typeof window === 'undefined') return;
    try {
      if (user) {
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CURRENT_SESSION_KEY);
      }
    } catch (e) {
      console.error(e);
    }
  }

  seedDefaultAccounts() {
    const elena = {
      id: 'usr-elena',
      email: 'elena@gmail.com',
      password: 'password123',
      name: 'Elena Vance',
      username: '@elena_vance',
      gender: 'Female',
      country: 'United States',
      countryFlag: '🇺🇸',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      bio: 'Author of Midnight Rain. Lover of late-night storms, red wine & dark romance.',
      socialLinks: {
        instagram: 'https://instagram.com/elena_romance',
        twitter: 'https://twitter.com/elena_writes',
        website: 'https://romancha.club/@elena'
      },
      role: 'VIP Queen Author',
      followers: 12450,
      following: 24,
      publishedStories: ['story-1', 'story-22'],
      uploadedReels: ['reel-1']
    };

    const sophia = {
      id: 'usr-sophia',
      email: 'sophia@romancha.club',
      password: 'password123',
      name: 'Sophia Valentine',
      username: '@sophia_v',
      gender: 'Female',
      country: 'Bangladesh',
      countryFlag: '🇧🇩',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      bio: 'Lover of late-night rain, dark romance thrillers & candlelight poetry.',
      socialLinks: {
        instagram: 'https://instagram.com/sophia_romance',
        twitter: 'https://twitter.com/sophia_v',
        website: 'https://romancha.club/@sophia'
      },
      role: 'VIP Creator',
      followers: 240,
      following: 18,
      publishedStories: [],
      uploadedReels: []
    };

    const damian = {
      id: 'usr-damian',
      email: 'damian@romancha.club',
      password: 'password123',
      name: 'Damian Cross',
      username: '@damian_cross',
      gender: 'Male',
      country: 'United Kingdom',
      countryFlag: '🇬🇧',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      bio: 'Billionaire dark romance author. Looking for passionate conversations & readers.',
      socialLinks: {
        instagram: 'https://instagram.com/damiancross_official',
        twitter: 'https://twitter.com/damian_cross',
        website: 'https://romancha.club/authors/damian'
      },
      role: 'VIP Master Author',
      followers: 3820,
      following: 15,
      publishedStories: ['story-2'],
      uploadedReels: ['reel-2']
    };

    this.accounts[elena.email.toLowerCase()] = elena;
    this.accounts[sophia.email.toLowerCase()] = sophia;
    this.accounts[damian.email.toLowerCase()] = damian;
    this.saveAccounts();
  }

  register(userData) {
    try {
      const cleanEmail = (userData.email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, error: 'Email address is required.' };
      }
      if (this.accounts[cleanEmail]) {
        return { success: false, error: 'An account with this email already exists! Please sign in.' };
      }

      const newUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        password: userData.password || 'password123',
        name: (userData.name || '').trim() || 'Romantic Writer',
        username: (userData.username || '').trim() || `@${((userData.name || 'writer').trim()).toLowerCase().replace(/\s+/g, '_')}`,
        gender: userData.gender || 'Female',
        country: userData.country || 'Bangladesh',
        countryFlag: userData.countryFlag || '🇧🇩',
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        bio: userData.bio || 'Passionate reader & creator on Romancha.',
        socialLinks: userData.socialLinks || {
          instagram: '',
          twitter: '',
          website: ''
        },
        role: 'Creator Member',
        followers: 0,
        following: 0,
        publishedStories: [],
        uploadedReels: []
      };

      this.accounts[cleanEmail] = newUser;
      this.saveAccounts();
      this.activeUser = newUser;
      this.saveActiveSession(newUser);
      return { success: true, account: newUser };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  login(emailOrObj, passwordInput) {
    try {
      let email = '';
      let password = '';
      if (typeof emailOrObj === 'object' && emailOrObj !== null) {
        email = emailOrObj.email || '';
        password = emailOrObj.password || '';
      } else {
        email = emailOrObj || '';
        password = passwordInput || '';
      }

      const cleanEmail = email.trim().toLowerCase();
      const account = this.accounts[cleanEmail];

      if (!account) {
        return { success: false, error: 'No account found with this email. Please sign up or create a new ID.' };
      }

      if (account.password && password && account.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      this.activeUser = account;
      this.saveActiveSession(account);
      return { success: true, account };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  logout() {
    this.activeUser = null;
    this.saveActiveSession(null);
  }

  updateProfile(updatedData) {
    if (!this.activeUser) {
      this.activeUser = updatedData;
    }
    const cleanEmail = (this.activeUser.email || 'sophia@romancha.club').toLowerCase();

    const merged = {
      ...this.activeUser,
      ...updatedData
    };

    this.accounts[cleanEmail] = merged;
    this.saveAccounts();
    this.activeUser = merged;
    this.saveActiveSession(merged);
    return merged;
  }

  getCurrentUser() {
    if (this.activeUser) return this.activeUser;
    const session = this.loadActiveSession();
    if (session) {
      this.activeUser = session;
      return session;
    }
    return this.accounts['sophia@romancha.club'] || this.accounts['elena@gmail.com'] || {
      id: 'usr-sophia',
      name: 'Sophia Valentine',
      username: '@sophia_v',
      gender: 'Female',
      country: 'Bangladesh',
      countryFlag: '🇧🇩',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      bio: 'Lover of late-night rain, dark romance thrillers & candlelight poetry.',
      email: 'sophia@romancha.club',
      role: 'VIP Creator',
      followers: 240,
      following: 18,
      socialLinks: {
        instagram: 'https://instagram.com/sophia_romance',
        twitter: 'https://twitter.com/sophia_v',
        website: 'https://romancha.club/@sophia'
      }
    };
  }

  getActiveUser() {
    return this.getCurrentUser();
  }
}

export const authStore = new AuthManager();
