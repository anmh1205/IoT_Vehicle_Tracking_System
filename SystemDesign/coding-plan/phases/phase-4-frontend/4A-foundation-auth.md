# Sub-Phase 4A: Frontend Foundation & Auth

> **Context:** ~4KB | **Max Files:** 10 | **Est. Time:** 1 session

## Summary
Setup Next.js frontend với authentication: login/logout pages, auth context, protected routes, và base layout components.

## Tasks
| ID     | Description           | Files                                             |
| ------ | --------------------- | ------------------------------------------------- |
| FE-001 | Next.js project setup | `package.json`, `next.config.js`, `tsconfig.json` |
| FE-002 | Auth context + hooks  | `contexts/auth-context.tsx`, `hooks/useAuth.ts`   |
| FE-003 | Login page            | `app/login/page.tsx`                              |
| FE-004 | Auth middleware       | `middleware.ts`                                   |
| FE-005 | API client setup      | `lib/api/client.ts`, `lib/api/auth.ts`            |
| FE-006 | Base layout           | `app/layout.tsx`, `components/layout/sidebar.tsx` |
| FE-007 | Theme setup           | `app/globals.css`, `lib/theme.ts`                 |

## Backend API Contract (Input từ BE Phase 2A)
| Endpoint                   | Method | Request                  | Response                     |
| -------------------------- | ------ | ------------------------ | ---------------------------- |
| `POST /api/v1/auth/login`  | POST   | `{ username, password }` | `{ user, token, expiresAt }` |
| `POST /api/v1/auth/logout` | POST   | —                        | `{ success: true }`          |
| `GET /api/v1/auth/me`      | GET    | —                        | `{ user }`                   |

## Auth Context Pattern
```typescript
// contexts/auth-context.tsx
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Storage: localStorage cho token, sessionStorage cho sensitive data
// Token gửi via Authorization: Bearer <token>
```

## Route Protection Pattern
```typescript
// middleware.ts
const publicRoutes = ['/login', '/forgot-password'];
const protectedRoutes = ['/dashboard', '/devices', '/vehicles', ...];

// Redirect logic:
// - No token + protected route → /login
// - Has token + /login → /dashboard
```

## API Client Pattern
```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor: attach token, handle 401
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Socket.IO Setup (cho real-time)
```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },              // Fresh token on connect
    reconnection: true,
    reconnectionAttempts: 10,     // Increased from default
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });
  return socket;
}
```

## Project Structure
```
Tracking_Frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Protected layout with sidebar
│   │   ├── page.tsx                # Dashboard home
│   │   └── devices/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── ui/                         # Reusable UI components
├── contexts/
│   └── auth-context.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useSocket.ts
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   └── auth.ts
│   └── socket.ts
└── types/
    └── index.ts
```

## Dependencies
- ✅ Phase 2A done (Backend Auth API available)
- ➡️ Phase 4B (Device UI) depends on auth context
- ➡️ Phase 4C (Support Pages) depends on layout

## Verification
- [ ] `npm run build` — no errors
- [ ] Login flow: username/password → redirects to dashboard
- [ ] Protected routes: unauthorized → redirects to login
- [ ] Logout: clears token, redirects to login

## Full Spec Reference
- [30-frontend-architecture.md](./../../30-frontend-architecture.md) — Frontend architecture
