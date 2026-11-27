'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Gauge, TimerReset, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  useDeviceUptime,
  useFleetUtilization,
  useStatisticsParams,
  useStatisticsSummary,
} from '@/features/statistics/hooks/use-statistics';
import { FleetUtilizationChart } from './fleet-utilization-chart';
import { DeviceUptimeChart } from './device-uptime-chart';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';
import { isDateInputRangeValid } from '@/lib/utils/date/range';

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
      (uptimeQuery.data?.devices ?? []).map((row) => ({
        label: String(row.deviceId || '-'),
        uptimePercent: Number(row?.uptimePercent ?? 0),
      })),
    [uptimeQuery.data],
  );

  const dateRangeValid = isDateInputRangeValid(params);
  const failedQueries = [summaryQuery, fleetQuery, uptimeQuery].filter((query) => query.isError);

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
            max={to || undefined}
            aria-invalid={!dateRangeValid}
            aria-describedby={!dateRangeValid ? 'statistics-date-error' : undefined}
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
            min={from || undefined}
            aria-invalid={!dateRangeValid}
            aria-describedby={!dateRangeValid ? 'statistics-date-error' : undefined}
            onChange={(event) => setTo(event.target.value)}
            className="w-full sm:w-[170px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="statistics-interval" className="text-xs text-muted-foreground">Nhóm dữ liệu</Label>
          <Select value={interval} onValueChange={(value) => setInterval(value as typeof interval)}>
            <SelectTrigger id="statistics-interval" className="w-full sm:w-[170px]">
              <SelectValue placeholder="Khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Theo ngày</SelectItem>
              <SelectItem value="week">Theo tuần</SelectItem>
              <SelectItem value="month">Theo tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!dateRangeValid ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription id="statistics-date-error">
            Chọn đủ hai ngày. Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.
          </AlertDescription>
        </Alert>
      ) : null}

      {failedQueries.length > 0 ? (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Không thể tải dữ liệu thống kê</AlertTitle>
          <AlertDescription>
            <p>Một phần dữ liệu trong khoảng thời gian đã chọn chưa tải được.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={failedQueries.some((query) => query.isFetching)}
              onClick={() => {
                for (const query of failedQueries) void query.refetch();
              }}
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {dateRangeValid ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tổng thời gian hoạt động"
              value={summaryQuery.data ? `${formatNumber(summaryQuery.data.totalRuntimeHours)} giờ` : '—'}
              icon={<TimerReset className="h-4 w-4" />}
              isLoading={summaryQuery.isLoading}
            />
            <StatCard
              title="Độ ổn định kết nối"
              value={summaryQuery.data ? `${formatNumber(summaryQuery.data.averageUptimePercent)}%` : '—'}
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={summaryQuery.isLoading}
            />
            <StatCard
              title="Tổng phiên"
              value={summaryQuery.data?.totalSessions ?? '—'}
              icon={<Gauge className="h-4 w-4" />}
              isLoading={summaryQuery.isLoading}
            />
            <StatCard
              title="Tổng cảnh báo"
              value={summaryQuery.data?.totalAlerts ?? '—'}
              icon={<AlertTriangle className="h-4 w-4" />}
              isLoading={summaryQuery.isLoading}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FleetUtilizationChart data={fleetData} isLoading={fleetQuery.isLoading} />
            <DeviceUptimeChart data={uptimeData} isLoading={uptimeQuery.isLoading} />
          </div>
        </>
      ) : null}
    </div>
  );
};
