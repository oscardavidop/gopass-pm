import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth.types';
import { broadcastAuthSnapshot } from '@/services/auth-sync';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  sessionId: string | null;
  setAuth: (user: User, accessToken: string, sessionId?: string | null) => void;
  setAccessToken: (token: string) => void;
  setSessionId: (sessionId: string | null) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      sessionId: null,

      setAuth: (user, accessToken, sessionId = null) => {
        set({ user, accessToken, sessionId });
        broadcastAuthSnapshot({ user, accessToken, sessionId });
      },
      setAccessToken: (accessToken) => {
        const { user, sessionId } = get();
        set({ accessToken });
        broadcastAuthSnapshot({ user, accessToken, sessionId });
      },
      setSessionId: (sessionId) => {
        const { user, accessToken } = get();
        set({ sessionId });
        broadcastAuthSnapshot({ user, accessToken, sessionId });
      },
      setUser: (user) => set({ user }),
      clearAuth: () => {
        set({ user: null, accessToken: null, sessionId: null });
        broadcastAuthSnapshot({ user: null, accessToken: null, sessionId: null });
      },
      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'gopass-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        sessionId: state.sessionId,
      }),
    },
  ),
);
