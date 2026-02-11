# State Management

> State has a home. Put it in the wrong place and the entire app pays the tax.

---

## Three State Types

```
State taxonomy:
│
├── Global Client State (Zustand)
│   ├── Auth: token, user profile, permissions
│   ├── UI preferences: sidebar collapsed, density
│   ├── Real-time: live telemetry, device statuses
│   └── Characteristics: synchronous, client-only, rare writes
│
├── Server State (TanStack Query)
│   ├── All data fetched from REST API
│   ├── Lists with pagination, sorting, filtering
│   ├── Single entity details
│   ├── Characteristics: async, cacheable, refetchable, shared
│   └── Mutations: create, update, delete operations
│
└── URL State (nuqs)
    ├── Active tab selection
    ├── Search query text
    ├── Filter selections
    ├── Pagination (page, pageSize)
    ├── Sort column and direction
    └── Characteristics: shareable, bookmarkable, browser-native
```

## Where Does This State Belong?

```
New piece of state arrives
│
├── Does it come from the server (API response)?
│   └── YES --> TanStack Query
│       ├── useQuery for reads
│       ├── useMutation for writes
│       └── queryClient.invalidateQueries for cache refresh
│
├── Should it survive page refresh AND be shareable via URL?
│   └── YES --> nuqs (URL search params)
│       ├── useQueryState for single param
│       └── useQueryStates for multiple params
│
├── Is it needed across multiple unrelated components?
│   ├── Is it the auth token or user session?
│   │   └── YES --> Zustand (auth-store, memory only)
│   ├── Is it real-time data pushed via WebSocket?
│   │   └── YES --> Zustand (updated by socket listener)
│   └── Is it a UI preference (theme, density, collapsed)?
│       └── YES --> Zustand (ui-store)
│
├── Is it component-local (form input, toggle, hover)?
│   └── YES --> useState or useReducer
│
└── Is it derived from other state?
    └── YES --> useMemo (compute, don't store)
```

## Zustand Stores

```
stores/auth-store.ts
│
├── State:
│   ├── token: string | null         # Session token
│   ├── user: User | null            # Logged-in user profile
│   └── isAuthenticated: boolean     # Derived from token !== null
│
├── Actions:
│   ├── setAuth(token, user)         # On login success
│   ├── clearAuth()                  # On logout
│   └── updateUser(partial)          # Profile update
│
└── SECURITY RULES:
    ├── Token stored in MEMORY ONLY (Zustand default)
    ├── NEVER persist to localStorage
    ├── NEVER persist to sessionStorage
    ├── NEVER persist to cookies from frontend
    ├── NEVER use zustand/persist middleware for auth store
    └── Token is sent via Authorization header on every API request
```

```
stores/ui-store.ts
│
├── State:
│   ├── sidebarCollapsed: boolean
│   ├── tableDensity: "compact" | "normal" | "comfortable"
│   └── mapStyle: "street" | "satellite"
│
└── Persistence:
    ├── Can use zustand/persist for UI preferences
    └── Safe to store in localStorage (no secrets)
```

## TanStack Query Patterns

```
Query key strategy:
│
├── Entity list:    ["vehicles", { page, search, filters }]
├── Single entity:  ["vehicles", vehicleId]
├── Related data:   ["vehicles", vehicleId, "trips"]
├── Dashboard:      ["dashboard", "stats"]
│
└── Key hierarchy enables targeted invalidation:
    ├── invalidate ["vehicles"]        --> Refetch all vehicle queries
    ├── invalidate ["vehicles", 5]     --> Refetch vehicle #5 only
    └── invalidate ["dashboard"]       --> Refetch dashboard data
```

```
Mutation flow:
│
├── User triggers action (form submit, button click)
│
├── useMutation executes API call
│   ├── onMutate: optional optimistic update
│   ├── onSuccess:
│   │   ├── Toast success message (sonner)
│   │   ├── Close dialog/sheet
│   │   └── Invalidate related queries
│   └── onError:
│       ├── Toast error message
│       └── Revert optimistic update if used
│
└── TanStack Query refetches invalidated queries automatically
```

## nuqs URL State

```
URL state patterns:
│
├── Search:     ?search=toyota
├── Filters:    ?status=active&customer=5
├── Pagination: ?page=2&pageSize=25
├── Sorting:    ?sort=name&order=asc
├── Tab:        ?tab=details
│
└── Benefits:
    ├── User can share filtered view via URL
    ├── Browser back/forward navigates filter history
    ├── Page refresh preserves filter state
    └── No Zustand or useState needed for filters
```

## State Synchronization

```
Socket.IO + TanStack Query coordination:
│
├── Low-frequency events (status changes, alerts):
│   ├── Socket receives event
│   ├── Invalidate relevant TanStack Query
│   └── TanStack Query refetches from REST API
│
├── High-frequency events (GPS coordinates, telemetry):
│   ├── Socket receives event
│   ├── Update Zustand store directly
│   └── Components subscribed to store re-render
│
└── Decision: Invalidate query vs update store?
    ├── Data needs REST-level consistency --> Invalidate query
    ├── Data is ephemeral / real-time stream --> Update store
    └── Data updates faster than 1/second --> Update store (skip REST)
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Token in localStorage | XSS can steal session | Zustand memory only, no persist |
| Token in zustand/persist | Writes to localStorage by default | Remove persist middleware from auth store |
| Redux for everything | Unnecessary complexity, boilerplate | Zustand for global, TanStack Query for server |
| Prop drilling through 3+ levels | Fragile, hard to refactor | Zustand store or React Context |
| useState for URL-worthy state (filters, page) | Lost on refresh, not shareable | nuqs (URL search params) |
| Fetching in useEffect without caching | No dedup, no cache, race conditions | TanStack Query |
| Storing server data in Zustand | Cache invalidation nightmare | TanStack Query manages server state |
| Optimistic updates without rollback | UI shows stale data on error | Always implement onError rollback |
