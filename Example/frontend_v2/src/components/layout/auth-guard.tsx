'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/login');
    }
  }, [hasHydrated, token, router]);

  if (!hasHydrated) {
    return (
      <div className='flex min-h-screen items-center justify-center text-sm text-muted-foreground'>
        Đang tải phiên đăng nhập...
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}

