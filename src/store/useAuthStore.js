import { create } from "zustand";

import { getApiErrorMessage, setApiAccessToken } from "../services/api";
import { loginCustomer, signupCustomer } from "../services/authService";
import { getCustomerProfile } from "../services/profileService";
import { unregisterSavedPushDevice } from "../services/pushNotificationService";
import { clearSession, loadSession, saveSession } from "../services/sessionStorage";
import { profileImageUrl } from "../utils/profileDisplay";

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

function sessionFromResponse(data) {
  return {
    user: data.user,
    auth: data.auth,
    profile: data.profile || data.user?.customerProfile || data.user || null
  };
}

function persistedSession(session) {
  const image = profileImageUrl(session.profile, session.user);

  return {
    auth: session.auth,
    user: {
      id: session.user?.id,
      name: session.user?.name,
      email: session.user?.email,
      phone: session.user?.phone,
      image,
      imageUrl: image
    },
    profile: {
      id: session.profile?.id,
      firstName: session.profile?.firstName || session.profile?.profile?.firstName,
      lastName: session.profile?.lastName || session.profile?.profile?.lastName,
      name: session.profile?.name,
      email: session.profile?.email,
      phone: session.profile?.phone,
      image,
      imageUrl: image,
      profile: session.profile?.profile || null
    }
  };
}

function profileFromResponse(data, fallback = null) {
  return data?.profile || data?.user?.customerProfile || data?.user || fallback;
}

function userFromProfile(user, profile) {
  const image = profileImageUrl(profile, user);

  return {
    ...user,
    id: profile?.id || user?.id,
    name: profile?.name || user?.name,
    email: profile?.email || user?.email,
    phone: profile?.phone || user?.phone,
    image,
    imageUrl: image,
    customerProfile: profile?.profile || user?.customerProfile
  };
}

async function withFreshProfile(session) {
  try {
    const profileData = await getCustomerProfile();
    const profile = profileFromResponse(profileData, session.profile);

    return {
      ...session,
      profile,
      user: userFromProfile(session.user, profile)
    };
  } catch (error) {
    return session;
  }
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
      const freshSession = await withFreshProfile(session);
      await saveSession(persistedSession(freshSession));

      set({
        user: freshSession.user,
        profile: freshSession.profile,
        auth: freshSession.auth,
        token: freshSession.auth.accessToken,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false
      });

      return freshSession;
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
      const freshSession = await withFreshProfile(session);
      await saveSession(persistedSession(freshSession));

      set({
        user: freshSession.user,
        profile: freshSession.profile,
        auth: freshSession.auth,
        token: freshSession.auth.accessToken,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false
      });

      return freshSession;
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
      const profile = profileFromResponse(profileData, session.profile);

      const restoredSession = {
        ...session,
        profile,
        user: userFromProfile(session.user, profile)
      };

      await saveSession(persistedSession(restoredSession));

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
    const profile = profileFromResponse(data, get().profile);
    const user = userFromProfile(get().user, profile);
    const session = {
      auth: get().auth,
      user,
      profile
    };

    await saveSession(persistedSession(session)).catch(() => null);
    set({ profile, user });
    return profile;
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
  logout: async ({ asGuest = false } = {}) => {
    if (get().token) {
      await unregisterSavedPushDevice().catch(() => null);
    }

    setApiAccessToken(null);
    await clearSession();
    set({
      user: null,
      profile: null,
      auth: null,
      token: null,
      isAuthenticated: false,
      isGuest: asGuest,
      isLoading: false,
      error: null
    });
  }
}));

export default useAuthStore;
