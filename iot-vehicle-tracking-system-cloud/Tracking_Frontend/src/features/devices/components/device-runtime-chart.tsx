'use client';

import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeviceRuntimeBucket } from '@/features/devices/types';
import { formatDuration } from '@/lib/utils/date/format';

export const DeviceRuntimeChart = ({ data }: { data: DeviceRuntimeBucket[] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.floor(entries[0]?.contentRect.width ?? 0);
      setChartWidth(nextWidth > 0 ? nextWidth : 0);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Runtime gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-[180px] min-w-0 w-full">
          {chartWidth > 0 ? (
            <BarChart width={chartWidth} height={180} data={data}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={50} />
              <Tooltip formatter={(value) => formatDuration(Number(value ?? 0))} />
              <Bar dataKey="runtimeSeconds" radius={[8, 8, 0, 0]} fill="#2563eb" />
            </BarChart>
          ) : (
            <div className="h-full w-full rounded-lg bg-muted/20" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
