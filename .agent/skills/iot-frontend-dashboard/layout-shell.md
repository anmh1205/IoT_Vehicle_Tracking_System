# Layout Shell

> The shell is the skeleton. Get it right once, and every page inherits structure for free.

---

## IVM26 Layout Pattern

```
Component hierarchy (outside-in):

SidebarProvider                    # shadcn/ui sidebar context
├── AppSidebar                     # Collapsible navigation sidebar
│   ├── SidebarHeader              # Logo + project name
│   ├── SidebarContent             # Navigation groups
│   │   ├── NavGroup: Main         # Dashboard, Vehicles, Devices...
│   │   ├── NavGroup: Monitoring   # Alerts, Geofences, Trips...
│   │   └── NavGroup: System       # Firmware, Settings, Export...
│   └── SidebarFooter              # User avatar + logout
│
└── SidebarInset                   # Main content area (right of sidebar)
    ├── Header                     # Top bar
    │   ├── SidebarTrigger         # Toggle sidebar (hamburger)
    │   ├── Separator              # Visual divider
    │   ├── Breadcrumbs            # Current location
    │   ├── (spacer)               # Push right items to edge
    │   ├── ThemeSelector          # Light/dark/system toggle
    │   └── UserMenu               # Avatar + dropdown
    │
    └── PageContainer              # Content wrapper
        └── ScrollArea             # Scrollable content region
            └── {page content}     # Feature components render here
```

## Header Composition

```
Header layout:
│
├── Left section (flex, items-center, gap)
│   ├── SidebarTrigger         # Toggles sidebar open/closed
│   ├── Separator              # Vertical divider (orientation="vertical")
│   └── Breadcrumbs            # Dynamic breadcrumb from route
│
├── Center (flex-1)            # Spacer pushes items apart
│
└── Right section (flex, items-center, gap)
    ├── ConnectionIndicator    # WebSocket status dot
    ├── ThemeSelector          # next-themes toggle
    └── UserMenu               # DropdownMenu with avatar
```

## Sidebar Structure

```
Sidebar navigation config:
│
├── Defined in: config/nav-config.ts
│   ├── Centralized navigation structure
│   ├── Each item: { title, url, icon }
│   ├── Grouped by logical sections
│   └── Icons from lucide-react ONLY
│
├── Sidebar behavior:
│   ├── Collapsible: "icon" mode on collapse (shows icons only)
│   ├── Desktop: persistent sidebar, toggleable
│   ├── Mobile: Sheet overlay (auto-handled by shadcn/ui)
│   └── State persisted via cookie (sidebar:state)
│
└── Active state:
    ├── Determined by current pathname
    ├── isActive = pathname.startsWith(item.url)
    └── Visual: highlighted background on active item
```

## Nav Config Pattern

```
config/nav-config.ts structure:
│
├── Type definition
│   interface NavItem {
│     title: string
│     url: string
│     icon: LucideIcon
│   }
│   interface NavGroup {
│     label: string
│     items: NavItem[]
│   }
│
├── Export centralized config
│   export const navGroups: NavGroup[] = [...]
│
└── Consumed by AppSidebar component
    └── Maps groups and items to SidebarGroup + SidebarMenuItem
```

## PageContainer Pattern

```
PageContainer wraps every page's content:
│
├── Consistent padding (p-4 md:p-6)
├── Max width constraint if needed
├── ScrollArea for overflow handling
│
└── Usage in page.tsx:
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1>Page Title</h1>
        <CreateButton />
      </div>
      <FeatureTable />
    </PageContainer>
```

## When Sheet vs Sidebar

```
Layout component decision:
│
├── Primary navigation (always visible on desktop)?
│   └── Sidebar (AppSidebar via SidebarProvider)
│
├── Mobile navigation?
│   └── Sheet (auto-handled by shadcn/ui Sidebar on mobile breakpoint)
│
├── Secondary panel (details, filters)?
│   └── Sheet (slide-in from right)
│
├── Create/edit form overlay?
│   └── Dialog (centered) or Sheet (side panel)
│
└── Settings or preferences panel?
    └── Sheet (slide-in from right)
```

## Breadcrumb Strategy

```
Breadcrumb generation:
│
├── Derive from current pathname segments
│   /dashboard/vehicles/123 -->
│   Dashboard > Vehicles > Vehicle #123
│
├── Map segments to display names
│   ├── Static segments: lookup from nav config
│   └── Dynamic segments: fetch entity name or use ID
│
└── Last segment is current page (no link)
    └── Previous segments are clickable links
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Custom sidebar implementation | Reinventing shadcn/ui, inconsistent behavior | Use shadcn/ui Sidebar components |
| Navigation config scattered across components | Hard to maintain, inconsistent | Centralize in `config/nav-config.ts` |
| Page content without PageContainer | Inconsistent padding, no scroll handling | Always wrap in PageContainer |
| Hardcoded breadcrumbs per page | Duplication, out-of-sync with routes | Generate from pathname dynamically |
| Sidebar state in Zustand | Unnecessary global state | Use shadcn/ui SidebarProvider (cookie-based) |
| Different header per page | Inconsistent shell | One Header component in layout, not per page |
