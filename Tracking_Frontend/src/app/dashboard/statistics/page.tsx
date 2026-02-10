'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { statisticsServices } from '@/lib/api/statistics';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, LineChart, Line, Legend } from 'recharts';

export default function StatisticsPage() {
  const [interval, setInterval] = useState('day');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const params = { from, to, interval };
  const fleet = useQuery({ queryKey: ['stats-fleet', params], queryFn: () => statisticsServices.getFleetUsage(params) });
  const uptime = useQuery({ queryKey: ['stats-uptime', params], queryFn: () => statisticsServices.getDeviceUptime(params) });
  const alerts = useQuery({ queryKey: ['stats-alerts', params], queryFn: () => statisticsServices.getAlertFrequency(params) });
  const trips = useQuery({ queryKey: ['stats-trips', params], queryFn: () => statisticsServices.getTripSummary(params) });

  const fleetData = (fleet.data?.labels ?? []).map((label: string, index: number) => ({ label, active: fleet.data?.activeVehicles?.[index] ?? 0, inactive: fleet.data?.inactiveVehicles?.[index] ?? 0 }));
  const alertData = (alerts.data?.labels ?? []).map((label: string, index: number) => ({ label, speeding: alerts.data?.series?.speeding?.[index] ?? 0, geofence: alerts.data?.series?.geofence?.[index] ?? 0, offline: alerts.data?.series?.offline?.[index] ?? 0, other: alerts.data?.series?.other?.[index] ?? 0 }));
  const tripData = (trips.data?.labels ?? []).map((label: string, index: number) => ({ label, totalTrips: trips.data?.totalTrips?.[index] ?? 0, totalDistanceKm: trips.data?.totalDistanceKm?.[index] ?? 0, avgDuration: trips.data?.avgDuration?.[index] ?? 0 }));

  return (
    <PageContainer pageTitle="Báo cáo & Thống kê" pageDescription="Phân tích dữ liệu vận hành" pageHeaderAction={<Button onClick={() => window.print()}>Xuất PDF</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" className="rounded border p-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="rounded border p-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn chu kỳ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Theo ngày</SelectItem>
            <SelectItem value="week">Theo tuần</SelectItem>
            <SelectItem value="month">Theo tháng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Mức sử dụng đội xe</CardTitle></CardHeader>
          <CardContent className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={fleetData}><XAxis dataKey="label" hide /><YAxis /><Tooltip /><Area dataKey="active" stroke="#22c55e" fill="#bbf7d0" /><Area dataKey="inactive" stroke="#64748b" fill="#cbd5e1" /></AreaChart></ResponsiveContainer></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Thời gian hoạt động thiết bị</CardTitle></CardHeader>
          <CardContent className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={uptime.data?.devices ?? []}><XAxis dataKey="deviceId" hide /><YAxis /><Tooltip /><Bar dataKey="uptimePercent" fill="#2563eb" /></BarChart></ResponsiveContainer></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tần suất cảnh báo</CardTitle></CardHeader>
          <CardContent className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={alertData}><XAxis dataKey="label" hide /><YAxis /><Tooltip /><Legend /><Bar dataKey="speeding" stackId="a" fill="#f97316" /><Bar dataKey="geofence" stackId="a" fill="#22c55e" /><Bar dataKey="offline" stackId="a" fill="#ef4444" /><Bar dataKey="other" stackId="a" fill="#64748b" /></BarChart></ResponsiveContainer></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tổng quan chuyến đi</CardTitle></CardHeader>
          <CardContent className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={tripData}><XAxis dataKey="label" hide /><YAxis /><Tooltip /><Legend /><Line dataKey="totalTrips" stroke="#2563eb" /><Line dataKey="totalDistanceKm" stroke="#16a34a" /><Line dataKey="avgDuration" stroke="#ea580c" /></LineChart></ResponsiveContainer></CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

