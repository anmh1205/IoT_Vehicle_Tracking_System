## PHẦN XIII.8.7: BƯỚC 6 - COPY PROVIDERS

### XIII.8.7 Bước 6: Copy Providers

#### 6.1 Copy Query Provider

```bash
# Copy query provider
mkdir -p src/components/providers
cp Example/frontend_v2/src/components/providers/QueryProvider.tsx src/components/providers/QueryProvider.tsx
```

#### 6.2 Copy Realtime Provider

```bash
# Copy realtime provider
cp Example/frontend_v2/src/components/providers/RealtimeProvider.tsx src/components/providers/RealtimeProvider.tsx

# Copy realtime client
mkdir -p src/lib/realtime
cp Example/frontend_v2/src/lib/realtime/client.ts src/lib/realtime/client.ts
cp Example/frontend_v2/src/lib/realtime/events.ts src/lib/realtime/events.ts
```

**Customize Realtime:**

- Update namespaces cho Vehicle Tracking System
- Update event types
- Giữ nguyên connection logic

#### 6.3 Copy Theme Provider

```bash
# Copy theme provider (hoặc tạo mới)
# src/components/providers/ThemeProvider.tsx
```

#### 6.4 Setup Root Layout với Providers

```typescript
// src/app/layout.tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { Toaster } from '@/components/ui/sonner';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <RealtimeProvider>
              {children}
              <Toaster />
            </RealtimeProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

