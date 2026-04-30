'use client';

import { useMemo, useState } from 'react';
import { Download, TimerReset, TrendingUp, Gauge, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatCard } from '@/components/common/stat-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateExport } from '@/hooks/mutations/use-create-export';
import {
  useDeviceUptime,
  useFleetUtilization,
  useStatisticsParams,
  useStatisticsSummary,
} from '@/features/statistics/hooks/use-statistics';
import { FleetUtilizationChart } from './fleet-utilization-chart';
import { DeviceUptimeChart } from './device-uptime-chart';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';

const formatFleetLabel = (value: string, interval: 'day' | 'week' | 'month'): string => {
  if (interval === 'month') {
    return formatDateTime(value, 'MM/yyyy');
  }

  if (interval === 'week') {
    return formatDateTime(value, 'dd/MM');
  }

  return formatDateTime(value, 'dd/MM');
};

export const StatisticsOverview = () => {
  const defaultParams = useStatisticsParams();
  const [from, setFrom] = useState(defaultParams.from);
  const [to, setTo] = useState(defaultParams.to);
  const [interval, setInterval] = useState(defaultParams.interval);
  const params = useMemo(() => ({ from, to, interval }), [from, to, interval]);
  const summaryQuery = useStatisticsSummary(params);
  const fleetQuery = useFleetUtilization(params);
  const uptimeQuery = useDeviceUptime(params);
  const exportMutation = useCreateExport();
  const fleetData = useMemo(
    () =>
      (fleetQuery.data?.labels ?? []).map((label: string, index: number) => ({
        label: formatFleetLabel(label, interval),
        active: Number(fleetQuery.data?.activeVehicles?.[index] ?? 0),
        inactive: Number(fleetQuery.data?.inactiveVehicles?.[index] ?? 0),
      })),
    [fleetQuery.data, interval],
  );
  const uptimeData = useMemo(
    () =>
      (uptimeQuery.data?.devices ?? []).map((row: any) => ({
        label: String(row?.deviceId ?? row?.deviceName ?? '-'),
        uptimePercent: Number(row?.uptimePercent ?? 0),
      })),
    [uptimeQuery.data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="space-y-1">
          <Label htmlFor="statistics-from-date" className="text-xs text-muted-foreground">
            Từ ngày
          </Label>
          <Input
            id="statistics-from-date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full sm:w-[170px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="statistics-to-date" className="text-xs text-muted-foreground">
            Đến ngày
          </Label>
          <Input
            id="statistics-to-date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full sm:w-[170px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Khoảng thời gian</Label>
          <Select value={interval} onValueChange={(value) => setInterval(value as typeof interval)}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Theo ngày</SelectItem>
              <SelectItem value="week">Theo tuần</SelectItem>
              <SelectItem value="month">Theo tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full lg:ml-auto lg:w-auto"
          variant="outline"
          onClick={() =>
            exportMutation.mutate({
              exportType: 'statistics',
              filters: params,
            })
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Xuất báo cáo
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng thời gian hoạt động"
          value={`${formatNumber(summaryQuery.data?.totalRuntimeHours ?? 0)}h`}
          icon={<TimerReset className="h-4 w-4" />}
          isLoading={summaryQuery.isLoading}
        />
        <StatCard
          title="Uptime trung bình"
          value={`${formatNumber(summaryQuery.data?.averageUptimePercent ?? 0)}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={summaryQuery.isLoading}
        />
        <StatCard
          title="Tổng phiên"
          value={summaryQuery.data?.totalSessions ?? 0}
          icon={<Gauge className="h-4 w-4" />}
          isLoading={summaryQuery.isLoading}
        />
        <StatCard
          title="Tổng cảnh báo"
          value={summaryQuery.data?.totalAlerts ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          isLoading={summaryQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FleetUtilizationChart data={fleetData} isLoading={fleetQuery.isLoading} />
        <DeviceUptimeChart data={uptimeData} isLoading={uptimeQuery.isLoading} />
      </div>
    </div>
  );
};
