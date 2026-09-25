'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authServices } from '@/lib/api/auth';
import { unregisterNativePushToken } from '@/lib/native-push';
import { useAuthStore } from '@/lib/stores/auth-store';
export const LogoutButton = () => {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const onLogout = async () => {
    try {
      await unregisterNativePushToken();
    } catch {
      // Best-effort: logout must continue even if native push cleanup fails.
    }

    try {
      await authServices.logout();
    } finally {
      clearAuth();
      router.replace('/login');
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={onLogout}>
      <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
    </Button>
  );
};
