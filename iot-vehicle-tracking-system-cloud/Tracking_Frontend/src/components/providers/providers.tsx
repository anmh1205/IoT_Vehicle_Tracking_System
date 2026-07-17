'use client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryProvider } from './query-provider';
import { SocketProvider } from './socket-provider';
import { SessionGuard } from '@/components/auth/session-guard';
import { ActiveTheme } from '@/components/active-theme';
import { TooltipProvider } from '@/components/ui/tooltip';
export const Providers = ({
  children,
  activeTheme,
}: {
  children: React.ReactNode;
  activeTheme?: string;
}) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ActiveTheme initialTheme={activeTheme}>
        <TooltipProvider>
          <QueryProvider>
            <SessionGuard>
              <SocketProvider>{children}</SocketProvider>
            </SessionGuard>
          </QueryProvider>
        </TooltipProvider>
      </ActiveTheme>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
};
