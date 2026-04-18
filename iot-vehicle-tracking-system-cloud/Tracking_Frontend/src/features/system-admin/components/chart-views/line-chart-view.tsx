'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricSeries } from '@/features/system-admin/types';

const COLORS = ['#2563eb', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#0ea5e9'];

export const LineChartView = ({ series }: { series: MetricSeries[] }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  const rows = useMemo(() => {
    const bucket = new Map<number, Record<string, number | string>>();
    for (const item of series) {
      for (const point of item.points) {
        if (!bucket.has(point.timestamp)) {
          bucket.set(point.timestamp, {
            timestamp: point.timestamp,
            label: format(new Date(point.timestamp), 'HH:mm:ss'),
          });
        }
        bucket.get(point.timestamp)![item.name] = point.value;
      }
    }
    return Array.from(bucket.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  }, [series]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      setReady(false);
      return;
    }

    const updateReady = () => {
      const rect = element.getBoundingClientRect();
      setReady(rect.width > 0 && rect.height > 0);
    };

    updateReady();

    if (typeof ResizeObserver === 'undefined') {
      const frame = window.requestAnimationFrame(updateReady);
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver(() => updateReady());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (series.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          Không có chuỗi dữ liệu để hiển thị biểu đồ.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent ref={containerRef} className="h-[380px] p-3">
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={20} />
              <YAxis />
              <Tooltip />
              <Legend />
              {series.map((item, index) => (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={item.name}
                  stroke={COLORS[index % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Đang khởi tạo biểu đồ...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
