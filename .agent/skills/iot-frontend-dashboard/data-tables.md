# Data Tables

> Tables are the backbone of IoT dashboards. Get pagination, sorting, and filtering right or the UX collapses under data volume.

---

## Component Stack

```
Data table composition:
│
├── TanStack Table (core)           # Headless table logic
│   ├── Column definitions          # Typed, declarative
│   ├── Sorting state               # Server-side or client-side
│   ├── Filtering state             # Column filters, global search
│   ├── Pagination state            # Page index, page size
│   ├── Row selection state         # Checkbox select, bulk actions
│   └── Visibility state            # Show/hide columns
│
├── shadcn/ui DataTable (UI)        # Styled table components
│   ├── Table, TableHeader, TableBody, TableRow, TableCell
│   ├── DataTablePagination         # Page controls
│   ├── DataTableColumnHeader       # Sortable column headers
│   └── DataTableViewOptions        # Column visibility toggle
│
└── Feature-specific wrapper        # features/{name}/components/{name}-table.tsx
    ├── Column definitions          # Specific to this entity
    ├── Toolbar                     # Search, filters, create button
    ├── Row actions                 # Edit, delete, view dropdown
    └── Integrates TanStack Query   # Data fetching + pagination
```

## Server-Side vs Client-Side Pagination

```
Pagination decision:
│
├── How many total records could exist?
│   ├── < 100 records
│   │   └── Client-side is acceptable
│   │       ├── Fetch all, filter/sort in browser
│   │       └── Simpler implementation
│   │
│   ├── 100 - 10,000 records
│   │   └── Server-side recommended
│   │       ├── Send page, pageSize, sort, filters to API
│   │       └── API returns { data, meta: { total, page, pageSize } }
│   │
│   └── > 10,000 records
│       └── Server-side mandatory
│           ├── Consider cursor-based pagination
│           └── Never load all into memory
│
└── IoT dashboards: Server-side by DEFAULT
    ├── Devices, vehicles, trips grow unbounded
    ├── Alerts can accumulate thousands per day
    └── Always assume the dataset will grow
```

## Column Definition Pattern

```
Column definitions per feature:
│
├── ID column (hidden or narrow)
├── Primary identifier (name, plate number, IMEI)
├── Status column (badge with color coding)
├── Key attributes (2-4 relevant fields)
├── Timestamps (created, updated -- relative format)
├── Actions column (dropdown menu, pinned right)
│
└── Column types:
    ├── Text:    cell renders string directly
    ├── Badge:   cell renders status Badge component
    ├── Date:    cell renders formatted relative date
    ├── Link:    cell renders clickable link to detail page
    ├── Actions: cell renders DropdownMenu with edit/delete/view
    └── Custom:  cell renders feature-specific component
```

## Toolbar Pattern

```
Table toolbar composition:
│
├── Left section:
│   ├── Search input (debounced, updates URL via nuqs)
│   ├── Filter dropdowns (status, customer, date range)
│   └── Active filter badges (click to remove)
│
├── Right section:
│   ├── Column visibility toggle
│   ├── Export button (if applicable)
│   └── Create button (opens dialog/sheet)
│
└── Below toolbar:
    ├── Active filters summary
    └── "X results found" count
```

## Row Actions Pattern

```
Row action menu:
│
├── DropdownMenu (shadcn/ui)
│   ├── Trigger: MoreHorizontal icon (lucide-react)
│   │
│   ├── View Details    --> Navigate to detail page
│   ├── Edit            --> Open edit dialog/sheet
│   ├── ---separator---
│   └── Delete          --> Confirmation dialog, then mutation
│
└── Decision: Inline actions vs dropdown?
    ├── 1-2 actions --> Inline icon buttons
    ├── 3+ actions  --> Dropdown menu
    └── Destructive actions --> Always in dropdown with confirmation
```

## Loading and Empty States

```
Table states:
│
├── Loading (initial):
│   └── Skeleton rows matching column layout
│       ├── 5-10 skeleton rows
│       └── Each cell shows Skeleton component
│
├── Loading (refetch):
│   └── Keep existing data visible
│       ├── Subtle loading indicator (spinner in toolbar)
│       └── Do NOT replace table with skeleton
│
├── Empty (no data):
│   └── Centered illustration + message
│       ├── "No vehicles found"
│       ├── "Try adjusting your filters"
│       └── Create button if applicable
│
├── Empty (filtered, no results):
│   └── "No results match your filters"
│       └── "Clear filters" button
│
└── Error:
    └── Error message with retry button
```

## Inline Edit vs Dialog Edit

```
Edit mode decision:
│
├── Simple field change (toggle status, rename)?
│   └── Inline edit
│       ├── Click cell to edit
│       ├── Enter to save, Escape to cancel
│       └── Optimistic update with rollback
│
├── Multiple fields to edit?
│   └── Dialog or Sheet
│       ├── Pre-populated form
│       ├── Full validation
│       └── Submit closes dialog
│
└── Complex entity with many fields?
    └── Full page or Sheet
        ├── Tabbed form sections
        └── Save button at bottom
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Loading all data client-side | Memory issues, slow initial load | Server-side pagination |
| No loading state on table | User sees empty table, thinks no data | Skeleton rows during fetch |
| No empty state | User confused when filters return nothing | Descriptive empty state with clear action |
| Search without debounce | API hammered on every keystroke | Debounce 300ms before sending query |
| Filters in useState only | Lost on page refresh, not shareable | nuqs for URL-persisted filters |
| Column definitions outside feature folder | Scattered, hard to maintain | Keep in `features/{name}/components/` |
| Fetching on every filter change without cancel | Race conditions, stale data | TanStack Query handles dedup and cancel |
