'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RuntimeRange } from '../device-constants';
import { formatHours } from '../device-utils';
import { EmptyState } from './EmptyState';

export function DeviceDetailRuntimeTab({
  loading,
  series,
  labels,
  range,
  onRangeChange
}: {
  loading: boolean;
  series: number[];
  labels: string[];
  range: RuntimeRange;
  onRangeChange: (r: RuntimeRange) => void;
}) {
  return (
    <Card className='flex h-full flex-1 flex-col'>
      <CardHeader className='flex items-center justify-between'>
        <CardTitle>Biểu đồ thời gian hoạt động</CardTitle>
        <div className='flex gap-2'>
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={range === d ? 'default' : 'outline'}
              size='sm'
              onClick={() => onRangeChange(d as RuntimeRange)}
            >
              {d} ngày
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className='flex-1'>
        {loading ? (
          <div className='flex h-64 items-center justify-center text-muted-foreground'>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Đang tải biểu đồ...
          </div>
        ) : series.length === 0 ? (
          <EmptyState message='Không có dữ liệu' />
        ) : (
          <RuntimeChart labels={labels} series={series} />
        )}
      </CardContent>
    </Card>
  );
}

function RuntimeChart({ labels, series }: { labels: string[]; series: number[] }) {
  return (
    <div className='text-sm text-muted-foreground space-y-1'>
      {series.slice(0, 10).map((v, i) => (
        <div key={i} className='flex items-center justify-between'>
          <span>{labels[i] || `Ngày ${i + 1}`}</span>
          <span>{formatHours(v)}</span>
        </div>
      ))}
      {series.length > 10 && <div className='text-xs'>... {series.length - 10} điểm dữ liệu khác</div>}
    </div>
  );
}

