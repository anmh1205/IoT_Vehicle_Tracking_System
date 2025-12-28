## XIII.10 Authentication

### XIII.10.1 Auth Store (Zustand)

```typescript
// src/lib/store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

### XIII.10.2 Auth Guard

```typescript
// src/components/layout/auth-guard.tsx
// Redirect to /login nếu chưa authenticated
// Check token expiry
// Auto refresh token
```

