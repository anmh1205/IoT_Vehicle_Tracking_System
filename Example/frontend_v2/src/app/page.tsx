'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function Page() {
  const router = useRouter();
  const { token, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [hasHydrated, token, router]);

  return (
    <div className='flex min-h-screen items-center justify-center text-sm text-muted-foreground'>
      Đang chuyển hướng...
    </div>
  );
}
