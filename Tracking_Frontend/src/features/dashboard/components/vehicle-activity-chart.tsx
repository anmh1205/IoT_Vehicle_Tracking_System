'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function VehicleActivityChart({ data }: { data: Array<{ date: string; count: number }> }) {
  return (
    <Card>
      <CardHeader><CardTitle>Hoạt động phương tiện</CardTitle></CardHeader>
      <CardContent className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="count" stroke="#2563eb" fill="#bfdbfe" /></AreaChart></ResponsiveContainer></CardContent>
    </Card>
  );
}
