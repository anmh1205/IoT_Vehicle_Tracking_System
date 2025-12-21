'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, PauseCircle, PlayCircle, Send } from 'lucide-react';

export function SimulatorControls({
  isSending,
  isAutoMode,
  autoInterval,
  onSendData,
  onSendStopData,
  onGenerateRandom,
  onToggleAutoMode,
  disabled
}: {
  isSending: boolean;
  isAutoMode: boolean;
  autoInterval: number;
  onSendData: (isManual?: boolean) => void;
  onSendStopData: () => void;
  onGenerateRandom: () => void;
  onToggleAutoMode: () => void;
  disabled: boolean;
}) {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Điều khiển</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 text-sm'>
        <div className='flex items-center justify-between rounded-lg border p-3'>
          <div>
            <div className='font-medium text-foreground'>Tự động</div>
            <div className='text-xs text-muted-foreground'>
              {isAutoMode ? `${autoInterval} ms/lần` : 'Tắt'}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Label htmlFor='auto-mode' className='sr-only'>
              Auto mode
            </Label>
            <Switch id='auto-mode' checked={isAutoMode} onCheckedChange={onToggleAutoMode} disabled={disabled} />
          </div>
        </div>

        <div className='space-y-2'>
          <Button className='w-full' onClick={() => onSendData(true)} disabled={disabled || isSending}>
            {isSending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Send className='mr-2 h-4 w-4' />}
            Gửi dữ liệu
          </Button>
          <Button variant='destructive' className='w-full' onClick={onSendStopData} disabled={disabled}>
            <PauseCircle className='mr-2 h-4 w-4' />
            Gửi dữ liệu dừng
          </Button>
          <Button variant='outline' className='w-full' onClick={onGenerateRandom} disabled={disabled}>
            <PlayCircle className='mr-2 h-4 w-4' />
            Tạo ngẫu nhiên
          </Button>
        </div>

        <div className='rounded-lg border bg-muted/50 p-3 text-center text-xs text-muted-foreground'>
          {disabled ? 'Chọn thiết bị để bắt đầu' : isAutoMode ? 'Đang chạy tự động' : 'Sẵn sàng'}
        </div>
      </CardContent>
    </Card>
  );
}

