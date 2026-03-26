'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, CircleCheckBig, CircleOff, Wrench } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { maintenanceServices } from '@/lib/api/maintenance';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';
import { MaintenanceCalendar } from '@/features/maintenance/components/maintenance-calendar';
import { MileageForecaster } from '@/features/maintenance/components/mileage-forecaster';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  oil_change: 'Thay dầu',
  tire_rotation: 'Đảo lốp',
  tire_replacement: 'Thay lốp',
  inspection: 'Kiểm tra định kỳ',
  battery: 'Ắc quy',
  brake: 'Phanh',
  engine: 'Động cơ',
};

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'scheduled', label: STATUS_LABELS.scheduled },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'cancelled', label: STATUS_LABELS.cancelled },
] as const;

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại bảo trì' },
  ...Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
] as const;

const MaintenancePage = () => {
  const queryClient = useQueryClient();
  const [day, setDay] = useState<Date | undefined>(new Date());
  const [tab, setTab] = useState('list');
  const [filters, setFilters] = useState({
    page: 1,
    status: 'all',
    maintenanceType: 'all',
    vehicleId: '',
  });

  const queryParams = {
    page: filters.page,
    limit: PAGE_SIZE,
    status: filters.status === 'all' ? undefined : filters.status,
    maintenanceType: filters.maintenanceType === 'all' ? undefined : filters.maintenanceType,
    vehicleId: filters.vehicleId.trim() || undefined,
  };

  const maint = useQuery({
    queryKey: ['maintenance', queryParams],
    queryFn: () => maintenanceServices.getList(queryParams),
  });

  const statsQuery = useQuery({
    queryKey: ['maintenance', 'status-counts'],
    queryFn: async () => {
      const [scheduled, inProgress, completed, cancelled] = await Promise.all([
        maintenanceServices.getList({ status: 'scheduled', limit: 1 }),
        maintenanceServices.getList({ status: 'in_progress', limit: 1 }),
        maintenanceServices.getList({ status: 'completed', limit: 1 }),
        maintenanceServices.getList({ status: 'cancelled', limit: 1 }),
      ]);
      return {
        total:
          (scheduled?.pagination?.total ?? 0) +
          (inProgress?.pagination?.total ?? 0) +
          (completed?.pagination?.total ?? 0) +
          (cancelled?.pagination?.total ?? 0),
        scheduled: scheduled?.pagination?.total ?? 0,
        inProgress: inProgress?.pagination?.total ?? 0,
        completed: completed?.pagination?.total ?? 0,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => maintenanceServices.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật bảo trì thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật trạng thái bảo trì.'),
      );
    },
  });

  const rows = useMemo(() => maint.data?.items ?? maint.data?.data?.items ?? [], [maint.data]);
  const pagination = maint.data?.pagination ?? {
    page: filters.page,
    limit: PAGE_SIZE,
    total: rows.length,
    totalPages: 1,
  };

  const dueSoon = useMemo(
    () =>
      [...rows]
        .filter((row: any) => row.status === 'scheduled' || row.status === 'in_progress')
        .sort((a: any, b: any) => {
          const left = new Date(a.scheduledDate ?? a.nextServiceDate ?? a.createdAt).getTime();
          const right = new Date(b.scheduledDate ?? b.nextServiceDate ?? b.createdAt).getTime();
          return left - right;
        })
        .slice(0, 3),
    [rows],
  );

  const getActionConfig = (row: any) => {
    if (row.status === 'scheduled') {
      return {
        label: 'Bắt đầu',
        payload: { status: 'in_progress' },
      };
    }
    if (row.status === 'in_progress') {
      return {
        label: 'Hoàn tất',
        payload: {
          status: 'completed',
          completedDate: new Date().toISOString(),
        },
      };
    }
    return null;
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'vehicleId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phương tiện" />,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hạng mục" />,
    },
    {
      accessorKey: 'maintenanceType',
      header: 'Loại',
      cell: ({ row }) =>
        MAINTENANCE_TYPE_LABELS[row.original.maintenanceType] ?? row.original.maintenanceType,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
    {
      accessorKey: 'scheduledDate',
      header: 'Ngày hẹn',
      cell: ({ row }) => formatDateTime(row.original.scheduledDate, 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'nextServiceMileage',
      header: 'Mốc km',
      cell: ({ row }) =>
        row.original.nextServiceMileage ? `${formatNumber(row.original.nextServiceMileage)} km` : '-',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const action = getActionConfig(row.original);
        if (!action) {
          return <span className="text-xs text-muted-foreground">Đã xong</span>;
        }
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate({ id: row.original.id, ...action.payload })}
          >
            {action.label}
          </Button>
        );
      },
    },
  ];

  return (
    <PageContainer pageTitle="Bảo trì" pageDescription="Lập lịch, theo dõi và đẩy trạng thái bảo trì phương tiện">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng lịch bảo trì"
          value={statsQuery.data?.total ?? 0}
          icon={<Wrench className="h-4 w-4" />}
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          title="Đã lên lịch"
          value={statsQuery.data?.scheduled ?? 0}
          icon={<CalendarClock className="h-4 w-4" />}
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          title="Đang xử lý"
          value={statsQuery.data?.inProgress ?? 0}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={statsQuery.isLoading}
        />
        <StatCard
          title="Hoàn tất"
          value={statsQuery.data?.completed ?? 0}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={statsQuery.isLoading}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Bộ lọc kế hoạch bảo trì</p>
            <p className="text-xs text-muted-foreground">
              Thu hẹp danh sách theo xe, loại bảo trì và trạng thái để điều phối nhanh hơn.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_auto]">
            <div className="space-y-1">
              <Label htmlFor="maintenance-vehicle">Phương tiện</Label>
              <Input
                id="maintenance-vehicle"
                value={filters.vehicleId}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, page: 1, vehicleId: event.target.value }))
                }
                placeholder="Nhập mã xe"
              />
            </div>
            <div className="space-y-1">
              <Label>Trạng thái</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, page: 1, status: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Loại bảo trì</Label>
              <Select
                value={filters.maintenanceType}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, page: 1, maintenanceType: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  setFilters({
                    page: 1,
                    status: 'all',
                    maintenanceType: 'all',
                    vehicleId: '',
                  })
                }
              >
                Đặt lại
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dueSoon.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {dueSoon.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ưu tiên gần nhất</p>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.vehicleId} · {MAINTENANCE_TYPE_LABELS[item.maintenanceType] ?? item.maintenanceType}
                  </p>
                </div>
                <p className="text-sm">
                  Hẹn {formatDateTime(item.scheduledDate ?? item.nextServiceDate, 'dd/MM/yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="calendar">Lịch</TabsTrigger>
          <TabsTrigger value="forecast">Dự báo km</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <DataTable
            columns={columns}
            data={rows}
            searchKey="vehicleId"
            searchPlaceholder="Tìm phương tiện..."
            isLoading={maint.isLoading}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Trang {pagination.page} / {pagination.totalPages || 1} · {pagination.total} lịch bảo trì
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1 || maint.isFetching}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= (pagination.totalPages || 1) || maint.isFetching}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <MaintenanceCalendar day={day} onDayChange={setDay} rows={rows} />
        </TabsContent>

        <TabsContent value="forecast">
          <MileageForecaster rows={rows} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default MaintenancePage;
