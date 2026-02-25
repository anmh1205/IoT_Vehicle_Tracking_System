## XIII.5 UI/UX Patterns

### XIII.5.1 Layout Structure

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────┐
│ Header (Breadcrumbs, User Nav, Theme Toggle)   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │  Main Content Area                   │
│ (Nav)    │  - Page Header                      │
│          │  - Filters/Search                   │
│          │  - Data Table/Cards                 │
│          │  - Pagination                       │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

**Sidebar Features:**
- Collapsible (icon-only mode)
- Persistent state (cookie/localStorage)
- Active route highlighting
- Nested navigation support
- Mobile responsive (drawer)

**Header Features:**
- Breadcrumb navigation
- Search (Cmd+K)
- User menu dropdown
- Theme toggle
- Notifications bell

### XIII.5.2 Component Patterns

**Data Tables:**
- Sortable columns
- Filterable rows
- Pagination
- Row selection
- Actions dropdown
- Export functionality

**Cards:**
- Stat cards với icons
- Vehicle cards với status badges
- Alert cards với severity indicators
- Chart cards với tooltips

**Forms:**
- React Hook Form + Zod validation
- Inline error messages
- Loading states
- Success/error toasts

**Maps:**
- Leaflet với custom markers
- Real-time position updates
- Route visualization
- Geofence drawing
- Popup với vehicle info

### XIII.5.3 Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Sidebar → Drawer
- Table → Card list
- Filters → Bottom sheet
- Map → Full screen

