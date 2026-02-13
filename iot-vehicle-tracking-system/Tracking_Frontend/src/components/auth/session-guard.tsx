'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authServices } from '@/lib/api/auth';
import { Loader2 } from 'lucide-react';
export const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, setAuth, clearAuth, isLoading, setLoading } = useAuthStore();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      setChecked(true);
      return;
    }
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
  }, [isAuthenticated, setAuth, clearAuth, setLoading]);
  if (!checked || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
};
