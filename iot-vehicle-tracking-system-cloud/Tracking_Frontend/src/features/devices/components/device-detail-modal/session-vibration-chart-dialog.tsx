'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import type { DeviceVibrationPoint } from '@/features/devices/types';
export const SessionVibrationChartDialog = ({
  open,
  onOpenChange,
  title,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: DeviceVibrationPoint[];
}) => {
  const chartData = data.map((point) => ({
    ...point,
    label: point.timestamp.slice(11, 19),
  }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Biểu đồ rung của phiên chạy, dùng để đối chiếu biên độ theo mốc thời gian trong phiên đã chọn.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={45} />
              <Tooltip />
              <Line dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
