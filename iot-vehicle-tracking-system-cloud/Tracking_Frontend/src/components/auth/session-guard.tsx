'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authServices } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, setAuth, clearAuth, isLoading, setLoading } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();
  const isPublicRoute = pathname === '/' || pathname === '/login';

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false);
      setChecked(true);
      return;
    }

    if (isAuthenticated) {
      setLoading(false);
      setChecked(true);
      return;
    }

    setChecked(false);
    setLoading(true);

    authServices
      .getMe()
      .then((data) => {
        if (data.token) {
          setAuth(
            {
              ...data.user,
              isActive: data.user.status ? data.user.status === 'active' : true,
            },
            data.token,
          );
        } else {
          clearAuth();
        }
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setLoading(false);
        setChecked(true);
      });
  }, [clearAuth, isAuthenticated, isPublicRoute, setAuth, setLoading]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!checked || isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};
