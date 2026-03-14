import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './theme.css';
import { Providers } from '@/components/providers/providers';
import { cookies } from 'next/headers';
const inter = Inter({ subsets: ['latin', 'vietnamese'] });
export const metadata: Metadata = {
  title: 'Hệ thống theo dõi phương tiện IoT',
  description: 'Hệ thống giám sát phương tiện IoT',
};
const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const activeTheme = cookieStore.get('active_theme')?.value;
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Bỏ qua đến nội dung chính
        </a>
        <Providers activeTheme={activeTheme}>{children}</Providers>
      </body>
    </html>
  );
};
export default RootLayout;
