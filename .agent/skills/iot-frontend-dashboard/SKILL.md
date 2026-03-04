---
name: iot-frontend-dashboard
description: IoT dashboard frontend with Next.js + shadcn/ui. Feature-Sliced Architecture, state management, real-time sync, charts, maps, compliance rules. Used when building or modifying frontend.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT Frontend Dashboard

> Next.js + shadcn/ui + Zustand + TanStack Query + Socket.IO for IoT dashboards.
> **Feature-Sliced Architecture. Compliance is non-negotiable.**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `feature-sliced.md` | Feature modules, folder layout, page components | Adding new feature, creating components |
| `layout-shell.md` | Sidebar, header, breadcrumbs, page container | Modifying layout, navigation, shell |
| `state-management.md` | Zustand, TanStack Query, nuqs, local state | State decisions, data fetching, auth token |
| `data-tables.md` | TanStack Table, pagination, columns, toolbar | Building list/table views |
| `forms-pattern.md` | Dialogs, sheets, react-hook-form, zod | Building create/edit forms |
| `realtime-sync.md` | Socket.IO client, polling fallback, connection state | Real-time features, live updates |
| `charts-maps.md` | recharts, Leaflet, geofences, chart type selection | Data visualization, maps |
| `compliance.md` | Library choices, icon sets, banned patterns | Any frontend work (final authority) |

---

## Related Skills

| Need | Skill |
|------|-------|
| Backend domain architecture | `@[skills/iot-backend-ddd]` |
| Project structure and naming | `@[skills/iot-project-pattern]` |
| Clean code standards | `@[skills/clean-code]` |
| Tailwind CSS patterns | `@[skills/tailwind-patterns]` |
| Next.js performance rules | `@[skills/nextjs-react-expert]` |
| Design principles and UX | `@[skills/frontend-design]` |

---

## Decision Checklist

Before modifying frontend code:

- [ ] **Identified which feature module this belongs to?**
- [ ] **Component placed in correct folder?** (feature vs shared vs app)
- [ ] **State strategy chosen?** (Zustand vs TanStack Query vs nuqs vs local)
- [ ] **Using approved libraries only?** (check `compliance.md`)
- [ ] **Icons from lucide-react only?**
- [ ] **No placeholder text?** (zero "Coming Soon", "TODO", "Lorem ipsum")
- [ ] **Real API integration?** (not mock data in production pages)
- [ ] **Loading and error states handled?**

---

## Anti-Patterns

**DON'T:**
- Put components at root `src/components/` when they belong to a feature
- Store auth token in localStorage (memory only via Zustand)
- Use MQTT.js in the browser (Socket.IO from backend only)
- Use ECharts, Chart.js, or any chart library besides recharts
- Use icons from @tabler/icons-react, heroicons, or any set besides lucide-react
- Leave placeholder text in any page or component
- Skip loading states or error boundaries
- Build custom sidebar/dialog/form components (use shadcn/ui)

**DO:**
- One feature folder per bounded context
- Keep feature hooks inside `features/{name}/hooks/`
- Use TanStack Query for all server data
- Use Zustand only for global client state
- Use nuqs for URL-persisted filters and pagination
- Follow the layout shell pattern (SidebarProvider + AppSidebar + SidebarInset)
- Check `compliance.md` before adding any new dependency
