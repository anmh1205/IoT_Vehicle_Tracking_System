'use client';
import React from 'react';
import { ActiveThemeProvider } from '../active-theme';
import QueryProvider from '@/components/providers/QueryProvider';
import RealtimeProvider from '@/components/providers/RealtimeProvider';
import NotificationProvider from '@/components/providers/NotificationProvider';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <ActiveThemeProvider initialTheme={activeThemeValue}>
      <QueryProvider>
        <RealtimeProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </RealtimeProvider>
      </QueryProvider>
    </ActiveThemeProvider>
  );
}
