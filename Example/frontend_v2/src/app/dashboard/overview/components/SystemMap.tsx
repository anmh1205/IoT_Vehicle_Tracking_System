'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const GOONG_EMBED = 'https://maps.goong.io/maps/embed/v2/place';

/**
 * System map hiển thị qua Goong Map embed.
 * Yêu cầu `NEXT_PUBLIC_GOONG_MAP_KEY`; nếu chưa có sẽ hiển thị cảnh báo.
 */
export function SystemMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOONG_MAP_KEY;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sơ đồ hệ thống</CardTitle>
        <CardDescription>Hiển thị vị trí thiết bị (Goong Map)</CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        {apiKey ? (
          <iframe
            title='Goong Map'
            src={`${GOONG_EMBED}?api_key=${apiKey}&q=Ha%20Noi`}
            style={{ border: 0 }}
            loading='lazy'
            className='h-[360px] w-full rounded-b-xl'
            referrerPolicy='no-referrer-when-downgrade'
          />
        ) : (
          <div className='flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground'>
            <AlertTriangle className='h-8 w-8 text-amber-500' />
            <div className='text-sm'>
              Thiếu GOONG_API_KEY. Thêm biến NEXT_PUBLIC_GOONG_MAP_KEY để hiển thị bản đồ.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

