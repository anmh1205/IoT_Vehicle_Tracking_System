'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PieStatusPoint } from '@/features/dashboard/hooks/use-dashboard-stats';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export const PieGraph = ({ data, isLoading }: { data: PieStatusPoint[]; isLoading?: boolean }) => {
  const hasMeaningfulData = data.some((item) => item.value > 0);
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
        <CardTitle>Phân bố trạng thái thiết bị</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <div ref={chartContainerRef} className="h-[320px] min-w-0">
          {isLoading || (hasMeaningfulData && !isChartReady) ? (
            <Skeleton className="h-full w-full" />
          ) : data.length === 0 || !hasMeaningfulData ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Chưa có dữ liệu trạng thái thiết bị.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={92}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
