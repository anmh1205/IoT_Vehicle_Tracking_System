'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/number';
import { VibPeriod } from '../device-constants';
import { EmptyState } from './EmptyState';

export function DeviceDetailVibrationTab({
  loading,
  series,
  labels,
  period,
  onPeriodChange,
  threshold
}: {
  loading: boolean;
  series: number[];
  labels: string[];
  period: VibPeriod;
  onPeriodChange: (p: VibPeriod) => void;
  threshold: number | null;
}) {
  return (
    <Card>
      <CardHeader className='flex items-center justify-between'>
        <CardTitle>Biểu đồ rung</CardTitle>
        <div className='flex gap-2'>
          {(['sample', 'minute', 'hour', 'day'] as const).map((p) => (
            <Button key={p} variant={period === p ? 'default' : 'outline'} size='sm' onClick={() => onPeriodChange(p)}>
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='flex h-64 items-center justify-center text-muted-foreground'>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Đang tải biểu đồ...
          </div>
        ) : series.length === 0 ? (
          <EmptyState message='Không có dữ liệu' />
        ) : (
          <VibrationChart labels={labels} series={series} threshold={threshold} />
        )}
      </CardContent>
    </Card>
  );
}

function VibrationChart({
  labels,
  series,
  threshold
}: {
  labels: string[];
  series: number[];
  threshold: number | null;
}) {
  return (
    <div className='text-sm text-muted-foreground space-y-1'>
      {series.slice(0, 12).map((v, i) => (
        <div key={i} className='flex items-center justify-between'>
          <span>{labels[i] || `Mẫu ${i + 1}`}</span>
          <span>
            {formatNumber(v, 2)} mm/s {threshold != null && v > threshold ? '(> ngưỡng)' : ''}
          </span>
        </div>
      ))}
      {series.length > 12 && <div className='text-xs'>... {series.length - 12} điểm dữ liệu khác</div>}
    </div>
  );
}

