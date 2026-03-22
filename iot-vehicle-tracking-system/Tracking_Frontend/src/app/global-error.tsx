'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GlobalError = ({ error, reset }: { error: Error; reset: () => void }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <div className="safe-px safe-py flex min-h-[100dvh] flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Đã xảy ra lỗi nghiêm trọng</h2>
          <p className="max-w-lg text-muted-foreground">{error.message}</p>
          <Button onClick={reset}>Thử lại</Button>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
