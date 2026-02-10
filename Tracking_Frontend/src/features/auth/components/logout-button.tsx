'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { authServices } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

export function LogoutButton() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const onLogout = async () => {
    try { await authServices.logout(); } finally { clearAuth(); router.replace('/login'); }
  };
  return <Button variant="outline" size="sm" onClick={onLogout}><LogOut className="mr-2 h-4 w-4" /> Đăng xuất</Button>;
}

