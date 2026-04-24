import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Sans, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { BRAND_ASSETS, BRAND_DESCRIPTION, BRAND_FULL_NAME, BRAND_NAME } from '@/lib/brand';
import { Providers } from '@/components/providers/providers';
import './globals.css';
import './theme.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });
const archivo = Archivo({ subsets: ['latin', 'vietnamese'], variable: '--font-display' });
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-marketing',
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} | ${BRAND_FULL_NAME}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  icons: {
    icon: [
      { url: BRAND_ASSETS.mark32, sizes: '32x32', type: 'image/png' },
      { url: BRAND_ASSETS.mark192, sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: BRAND_ASSETS.appleTouch, sizes: '180x180', type: 'image/png' }],
    shortcut: [BRAND_ASSETS.mark32],
  },
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const activeTheme = cookieStore.get('active_theme')?.value;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.className} ${archivo.variable} ${ibmPlexSans.variable} min-h-[100dvh] antialiased`}
      >
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
