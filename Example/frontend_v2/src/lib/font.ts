import {
  Inter,
  Mulish,
  Roboto,
  Noto_Sans,
  JetBrains_Mono
} from 'next/font/google';

import { cn } from '@/lib/utils';

// Primary sans-serif font with Vietnamese support
const fontSans = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
  display: 'swap'
});

// Monospace font for code/IDs
const fontMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-mono',
  display: 'swap'
});

// Alternative sans fonts with Vietnamese support
const fontNoto = Noto_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-noto',
  display: 'swap'
});

const fontMullish = Mulish({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-mullish',
  display: 'swap'
});

const fontRoboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap'
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontNoto.variable,
  fontMullish.variable,
  fontRoboto.variable
);
