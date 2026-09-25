'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { syncNativePushToken } from '@/lib/native-push';

type NativeFcmTokenEvent = CustomEvent<{ token?: string }>;

export const NativePushProvider = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const syncCurrent = () => {
      void syncNativePushToken().catch(() => {
        // Push registration is best-effort and must not break the dashboard session.
      });
    };

    const handleTokenChanged = (event: Event) => {
      const token = (event as NativeFcmTokenEvent).detail?.token;
      if (!token) return;
      void syncNativePushToken(token).catch(() => {
        // The latest token remains in native secure storage and will retry on reload.
      });
    };

    syncCurrent();
    window.addEventListener('NativeBridgeReady', syncCurrent);
    window.addEventListener('NativeFcmTokenChanged', handleTokenChanged);

    return () => {
      window.removeEventListener('NativeBridgeReady', syncCurrent);
      window.removeEventListener('NativeFcmTokenChanged', handleTokenChanged);
    };
  }, [isAuthenticated]);

  return <>{children}</>;
};
