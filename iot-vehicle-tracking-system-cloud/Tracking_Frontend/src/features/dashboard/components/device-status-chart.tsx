'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#dc2626'];

export const DeviceStatusChart = ({ data }: { data: any }) => {
  const chartData = [
    { name: 'Đang gửi dữ liệu', value: data?.running ?? data?.activeDevices ?? 0 },
    { name: 'Còn heartbeat', value: data?.online ?? 0 },
    { name: 'Chậm nhịp', value: data?.stopped ?? data?.stoppedDevices ?? 0 },
    { name: 'Mất kết nối', value: data?.disconnected ?? data?.offlineDevices ?? 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái kết nối thiết bị</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
