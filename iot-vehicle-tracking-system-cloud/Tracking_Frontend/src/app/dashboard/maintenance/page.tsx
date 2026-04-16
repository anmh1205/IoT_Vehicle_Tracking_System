'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, CircleCheckBig, CircleOff, Wrench } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Badge } from '@/components/ui/badge';
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
import { alertServices } from '@/lib/api/alerts';
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

const STATUS_BADGE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  scheduled: 'outline',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
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

const isObdMaintenanceAlert = (item: any): boolean => {
  const text = `${String(item?.title ?? '')} ${String(item?.message ?? '')}`.toLowerCase();
  return (
    item?.alertType === 'maintenance_due' &&
    (text.includes('obd') ||
      text.includes('coolant') ||
      text.includes('voltage') ||
      text.includes('idle-load') ||
      text.includes('channel'))
  );
};

const OBD_SEVERITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
};

const OBD_SEVERITY_BADGE_CLASS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const localizeObdAlertTitle = (title: string): string => {
  const normalized = title.toLowerCase();

  if (normalized.includes('idle-load anomaly')) {
    return 'OBD: Bất thường không tải';
  }
  if (normalized.includes('coolant risk pattern')) {
    return 'OBD: Rủi ro nhiệt độ nước làm mát';
  }
  if (normalized.includes('channel unstable')) {
    return 'OBD: Kênh kết nối không ổn định';
  }
  if (normalized.includes('voltage risk under load')) {
    return 'OBD: Rủi ro điện áp khi tải cao';
  }

  return title;
};

const localizeObdAlertMessage = (message: string): string => {
  const idleLoadMatch = message.match(
    /^RPM\s+([\d.]+)\s+while speed\s+([\d.]+)\s+km\/h\s+for\s+([\d.]+)\s+minutes\.?$/i,
  );
  if (idleLoadMatch) {
    return `Vòng tua ${idleLoadMatch[1]} khi tốc độ ${idleLoadMatch[2]} km/h trong ${idleLoadMatch[3]} phút.`;
  }

  const coolantMatch = message.match(
    /^Coolant\s+([\d.]+)C\s+with engine load\s+([\d.]+)%\s+sustained at runtime\.?$/i,
  );
  if (coolantMatch) {
    return `Nhiệt độ nước làm mát ${coolantMatch[1]}°C với tải động cơ ${coolantMatch[2]}% trong lúc vận hành.`;
  }

  const channelMatch = message.match(
    /^OBD connect\/init failed\s+([\d.]+)\s+times in the last 5 minutes\.?$/i,
  );
  if (channelMatch) {
    return `Kết nối/khởi tạo OBD thất bại ${channelMatch[1]} lần trong 5 phút gần nhất.`;
  }

  const voltageMatch = message.match(
    /^Battery top\s+([\d.]+)V\s+while engine load\s+([\d.]+)%\.?$/i,
  );
  if (voltageMatch) {
    return `Điện áp ắc quy chính ${voltageMatch[1]}V khi tải động cơ ${voltageMatch[2]}%.`;
  }

  return message;
};

const MaintenancePage = () => {
  const router = useRouter();
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

  const obdAlertQuery = useQuery({
    queryKey: ['alerts', 'obd-maintenance-recommendations'],
    queryFn: () =>
      alertServices.getList({
        page: 1,
        limit: 30,
        status: 'active',
        alertType: 'maintenance_due',
      }),
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

  const obdRecommendations = useMemo(() => {
    const items = obdAlertQuery.data?.items ?? obdAlertQuery.data?.data?.items ?? [];
    return items.filter(isObdMaintenanceAlert).slice(0, 3).map((item: any) => ({
      ...item,
      title: localizeObdAlertTitle(String(item.title ?? 'Cảnh báo bảo trì OBD')),
      message: item.message == null ? null : localizeObdAlertMessage(String(item.message)),
    }));
  }, [obdAlertQuery.data]);

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
    <PageContainer
      pageTitle="Bảo trì"
      pageDescription="Lập lịch, theo dõi và đẩy trạng thái bảo trì phương tiện"
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dueSoon.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ưu tiên gần nhất
                </p>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.vehicleId} ·{' '}
                    {MAINTENANCE_TYPE_LABELS[item.maintenanceType] ?? item.maintenanceType}
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

      {obdRecommendations.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Khuyến nghị từ OBD</p>
                <p className="text-xs text-muted-foreground">
                  Các cảnh báo bảo trì đang hoạt động được sinh tự động từ chẩn đoán OBD.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push('/dashboard/alerts')}
              >
                Mở danh sách cảnh báo
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {obdRecommendations.map((item: any) => (
                <div key={item.id} className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Bảo trì OBD
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        OBD_SEVERITY_BADGE_CLASS[String(item.severity ?? 'medium')] ??
                        'bg-muted text-muted-foreground'
                      }`}
                    >
                      {OBD_SEVERITY_LABELS[String(item.severity ?? 'medium')] ?? 'Trung bình'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                    {item.message ?? 'Không có mô tả chi tiết từ nguồn cảnh báo.'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Phát sinh: {formatDateTime(item.createdAt, 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="list" className="text-xs sm:text-sm">Danh sách</TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs sm:text-sm">Lịch</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs sm:text-sm">Dự báo km</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <div className="space-y-3 sm:hidden">
            {maint.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border px-4 py-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="h-14 animate-pulse rounded-lg bg-muted/80" />
                    <div className="h-14 animate-pulse rounded-lg bg-muted/80" />
                  </div>
                </div>
              ))
            ) : rows.length > 0 ? (
              rows.map((row: any) => {
                const action = getActionConfig(row);
                const typeLabel =
                  MAINTENANCE_TYPE_LABELS[row.maintenanceType] ?? row.maintenanceType ?? 'Khác';
                const statusLabel = STATUS_LABELS[row.status] ?? row.status ?? 'Chưa xác định';

                return (
                  <Card
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/maintenance/${row.id}`)}
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{row.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.vehicleId ?? 'Chưa có phương tiện'} · {typeLabel}
                          </p>
                        </div>
                        <Badge variant={STATUS_BADGE_VARIANTS[row.status] ?? 'outline'}>
                          {statusLabel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg border bg-muted/20 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Ngày hẹn
                          </p>
                          <p className="mt-1 font-medium">
                            {formatDateTime(row.scheduledDate, 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Mốc km
                          </p>
                          <p className="mt-1 font-medium">
                            {row.nextServiceMileage
                              ? `${formatNumber(row.nextServiceMileage)} km`
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">Chạm để xem chi tiết</p>
                        {action ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateMutation.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              updateMutation.mutate({ id: row.id, ...action.payload });
                            }}
                          >
                            {action.label}
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">Đã xong</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Không có lịch bảo trì phù hợp với bộ lọc hiện tại.
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={rows}
              searchKey="vehicleId"
              searchPlaceholder="Tìm phương tiện..."
              isLoading={maint.isLoading}
              onRowClick={(row) => router.push(`/dashboard/maintenance/${row.id}`)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Trang {pagination.page} / {pagination.totalPages || 1} · {pagination.total} lịch bảo trì
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1 || maint.isFetching}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= (pagination.totalPages || 1) || maint.isFetching}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          {tab === 'calendar' ? (
            <MaintenanceCalendar day={day} onDayChange={setDay} rows={rows} />
          ) : null}
        </TabsContent>

        <TabsContent value="forecast">
          {tab === 'forecast' ? <MileageForecaster rows={rows} /> : null}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default MaintenancePage;

