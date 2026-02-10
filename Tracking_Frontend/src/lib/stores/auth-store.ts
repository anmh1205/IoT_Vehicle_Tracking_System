import { create } from 'zustand';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: 'root' | 'admin' | 'manager' | 'operator' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended';
  isActive?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) =>
    set({ user, token, isAuthenticated: true, isLoading: false }),

  clearAuth: () =>
    set({ user: null, token: null, isAuthenticated: false, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}));
