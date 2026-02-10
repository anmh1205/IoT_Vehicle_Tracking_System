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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeTheme = cookieStore.get('active_theme')?.value;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers activeTheme={activeTheme}>{children}</Providers>
      </body>
    </html>
  );
}


