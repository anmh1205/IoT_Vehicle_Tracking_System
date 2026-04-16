'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeviceActivityPoint } from '@/features/dashboard/hooks/use-dashboard-stats';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const BarGraph = ({
  data,
  isLoading,
}: {
  data: DeviceActivityPoint[];
  isLoading?: boolean;
}) => {
  const totalSignals = data.reduce(
    (sum, item) => sum + item.running + item.idle + item.offline,
    0,
  );
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) {
      return;
    }

    const syncSize = () => {
      setIsChartReady(element.offsetWidth > 0 && element.offsetHeight > 0);
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
        <CardTitle>Hoạt động thiết bị trong 7 ngày</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalSignals > 0
            ? `${totalSignals} tín hiệu hoạt động được tổng hợp trong 7 ngày gần nhất`
            : 'Đang chờ dữ liệu hoạt động được đồng bộ từ thiết bị'}
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <div ref={chartContainerRef} className="h-[320px] min-w-0">
          {isLoading || (data.length > 0 && !isChartReady) ? (
            <Skeleton className="h-full w-full" />
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Chưa có dữ liệu hoạt động để hiển thị.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
                <Bar dataKey="running" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="idle" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offline" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
