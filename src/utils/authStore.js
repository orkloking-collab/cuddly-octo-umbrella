// Persistent Account Database & Auth System (Email + Password + Data Restoration)
//
// Two modes, and the difference matters:
//   * server mode — credentials, sessions and lockouts live in the Romancha
//     backend (scrypt hashes, httpOnly session cookies, DB-backed lockouts). The
//     browser keeps only a mirror of the profile for rendering.
//   * local mode — no API on this host (static build, file://). The old
//     localStorage behaviour is kept so the prototype still works, with the same
//     "never store a plaintext password" rule.
import { serverSync } from './serverSync.js';
import { datingStore } from './datingStore.js';
const ACCOUNTS_STORAGE_KEY = 'romancha_accounts_database_v3';
const CURRENT_SESSION_KEY = 'romancha_active_session_v2';
const LOCKOUT_KEY = 'romancha_login_lockout_v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Password storage
 * ----------------
 * Passwords used to be written to localStorage in clear text, which is both a
 * privacy leak (any XSS or anyone with the device reads them) and a false
 * signal about how the real product would work. They are now salted and hashed
 * before persisting.
 *
 * IMPORTANT: client-side hashing is NOT real authentication. Any browser
 * storage can be rewritten by its owner, so this only stops shoulder-surfing and
 * plaintext scraping. A production Romancha must verify credentials on a server
 * with argon2id/bcrypt, sessions in httpOnly cookies, and rate limiting.
 */
const COMMON_PASSWORDS = new Set(['password', 'password123', '12345678', 'qwertyuiop', 'iloveyou', 'bangladesh', 'romancha']);

export function hashSecret(secret, salt) {
  const input = `${salt}::${secret}`;
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c + i, 0x85ebca6b) >>> 0;
    if (i % 7 === 0) h1 = (h1 << 5) - h1 + (h2 >>> 3) >>> 0;
  }
  return `v1:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export function makeSalt() {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(value || '').trim());
}

export function passwordIssues(secret) {
  const pw = String(secret || '');
  const out = [];
  if (pw.length < 10) out.push('use at least 10 characters');
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) out.push('mix letters and numbers');
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) out.push('avoid a commonly leaked password');
  return out;
}

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
    } catch {
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
    } catch {
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
      passwordHash: hashSecret('password123', 'romancha-demo-salt'),
      demoPassword: 'password123',
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
      passwordHash: hashSecret('password123', 'romancha-demo-salt'),
      demoPassword: 'password123',
      name: '',
      username: '',
      gender: '',
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
      passwordHash: hashSecret('password123', 'romancha-demo-salt'),
      demoPassword: 'password123',
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
      if (!isEmail(cleanEmail)) {
        return { success: false, error: 'That email address does not look valid.' };
      }
      const problems = passwordIssues(userData.password);
      if (problems.length) {
        return { success: false, error: `Password needs to: ${problems.join('; ')}.` };
      }
      if (this.accounts[cleanEmail]) {
        return { success: false, error: 'An account with this email already exists! Please sign in.' };
      }

      const salt = makeSalt();
      const newUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        salt,
        passwordHash: hashSecret(userData.password, salt),
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

      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !isEmail(cleanEmail)) {
        return { success: false, error: 'Enter a valid email address.' };
      }

      const lock = this.readLockout(cleanEmail);
      if (lock.lockedFor > 0) {
        return { success: false, error: `Too many failed attempts. Try again in ${Math.ceil(lock.lockedFor / 60000)} min.` };
      }

      const account = this.accounts[cleanEmail];
      if (!account) {
        // Same message as a wrong password: do not confirm which emails are registered.
        return { success: false, error: 'Email or password is incorrect.' };
      }

      const stored = account.passwordHash || hashSecret(account.password || '', account.salt || '');
      const provided = hashSecret(password || '', account.salt || '');
      if (account.passwordHash && stored !== provided) {
        this.bumpLockout(cleanEmail);
        return { success: false, error: 'Email or password is incorrect.' };
      }
      this.clearLockout(cleanEmail);
      delete account.password; // never keep legacy plaintext once hashed

      this.activeUser = account;
      this.saveActiveSession(account);
      return { success: true, account };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  readLockout(email) {
    try {
      const raw = localStorage.getItem(LOCKOUT_KEY);
      const map = raw ? JSON.parse(raw) : {};
      const entry = map[email] || { attempts: 0, at: 0 };
      if (entry.at && Date.now() - entry.at > LOCKOUT_MS) return { attempts: 0, lockedFor: 0 };
      const lockedFor = entry.attempts >= MAX_ATTEMPTS ? LOCKOUT_MS - (Date.now() - entry.at) : 0;
      return { attempts: entry.attempts || 0, lockedFor: Math.max(0, lockedFor) };
    } catch {
      return { attempts: 0, lockedFor: 0 };
    }
  }

  writeLockout(email, attempts) {
    try {
      const map = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
      map[email] = { attempts, at: Date.now() };
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(map));
    } catch { /* storage disabled */ }
  }

  bumpLockout(email) {
    const { attempts } = this.readLockout(email);
    this.writeLockout(email, attempts + 1);
  }

  clearLockout(email) {
    try {
      const map = JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}');
      delete map[email];
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(map));
    } catch { /* storage disabled */ }
  }

  logout() {
    this.activeUser = null;
    this.saveActiveSession(null);
  }

  // ------------------------------------------------------- server-backed auth
  /**
   * Sign in with the backend when there is one. Only a *missing* API falls back
   * to local mode; a real 401/429 from the server is reported to the user as-is,
   * because silently trying the local store would let a wrong password "succeed"
   * against a stale demo account.
   */
  async signIn({ email, password } = {}) {
    if (serverSync.mode !== 'local') {
      const res = await serverSync.login({ email, password });
      if (res.success) {
        const merged = this.adoptServerUser(res.account);
        return { success: true, account: merged, mode: 'server' };
      }
      if (res.status) return res;
      serverSync.mode = 'local';
    }
    return this.login(email, password);
  }

  async signUp(userData = {}) {
    if (serverSync.mode !== 'local') {
      const res = await serverSync.register({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
      });
      if (res.success) {
        // Mirror the profile locally (name, avatar, ...) but never the password:
        // the server is the only thing that knows it.
        const email = String(userData.email || '').trim().toLowerCase();
        if (email) {
          this.accounts[email] = {
            ...(this.accounts[email] || {}),
            id: res.account.id,
            email,
            name: userData.name || res.account.displayName || 'Romantic Writer',
            username: userData.username || `@${String(userData.name || 'writer').trim().toLowerCase().replace(/\s+/g, '_')}`,
            gender: userData.gender || 'Female',
            country: userData.country || 'Bangladesh',
            countryFlag: userData.countryFlag || '🇧🇩',
            avatar: userData.avatar || '',
            bio: userData.bio || 'New on Romancha.',
            socialLinks: userData.socialLinks || { instagram: '', twitter: '', website: '' },
            role: 'Creator Member',
            followers: 0,
            following: 0,
            publishedStories: [],
            uploadedReels: [],
            serverBacked: true,
          };
          this.saveAccounts();
        }
        const merged = this.adoptServerUser({ ...res.account, ...userData, id: res.account.id });
        return { success: true, account: merged, mode: 'server' };
      }
      if (res.status) return res;
      serverSync.mode = 'local';
    }
    return this.register(userData);
  }

  async signOut() {
    await serverSync.logout();
    this.logout();
    return { success: true };
  }

  /** Mirror the account the server says we are, so the UI has a name/avatar. */
  adoptServerUser(user) {
    if (!user) return this.activeUser;
    const email = String(user.email || '').toLowerCase();
    const merged = {
      ...(this.accounts[email] || {}),
      id: user.id,
      email,
      name: user.displayName || user.name || 'Member',
      serverBacked: true,
    };
    delete merged.password;
    delete merged.passwordHash;
    if (email) this.accounts[email] = merged;
    this.saveAccounts();
    this.activeUser = merged;
    this.saveActiveSession(merged);
    return merged;
  }

  /** Called once on boot: restores a server session and reports the mode. */
  async bootstrap() {
    const out = await serverSync.bootstrap(datingStore);
    if (out?.mode === 'server') {
      if (serverSync.user) this.adoptServerUser(serverSync.user);
      else if (this.activeUser?.serverBacked) {
        // The session cookie died (30 days, or a logout on another tab). A
        // server-backed identity must not linger as a fake "signed in".
        this.logout();
      }
      datingStore.setServerStatus({ mode: 'server', user: serverSync.user || null, error: serverSync.error });
      serverSync.onChange((status) => datingStore.setServerStatus({
        mode: status.mode, user: status.user, error: status.error, busy: status.busy,
      }));
    } else {
      datingStore.setServerStatus({ mode: 'local' });
    }
    return out;
  }

  updateProfile(updatedData) {
    if (!this.activeUser) {
      this.activeUser = updatedData;
    }
    // Defensive: a profile save must never be able to overwrite credentials.
    delete updatedData.passwordHash;
    delete updatedData.salt;
    delete updatedData.password;
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
    return {
      id: 'usr-guest',
      name: 'Sophia Valentine',
      username: '@sophia_v',
      gender: 'Female',
      country: 'Bangladesh',
      countryFlag: '🇧🇩',
      avatar: '',
      bio: '',
      email: '',
      role: 'Guest',
      followers: 0,
      following: 0,
      isGuest: true,
      socialLinks: { instagram: '', twitter: '', website: '' }
    };
  }

  getActiveUser() {
    return this.getCurrentUser();
  }

  /**
   * Demo identities, together with the password they were actually seeded with.
   * The auth modal used to hard-code a password here, so the one-click button
   * could log in with something nobody had set.
   */
  demoAccounts() {
    return Object.values(this.accounts)
      .filter((a) => a && a.demoPassword && a.email)
      .slice(0, 4)
      .map((a) => ({
        email: a.email,
        password: a.demoPassword,
        name: a.name || a.email.split('@')[0],
        avatar: a.avatar || '',
        countryFlag: a.countryFlag || '🇧🇩',
        gender: a.gender || 'Female',
      }));
  }
}

export const authStore = new AuthManager();
