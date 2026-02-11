'use client';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        label,
        active: Number(fleetQuery.data?.activeVehicles?.[index] ?? 0),
        inactive: Number(fleetQuery.data?.inactiveVehicles?.[index] ?? 0),
      })),
    [fleetQuery.data],
  );
  const uptimeData = useMemo(
    () =>
      (uptimeQuery.data?.devices ?? []).map((row: any) => ({
        label: String(row?.deviceId ?? row?.deviceName ?? row?.device_id ?? '-'),
        uptimePercent: Number(row?.uptimePercent ?? row?.uptime_percent ?? 0),
      })),
    [uptimeQuery.data],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          className="rounded border px-3 py-2 text-sm"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <input
          type="date"
          className="rounded border px-3 py-2 text-sm"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <Select value={interval} onValueChange={(value) => setInterval(value as typeof interval)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">By day</SelectItem>
            <SelectItem value="week">By week</SelectItem>
            <SelectItem value="month">By month</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="ml-auto"
          variant="outline"
          onClick={() =>
            exportMutation.mutate({
              exportType: 'statistics',
              filters: params,
            })
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Export report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total runtime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summaryQuery.data?.totalRuntimeHours ?? 0}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Average uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summaryQuery.data?.averageUptimePercent ?? 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summaryQuery.data?.totalSessions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summaryQuery.data?.totalAlerts ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FleetUtilizationChart data={fleetData} isLoading={fleetQuery.isLoading} />
        <DeviceUptimeChart data={uptimeData} isLoading={uptimeQuery.isLoading} />
      </div>
    </div>
  );
};
