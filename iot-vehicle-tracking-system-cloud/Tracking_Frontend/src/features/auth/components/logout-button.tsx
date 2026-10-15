'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOutSession } from '@/lib/session-signout';
export const LogoutButton = () => {
  const router = useRouter();
  const onLogout = async () => {
    const reason = await signOutSession();
    router.replace(`/login?reason=${reason}`);
  };

  return (
    <Button variant="outline" size="sm" onClick={onLogout}>
      <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
    </Button>
  );
};
