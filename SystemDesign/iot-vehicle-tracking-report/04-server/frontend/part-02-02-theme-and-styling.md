## PHẦN XIII.2: THEME & STYLING

### XIII.2.1 Tổng Quan

Hệ thống sử dụng **Tailwind CSS v4** với **CSS Variables** (oklch color space) để quản lý theme. Hỗ trợ **Light/Dark mode** và các theme variants.

**Nguồn tham khảo:** `Example/frontend_v2/src/app/globals.css` và `Example/frontend_v2/src/app/theme.css`

---

### XIII.2.2 Color Scheme

#### Light Theme

```css
/* src/app/globals.css */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);              /* White */
  --foreground: oklch(0.145 0 0);          /* Dark gray */
  --card: oklch(1 0 0);                    /* White */
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
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
  --sidebar-ring: oklch(0.708 0 0);
  
  /* Chart colors */
  --chart-1: oklch(0.646 0.222 41.116);    /* Blue */
  --chart-2: oklch(0.6 0.118 184.704);     /* Green */
  --chart-3: oklch(0.398 0.07 227.392);   /* Purple */
  --chart-4: oklch(0.828 0.189 84.429);   /* Yellow */
  --chart-5: oklch(0.769 0.188 70.08);    /* Orange */
}
```

#### Dark Theme

```css
.dark {
  --background: oklch(0.145 0 0);           /* Dark gray */
  --foreground: oklch(0.985 0 0);          /* White */
  --card: oklch(0.205 0 0);                 /* Darker gray */
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.269 0 0);
  --popover-foreground: oklch(0.985 0 0);
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
  --sidebar-ring: oklch(0.439 0 0);
  
  /* Chart colors */
  --chart-1: oklch(0.488 0.243 264.376);  /* Blue */
  --chart-2: oklch(0.696 0.17 162.48);     /* Green */
  --chart-3: oklch(0.769 0.188 70.08);     /* Orange */
  --chart-4: oklch(0.627 0.265 303.9);     /* Purple */
  --chart-5: oklch(0.645 0.246 16.439);     /* Red */
}
```

---

### XIII.2.3 Theme Variants (Optional)

```css
/* src/app/theme.css */

.theme-blue,
.theme-blue-scaled {
  --primary: var(--color-blue-600);
  --primary-foreground: var(--color-blue-50);

  @variant dark {
    --primary: var(--color-blue-500);
    --primary-foreground: var(--color-blue-50);
  }
}

.theme-green,
.theme-green-scaled {
  --primary: var(--color-lime-600);
  --primary-foreground: var(--color-lime-50);

  @variant dark {
    --primary: var(--color-lime-600);
    --primary-foreground: var(--color-lime-50);
  }
}

.theme-amber,
.theme-amber-scaled {
  --primary: var(--color-amber-600);
  --primary-foreground: var(--color-amber-50);

  @variant dark {
    --primary: var(--color-amber-500);
    --primary-foreground: var(--color-amber-50);
  }
}
```

---

### XIII.2.4 Status Colors

```typescript
// src/lib/constants/status-colors.ts
export const STATUS_COLORS = {
  // Vehicle status
  active: {
    bg: 'bg-green-500',
    text: 'text-green-700',
    border: 'border-green-500',
  },
  inactive: {
    bg: 'bg-gray-500',
    text: 'text-gray-700',
    border: 'border-gray-500',
  },
  maintenance: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-700',
    border: 'border-yellow-500',
  },
  retired: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    border: 'border-red-500',
  },
  
  // Alert severity
  low: {
    bg: 'bg-blue-500',
    text: 'text-blue-700',
    border: 'border-blue-500',
  },
  medium: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-700',
    border: 'border-yellow-500',
  },
  high: {
    bg: 'bg-orange-500',
    text: 'text-orange-700',
    border: 'border-orange-500',
  },
  critical: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    border: 'border-red-500',
  },
  
  // Trip status
  in_progress: {
    bg: 'bg-blue-500',
    text: 'text-blue-700',
    border: 'border-blue-500',
  },
  completed: {
    bg: 'bg-green-500',
    text: 'text-green-700',
    border: 'border-green-500',
  },
  cancelled: {
    bg: 'bg-gray-500',
    text: 'text-gray-700',
    border: 'border-gray-500',
  },
  
  // Device status
  online: {
    bg: 'bg-green-500',
    text: 'text-green-700',
    border: 'border-green-500',
  },
  offline: {
    bg: 'bg-red-500',
    text: 'text-red-700',
    border: 'border-red-500',
  },
  error: {
    bg: 'bg-red-600',
    text: 'text-red-800',
    border: 'border-red-600',
  },
} as const;
```

---

### XIII.2.5 Global Styles

```css
/* src/app/globals.css */
@import 'tailwindcss';
@import 'tw-animate-css';
@custom-variant dark (&:is(.dark *));
@import './theme.css';

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
      "Oxygen", "Ubuntu", "Cantarell", sans-serif;
  }
}

/* View Transition Wave Effect */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: 0;
}

::view-transition-new(root) {
  z-index: 1;
}

@keyframes reveal {
  from {
    clip-path: circle(0% at var(--x, 50%) var(--y, 50%));
    opacity: 0.7;
  }
  to {
    clip-path: circle(150% at var(--x, 50%) var(--y, 50%));
    opacity: 1;
  }
}

::view-transition-new(root) {
  animation: reveal 0.4s ease-in-out forwards;
}
```

---

### XIII.2.6 Theme Constants (TypeScript)

```typescript
// src/lib/constants/theme.ts
export const THEME = {
  COLORS: {
    PRIMARY: '#1890ff',
    SUCCESS: '#52c41a',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
    INFO: '#13c2c2',
    
    // Gradients
    GRADIENTS: {
      PRIMARY: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      SUCCESS: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      WARNING: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      ERROR: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      INFO: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      CARD: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      GLASS: 'rgba(255, 255, 255, 0.9)',
    },
  },
  
  // Spacing
  SPACING: {
    XS: '4px',
    SM: '8px',
    MD: '16px',
    LG: '24px',
    XL: '32px',
    XXL: '48px',
  },
  
  // Border radius
  BORDER_RADIUS: {
    SM: '4px',
    MD: '8px',
    LG: '12px',
    XL: '16px',
    XXL: '20px',
    ROUND: '50%',
  },
  
  // Shadows
  SHADOWS: {
    SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    XXL: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  
  // Transitions
  TRANSITIONS: {
    FAST: '0.15s ease-in-out',
    NORMAL: '0.3s ease-in-out',
    SLOW: '0.5s ease-in-out',
  }
} as const;

// Helper function to get gradient style
export const getGradientStyle = (gradient: keyof typeof THEME.COLORS.GRADIENTS) => {
  return {
    background: THEME.COLORS.GRADIENTS[gradient]
  }
};

// Helper function to get shadow style
export const getShadowStyle = (shadow: keyof typeof THEME.SHADOWS) => {
  return {
    boxShadow: THEME.SHADOWS[shadow]
  }
};
```

---

### XIII.2.7 Theme Provider Setup

```typescript
// src/components/providers/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

```typescript
// src/app/layout.tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### XIII.2.8 Summary

**Theme System:**
- ✅ CSS Variables với oklch color space
- ✅ Light/Dark theme support
- ✅ Theme variants (blue, green, amber)
- ✅ Status colors
- ✅ Chart colors
- ✅ Sidebar colors

**Styling:**
- ✅ Tailwind CSS v4
- ✅ Custom CSS variables
- ✅ View transitions
- ✅ Responsive design

**Next Steps:**
- Xem [`part-02-03-layout-components.md`](./part-02-03-layout-components.md) cho layout components
- Xem [`part-02-08-implementation-steps.md`](./part-02-08-implementation-steps.md) cho các bước copy theme từ example

