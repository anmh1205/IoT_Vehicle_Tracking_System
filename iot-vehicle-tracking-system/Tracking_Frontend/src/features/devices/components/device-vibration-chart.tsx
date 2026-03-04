'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import type { DeviceVibrationPoint } from '@/features/devices/types';
export const DeviceVibrationChart = ({
  data,
  threshold = 0,
}: {
  data: DeviceVibrationPoint[];
  threshold?: number;
}) => {
  const chartData = data.map((item) => ({
    ...item,
    label: item.timestamp.slice(11, 16),
    threshold,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Độ rung gần đây</CardTitle>
      </CardHeader>
      <CardContent className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <Tooltip />
            <Line dataKey="value" stroke="#14b8a6" dot={false} strokeWidth={2} />
            {threshold > 0 ? (
              <Line dataKey="threshold" stroke="#ef4444" dot={false} strokeDasharray="4 4" />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
