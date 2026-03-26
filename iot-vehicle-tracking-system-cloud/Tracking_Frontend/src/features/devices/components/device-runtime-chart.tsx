'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { DeviceRuntimeBucket } from '@/features/devices/types';
import { formatDuration } from '@/lib/utils/date/format';
export const DeviceRuntimeChart = ({ data }: { data: DeviceRuntimeBucket[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Runtime gần đây</CardTitle>
      </CardHeader>
      <CardContent className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={50} />
            <Tooltip formatter={(value) => formatDuration(Number(value ?? 0))} />
            <Bar dataKey="runtimeSeconds" radius={[8, 8, 0, 0]} fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
