'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
const COLORS = ['#16a34a', '#6b7280', '#f59e0b', '#dc2626'];
export const DeviceStatusChart = ({ data }: { data: any }) => {
  const chartData = [
    { name: 'Đang chạy', value: data?.running ?? data?.activeDevices ?? 0 },
    { name: 'Dừng', value: data?.stopped ?? data?.stoppedDevices ?? 0 },
    { name: 'Mất kết nối', value: data?.disconnected ?? data?.offlineDevices ?? 0 },
    { name: 'Lỗi', value: data?.error ?? 0 },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái thiết bị</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90}>
              {chartData.map((e, i) => (
                <Cell key={e.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
