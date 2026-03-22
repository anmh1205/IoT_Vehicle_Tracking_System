## XIII.4 Theme & Màu Sắc

### XIII.4.1 Color Scheme (Dựa trên Example)

**Light Theme:**

```css
:root {
  --background: oklch(1 0 0);              /* White */
  --foreground: oklch(0.145 0 0);          /* Dark gray */
  --card: oklch(1 0 0);                    /* White */
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);             /* Dark gray/black */
  --primary-foreground: oklch(0.985 0 0);  /* White */
  --secondary: oklch(0.97 0 0);            /* Light gray */
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325); /* Red */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  
  /* Sidebar */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  
  /* Chart colors */
  --chart-1: oklch(0.646 0.222 41.116);    /* Blue */
  --chart-2: oklch(0.6 0.118 184.704);     /* Green */
  --chart-3: oklch(0.398 0.07 227.392);   /* Purple */
  --chart-4: oklch(0.828 0.189 84.429);   /* Yellow */
  --chart-5: oklch(0.769 0.188 70.08);    /* Orange */
}
```

**Dark Theme:**

```css
.dark {
  --background: oklch(0.145 0 0);           /* Dark gray */
  --foreground: oklch(0.985 0 0);          /* White */
  --card: oklch(0.205 0 0);                 /* Darker gray */
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);              /* Light gray */
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216); /* Red */
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  
  /* Sidebar */
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376); /* Blue */
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  
  /* Chart colors */
  --chart-1: oklch(0.488 0.243 264.376);  /* Blue */
  --chart-2: oklch(0.696 0.17 162.48);     /* Green */
  --chart-3: oklch(0.769 0.188 70.08);     /* Orange */
  --chart-4: oklch(0.627 0.265 303.9);     /* Purple */
  --chart-5: oklch(0.645 0.246 16.439);     /* Red */
}
```

### XIII.4.2 Status Colors

```typescript
// src/lib/constants/status-colors.ts
export const STATUS_COLORS = {
  // Vehicle status
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  maintenance: 'bg-yellow-500',
  retired: 'bg-red-500',
  
  // Alert severity
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
  
  // Trip status
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
  
  // Device status
  online: 'bg-green-500',
  offline: 'bg-red-500',
  error: 'bg-red-600',
} as const;
```

### XIII.4.3 Theme Variants (Optional)

```css
/* src/app/theme.css */
.theme-blue {
  --primary: var(--color-blue-600);
  --primary-foreground: var(--color-blue-50);
}

.theme-green {
  --primary: var(--color-lime-600);
  --primary-foreground: var(--color-lime-50);
}

.theme-amber {
  --primary: var(--color-amber-600);
  --primary-foreground: var(--color-amber-50);
}
```

