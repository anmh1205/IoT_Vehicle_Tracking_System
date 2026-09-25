'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeviceActivityPoint } from '@/features/dashboard/hooks/use-dashboard-stats';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

export const BarGraph = ({
  data,
  isLoading,
}: {
  data: DeviceActivityPoint[];
  isLoading?: boolean;
}) => {
  const totalSignals = data.reduce((sum, item) => sum + item.running + item.idle + item.offline, 0);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const isChartReady = chartSize.width > 0 && chartSize.height > 0;

  useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) {
      return;
    }

    const syncSize = () => {
      setChartSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    syncSize();
    const frameId = requestAnimationFrame(syncSize);
    const observer = new ResizeObserver(syncSize);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Nhịp kết nối thiết bị trong 7 ngày</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalSignals > 0
            ? `${totalSignals} tín hiệu kết nối được tổng hợp trong 7 ngày gần nhất`
            : 'Đang chờ dữ liệu kết nối được đồng bộ từ thiết bị'}
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <div ref={chartContainerRef} className="h-[320px] min-w-0">
          {isLoading || (data.length > 0 && !isChartReady) ? (
            <Skeleton className="h-full w-full" />
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Chưa có dữ liệu nhịp kết nối để hiển thị.
            </div>
          ) : (
            <BarChart width={chartSize.width} height={chartSize.height} data={data} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
              <Bar dataKey="running" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offline" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
