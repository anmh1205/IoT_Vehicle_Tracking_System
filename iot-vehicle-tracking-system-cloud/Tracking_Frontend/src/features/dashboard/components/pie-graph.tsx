'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeviceStatusPoint } from '@/lib/api/dashboard';
import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';

export const PieGraph = ({
  data,
  isLoading,
  isUnavailable,
}: {
  data: DeviceStatusPoint[];
  isLoading?: boolean;
  isUnavailable?: boolean;
}) => {
  const hasMeaningfulData = data.some((item) => item.value > 0);
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
        <CardTitle>Phân bố trạng thái kết nối thiết bị</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <div ref={chartContainerRef} className="h-[320px] min-w-0">
          {isLoading || (hasMeaningfulData && !isChartReady) ? (
            <Skeleton className="h-full w-full" />
          ) : data.length === 0 || !hasMeaningfulData ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              {isUnavailable ? 'Không thể tải trạng thái kết nối.' : 'Chưa có thiết bị để hiển thị.'}
            </div>
          ) : (
            <PieChart width={chartSize.width} height={chartSize.height}>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={92}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
