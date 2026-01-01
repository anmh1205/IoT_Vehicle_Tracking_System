/**
 * Auth Store - CORRECTED based on REVIEW_CORRECTIONS.md
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthState } from '@/types';

interface AuthActions {
  setUser: (user: User) => void;
  // Backend returns session.token, session.refreshToken, session.expiresAt
  setSession: (token: string, refreshToken: string, expiresAt: string) => void;
  logout: () => void;
  hydrate: () => void;
  isTokenExpired: () => boolean;  // Helper to check expiration
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State - matches backend response structure
      user: null,
      token: null,           // Backend uses "token" not "accessToken"
      refreshToken: null,
      expiresAt: null,       // For token expiration check
      isAuthenticated: false,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: true }),

      setSession: (token, refreshToken, expiresAt) =>
        set({ token, refreshToken, expiresAt, isAuthenticated: true }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          expiresAt: null,
          isAuthenticated: false,
        }),

      hydrate: () => {
        // Called on app init to restore state
      },

      isTokenExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return true;
        return new Date(expiresAt) < new Date();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
    }
  )
);

