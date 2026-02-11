import Link from 'next/link';
import { Button } from '@/components/ui/button';
const NotFoundPage = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Trang không tồn tại</p>
      <Button asChild>
        <Link href="/dashboard">Về trang chủ</Link>
      </Button>
    </div>
  );
};
export default NotFoundPage;
