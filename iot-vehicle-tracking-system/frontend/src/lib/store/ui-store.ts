/**
 * UI Store - Zustand store for UI state
 */
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setTheme: (theme: UIState['theme']) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  // State
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'system',

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));

