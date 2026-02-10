'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Đã xảy ra lỗi nghiêm trọng</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={reset}>Thử lại</Button>
        </div>
      </body>
    </html>
  );
}
