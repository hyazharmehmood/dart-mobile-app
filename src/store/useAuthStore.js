import { create } from "zustand";

import { getApiErrorMessage, setApiAccessToken } from "../services/api";
import { loginCustomer, signupCustomer } from "../services/authService";
import { getCustomerProfile } from "../services/profileService";
import { clearSession, loadSession, saveSession } from "../services/sessionStorage";

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

function sessionFromResponse(data) {
  return {
    user: data.user,
    auth: data.auth,
    profile: data.profile || data.user || null
  };
}

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  auth: null,
  token: null,
  isRestoring: true,
  isGuest: false,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });

    try {
      const data = await loginCustomer({ email, password });
      const session = sessionFromResponse(data);

      setApiAccessToken(session.auth.accessToken);
      await saveSession(session);

      set({
        user: session.user,
        profile: session.profile,
        auth: session.auth,
        token: session.auth.accessToken,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false
      });

      return session;
    } catch (error) {
      const message = getApiErrorMessage(error, "Invalid email or password.");
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  signup: async (payload) => {
    set({ isLoading: true, error: null });

    try {
      const data = await signupCustomer(payload);
      const session = sessionFromResponse(data);

      setApiAccessToken(session.auth.accessToken);
      await saveSession(session);

      set({
        user: session.user,
        profile: session.profile,
        auth: session.auth,
        token: session.auth.accessToken,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false
      });

      return session;
    } catch (error) {
      const message = getApiErrorMessage(error, "Signup failed. Please check your details.");
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  restoreSession: async () => {
    set({ isRestoring: true, error: null });

    try {
      const session = await loadSession();

      if (!session?.auth?.accessToken || isExpired(session.auth.expiresAt)) {
        await get().logout();
        set({ isRestoring: false });
        return null;
      }

      setApiAccessToken(session.auth.accessToken);
      const profileData = await getCustomerProfile();
      const profile = profileData.profile;

      const restoredSession = {
        ...session,
        profile,
        user: {
          ...session.user,
          id: profile?.id || session.user?.id,
          name: profile?.name || session.user?.name,
          email: profile?.email || session.user?.email,
          phone: profile?.phone || session.user?.phone
        }
      };

      await saveSession(restoredSession);

      set({
        user: restoredSession.user,
        profile,
        auth: restoredSession.auth,
        token: restoredSession.auth.accessToken,
        isAuthenticated: true,
        isGuest: false,
        isRestoring: false
      });

      return restoredSession;
    } catch (error) {
      await get().logout();
      set({ isRestoring: false });
      return null;
    }
  },
  finishRestore: () => set({ isRestoring: false }),
  refreshProfile: async () => {
    const data = await getCustomerProfile();
    set({ profile: data.profile });
    return data.profile;
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  continueAsGuest: () =>
    set({
      user: null,
      profile: null,
      auth: null,
      token: null,
      isAuthenticated: false,
      isGuest: true,
      error: null
    }),
  logout: async () => {
    setApiAccessToken(null);
    await clearSession();
    set({
      user: null,
      profile: null,
      auth: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
      error: null
    });
  }
}));

export default useAuthStore;
