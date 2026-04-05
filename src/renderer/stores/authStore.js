import { create } from 'zustand';
import { authApi, setServerUrlCache } from '../api/client';
import { connectSocket, disconnectSocket } from '../api/socket';

export const useAuthStore = create((set, get) => ({
  token:     null,
  user:      null,
  serverUrl: '',
  isLoading: true,
  error:     null,

  // Called once on app startup
  init: async () => {
    set({ isLoading: true });
    try {
      const savedUrl   = await window.printflow.getServerUrl();
      const savedToken = await window.printflow.getToken();

      // ALWAYS restore serverUrl into store and API cache first,
      // regardless of whether a token exists — this is what lets
      // the login screen make API calls without a double-press
      if (savedUrl) {
        setServerUrlCache(savedUrl);
        set({ serverUrl: savedUrl });
      }

      if (savedUrl && savedToken) {
        try {
          const res = await authApi.me();
          set({ token: savedToken, user: res.data, isLoading: false });
          connectSocket(savedUrl, savedToken);
          return;
        } catch {
          // Token expired — clear it, fall through to login screen
          await window.printflow.clearToken();
        }
      }
    } catch (err) {
      console.error('[authStore.init] error:', err);
      try { await window.printflow.clearToken(); } catch {}
    }
    // Set isLoading false AFTER serverUrl is set so login screen
    // has the URL in the API cache before the user clicks Sign In
    set({ isLoading: false });
  },

  setServerUrl: async (url) => {
    const clean = (url || '').replace(/\/$/, '');
    setServerUrlCache(clean);
    await window.printflow.setServerUrl(clean);
    set({ serverUrl: clean });
  },

  login: async (email, password) => {
    set({ error: null });

    // Always re-hydrate serverUrl from keychain before logging in
    let serverUrl = get().serverUrl;
    if (!serverUrl) {
      try {
        serverUrl = await window.printflow.getServerUrl();
        if (serverUrl) {
          setServerUrlCache(serverUrl);
          set({ serverUrl });
        }
      } catch {}
    }

    if (!serverUrl) {
      set({ error: 'Server URL not configured — go back and enter your NAS address' });
      return false;
    }

    try {
      const res = await authApi.login(email, password);
      const { token, user } = res.data;
      await window.printflow.setToken(token);
      // Set BOTH token and user atomically so AuthGuard never sees token without user
      set({ token, user: user || { email, role: 'owner' }, error: null });
      connectSocket(serverUrl, token);
      // Fetch fresh user profile in background — don't block navigation
      try {
        const me = await authApi.me();
        set({ user: me.data });
      } catch {}
      return true;
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? `Cannot reach server at ${serverUrl} — check your NAS is running`
          : 'Login failed — check your email and password');
      set({ error: msg });
      return false;
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    disconnectSocket();
    await window.printflow.clearToken();
    set({ token: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
