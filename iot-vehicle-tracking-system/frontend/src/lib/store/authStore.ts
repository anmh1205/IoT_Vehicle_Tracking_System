import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  fullName?: string;
  role: "admin" | "staff" | "user";
}

interface AuthStoreState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: Array<User["role"]>) => boolean;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      error: null,
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const hashed = await sha256(password);
          const { authServices } = await import("@/lib/api/auth");
          const json = await authServices.login(username, hashed);

          const sessionToken = (json as any)?.session?.token;
          const user = (json as any)?.user ?? null;

          if (sessionToken && user) {
            set({
              user,
              token: sessionToken,
              isAuthenticated: true,
              isLoading: false,
              hasHydrated: true,
            });
            return true;
          }

          set({
            error: "Login failed",
            isLoading: false,
            hasHydrated: true,
          });
          return false;
        } catch (e: unknown) {
          set({
            error: (e as Error)?.message || "Network error",
            isLoading: false,
            hasHydrated: true,
          });
          return false;
        }
      },
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
          hasHydrated: true,
        });
      },
      hasRole: (roles: Array<User["role"]>): boolean => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
    }),
    {
      name: "auth-storage",
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

// Hydration handling
const reapplySessionState = (persisted?: Partial<AuthStoreState>) => {
  const hasValidSession = !!persisted?.token && !!persisted?.user;
  useAuthStore.setState((current) => ({
    ...current,
    user: hasValidSession ? persisted?.user ?? null : null,
    token: hasValidSession ? persisted?.token ?? null : null,
    isAuthenticated: hasValidSession,
    isLoading: false,
    hasHydrated: true,
    error: hasValidSession ? current.error : null,
  }));
};

const persistApi = useAuthStore.persist;
persistApi?.onFinishHydration(reapplySessionState);
if (persistApi?.hasHydrated?.()) {
  reapplySessionState(useAuthStore.getState());
}

