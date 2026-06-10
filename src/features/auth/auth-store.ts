import { create } from 'zustand';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth-access-token';

export type AuthUser = {
  _id: string;
  email: string;
  role: string;
};

type AuthState = {
  accessToken: string | null;
  isHydrated: boolean;
  setAuthenticatedUser: (token: string) => void;
  removeAuthenticatedUser: () => void;
  hydrate: () => Promise<void>;
};

export const getAuthUserFromToken = (token: string): AuthUser | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload._id || !payload.email) return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      _id: payload._id,
      email: payload.email,
      role: payload.role ?? '',
    };
  } catch {
    return null;
  }
};

export const isAuthTokenValid = (token: string | null): token is string =>
  !!token && getAuthUserFromToken(token) !== null;

/** @deprecated Prefer getAuthUserFromToken — throws on invalid tokens. */
export const decodeAuthToken = (token: string): AuthUser => {
  const user = getAuthUserFromToken(token);
  if (!user) throw new Error('Invalid auth token');
  return user;
};

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  isHydrated: false,

  setAuthenticatedUser: (token: string) => {
    SecureStore.setItemAsync(TOKEN_KEY, token).catch(console.error);
    set({ accessToken: token });
  },

  removeAuthenticatedUser: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(console.error);
    set({ accessToken: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && !isAuthTokenValid(token)) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ accessToken: null, isHydrated: true });
        return;
      }
      set({ accessToken: token, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },
}));

export const useAuthUser = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return null;
  return getAuthUserFromToken(accessToken);
};

export const useIsAuthenticated = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  return isAuthTokenValid(accessToken);
};

export const useRequireAuthUser = () => {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthUser();

  useEffect(() => {
    if (!isHydrated) {
      void useAuthStore.getState().hydrate();
    }
  }, [isHydrated]);

  return { isHydrated, user };
};
