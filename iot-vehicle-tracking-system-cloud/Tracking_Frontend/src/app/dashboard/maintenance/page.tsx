'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, CircleCheckBig, CircleOff, Plus, Wrench } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
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
import { alertServices, isObdMaintenanceAlert, localizeAlertForDisplay } from '@/lib/api/alerts';
import { customerServices } from '@/lib/api/customers';
import { maintenanceServices } from '@/lib/api/maintenance';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';
import { MaintenanceCalendar } from '@/features/maintenance/components/maintenance-calendar';
import { MaintenanceForm } from '@/features/maintenance/components/maintenance-form';
import { MileageForecaster } from '@/features/maintenance/components/mileage-forecaster';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';
import {
  MAINTENANCE_STATUS_BADGE_VARIANTS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_OPTIONS,
  createMaintenancePrefillFromAlert,
  formatMaintenanceDescription,
  formatMaintenanceTitle,
  getMaintenanceTypeLabel,
} from '@/features/maintenance/maintenance-meta';

const PAGE_SIZE = 50;
const LOOKUP_LIMIT = 100;

type MaintenanceVehicleContext = {
  vehicleId?: string | null;
  customerId?: number | string | null;
  plateNumber?: string | null;
  deviceId?: string | null;
};

type MaintenanceCustomerContext = {
  id?: number | string | null;
  name?: string | null;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'scheduled', label: MAINTENANCE_STATUS_LABELS.scheduled },
  { value: 'in_progress', label: MAINTENANCE_STATUS_LABELS.in_progress },
  { value: 'completed', label: MAINTENANCE_STATUS_LABELS.completed },
  { value: 'cancelled', label: MAINTENANCE_STATUS_LABELS.cancelled },
] as const;

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại bảo trì' },
  ...MAINTENANCE_TYPE_OPTIONS,
] as const;

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

const toIsoDateTime = (value: string) => (value ? new Date(value).toISOString() : undefined);
const toIsoDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : undefined);

const MaintenancePage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [day, setDay] = useState<Date | undefined>(new Date());
  const [tab, setTab] = useState('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<Record<string, string> | undefined>(undefined);
  const [filters, setFilters] = useState({
    status: 'all',
    maintenanceType: 'all',
    vehicleId: '',
  });

  const maint = useInfiniteListQuery<any>({
    queryKey: ['maintenance', filters.status, filters.maintenanceType, filters.vehicleId.trim()],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) =>
      maintenanceServices.getList({
        page,
        limit,
        status: filters.status === 'all' ? undefined : filters.status,
        maintenanceType: filters.maintenanceType === 'all' ? undefined : filters.maintenanceType,
        vehicleId: filters.vehicleId.trim() || undefined,
      }),
  });

  const vehiclesQuery = useQuery({
    queryKey: ['maintenance-vehicles'],
    queryFn: () => vehicleServices.getList({ limit: LOOKUP_LIMIT }),
  });

  const customersQuery = useQuery({
    queryKey: ['maintenance-customers'],
    queryFn: () => customerServices.getList({ limit: LOOKUP_LIMIT }),
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
        source: 'obd',
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      maintenanceServices.create({
        vehicleId: payload.vehicleId,
        maintenanceType: payload.maintenanceType,
        title: payload.title.trim(),
        description: payload.description.trim() || undefined,
        scheduledDate: toIsoDateTime(payload.scheduledDate),
        mileageAtService: payload.mileageAtService ? Number(payload.mileageAtService) : undefined,
        nextServiceMileage: payload.nextServiceMileage ? Number(payload.nextServiceMileage) : undefined,
        nextServiceDate: toIsoDate(payload.nextServiceDate),
        cost: payload.cost ? Number(payload.cost) : undefined,
        serviceProvider: payload.serviceProvider.trim() || undefined,
        notes: payload.notes.trim() || undefined,
      }),
    onSuccess: async () => {
      setCreateOpen(false);
      setCreateDefaults(undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts', 'obd-maintenance-recommendations'] }),
      ]);
      notificationUtils.success('Đã tạo phiếu bảo trì', 'Phiếu mới đã được thêm vào lịch điều phối.');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Tạo lịch bảo trì thất bại',
        getApiErrorMessage(error, 'Không thể tạo phiếu bảo trì mới.'),
      );
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

  const rows = maint.items;
  const vehicles = useMemo<MaintenanceVehicleContext[]>(
    () => (vehiclesQuery.data?.items ?? vehiclesQuery.data?.data?.items ?? []) as MaintenanceVehicleContext[],
    [vehiclesQuery.data],
  );
  const customers = useMemo<MaintenanceCustomerContext[]>(
    () =>
      (customersQuery.data?.items ?? customersQuery.data?.data?.items ?? []) as MaintenanceCustomerContext[],
    [customersQuery.data],
  );
  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [String(vehicle.vehicleId), vehicle])),
    [vehicles],
  );
  const customerById = useMemo(
    () => new Map(customers.map((customer) => [Number(customer.id), customer])),
    [customers],
  );
  const vehicleByPlate = useMemo(
    () =>
      new Map(
        vehicles
          .filter((vehicle) => vehicle.plateNumber)
          .map((vehicle) => [String(vehicle.plateNumber).trim().toLowerCase(), vehicle]),
      ),
    [vehicles],
  );
  const vehicleByDeviceId = useMemo(
    () =>
      new Map(
        vehicles
          .filter((vehicle) => vehicle.deviceId)
          .map((vehicle) => [String(vehicle.deviceId).trim().toLowerCase(), vehicle]),
      ),
    [vehicles],
  );

  const resolveVehicleContext = useCallback(
    (item: any): MaintenanceVehicleContext | null => {
      const byId = item?.vehicleId ? (vehicleById.get(String(item.vehicleId)) ?? null) : null;
      if (byId) {
        return byId;
      }

      const plateKey = String(item?.vehiclePlate ?? '').trim().toLowerCase();
      if (plateKey) {
        const byPlate = vehicleByPlate.get(plateKey) ?? null;
        if (byPlate) {
          return byPlate;
        }
      }

      const deviceKey = String(item?.deviceId ?? '').trim().toLowerCase();
      if (deviceKey) {
        return vehicleByDeviceId.get(deviceKey) ?? null;
      }

      return null;
    },
    [vehicleByDeviceId, vehicleById, vehicleByPlate],
  );

  const tableRows = useMemo(
    () =>
      rows.map((row: any) => {
        const vehicle: MaintenanceVehicleContext | null = row.vehicleId
          ? (vehicleById.get(String(row.vehicleId)) ?? null)
          : null;
        const customer: MaintenanceCustomerContext | null = vehicle?.customerId
          ? (customerById.get(Number(vehicle.customerId)) ?? null)
          : null;
        const primary = row.vehicleId
          ? vehicle?.plateNumber
            ? `${vehicle.plateNumber} - ${row.vehicleId}`
            : row.vehicleId
          : 'Chưa có phương tiện';
        const secondary = [customer?.name, vehicle?.deviceId].filter(Boolean).join(' • ');
        const displayTitle = formatMaintenanceTitle(row);
        const displayDescription = formatMaintenanceDescription(row);

        return {
          ...row,
          displayTitle,
          displayDescription,
          vehiclePrimary: primary,
          vehicleSecondary: secondary,
          vehicleSearch: [
            row.vehicleId,
            vehicle?.plateNumber,
            vehicle?.deviceId,
            customer?.name,
            row.title,
          ]
            .filter(Boolean)
            .join(' '),
        };
      }),
    [customerById, rows, vehicleById],
  );

  const dueSoon = useMemo(
    () =>
      [...tableRows]
        .filter((row: any) => row.status === 'scheduled' || row.status === 'in_progress')
        .sort((a: any, b: any) => {
          const left = new Date(a.scheduledDate ?? a.nextServiceDate ?? a.createdAt).getTime();
          const right = new Date(b.scheduledDate ?? b.nextServiceDate ?? b.createdAt).getTime();
          return left - right;
        })
        .slice(0, 3),
    [tableRows],
  );

  const obdRecommendations = useMemo(() => {
    const items = obdAlertQuery.data?.items ?? obdAlertQuery.data?.data?.items ?? [];

    return items
      .filter(isObdMaintenanceAlert)
      .slice(0, 3)
      .map((item: any) => {
        const localized = localizeAlertForDisplay(item);
        const resolvedVehicle = resolveVehicleContext(localized);
        const resolvedVehicleId = String(
          localized.vehicleId ?? resolvedVehicle?.vehicleId ?? '',
        ).trim();
        const resolvedCustomer = resolvedVehicle?.customerId
          ? (customerById.get(Number(resolvedVehicle.customerId)) ?? null)
          : null;
        const vehiclePlate = resolvedVehicle?.plateNumber ?? localized.vehiclePlate ?? null;
        const vehiclePrimary = resolvedVehicleId
          ? vehiclePlate
            ? `${vehiclePlate} - ${resolvedVehicleId}`
            : resolvedVehicleId
          : vehiclePlate ?? 'Chưa có phương tiện';
        const vehicleSecondary = [
          localized.customerName ?? resolvedCustomer?.name,
          localized.deviceName ?? localized.deviceId ?? resolvedVehicle?.deviceId,
        ]
          .filter(Boolean)
          .join(' • ');

        return {
          ...localized,
          resolvedVehicleId: resolvedVehicleId || null,
          vehicleId: resolvedVehicleId || localized.vehicleId || null,
          displayTitle:
            localized.displayTitle ?? localized.title ?? 'Cảnh báo bảo trì OBD',
          displayMessage: localized.displayMessage ?? localized.message ?? null,
          vehiclePrimary,
          vehicleSecondary: vehicleSecondary || null,
        };
      });
  }, [customerById, obdAlertQuery.data, resolveVehicleContext]);

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
      accessorKey: 'vehicleSearch',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phương tiện" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.vehiclePrimary}</p>
          {row.original.vehicleSecondary ? (
            <p className="text-xs text-muted-foreground">{row.original.vehicleSecondary}</p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hạng mục" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.displayTitle}</p>
          {row.original.displayDescription ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {row.original.displayDescription}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'maintenanceType',
      header: 'Loại',
      cell: ({ row }) => getMaintenanceTypeLabel(row.original.maintenanceType),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => MAINTENANCE_STATUS_LABELS[row.original.status] ?? row.original.status,
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
      pageDescription="Lập lịch, theo dõi và điều phối bảo trì phương tiện theo đúng xe và cảnh báo"
      pageHeaderAction={
        <Button
          onClick={() => {
            setCreateDefaults(undefined);
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo lịch bảo trì
        </Button>
      }
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
                  setFilters((prev) => ({ ...prev, vehicleId: event.target.value }))
                }
                placeholder="Nhập mã xe"
              />
            </div>
            <div className="space-y-1">
              <Label>Trạng thái</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
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
                  setFilters((prev) => ({ ...prev, maintenanceType: value }))
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ưu tiên gần nhất</p>
                <div>
                  <p className="text-sm font-medium">{item.displayTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.vehiclePrimary} • {getMaintenanceTypeLabel(item.maintenanceType)}
                  </p>
                  {item.vehicleSecondary ? (
                    <p className="text-xs text-muted-foreground">{item.vehicleSecondary}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {item.displayDescription}
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
                  Tạo phiếu trực tiếp từ cảnh báo để giữ thông tin xe, km và lý do bảo trì.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push('/dashboard/attention/queue')}
              >
                Mở danh sách cảnh báo
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {obdRecommendations.map((item: any) => (
                <div key={item.id} className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Bảo trì OBD</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        OBD_SEVERITY_BADGE_CLASS[String(item.severity ?? 'medium')] ??
                        'bg-muted text-muted-foreground'
                      }`}
                    >
                      {OBD_SEVERITY_LABELS[String(item.severity ?? 'medium')] ?? 'Trung bình'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{item.displayTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                    {item.displayMessage ?? 'Không có mô tả chi tiết từ nguồn cảnh báo.'}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Xe: {item.vehiclePrimary}</p>
                    <p>Phát sinh: {formatDateTime(item.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                    {item.vehicleSecondary ? <p>{item.vehicleSecondary}</p> : null}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCreateDefaults(createMaintenancePrefillFromAlert(item));
                        setCreateOpen(true);
                      }}
                    >
                      Tạo phiếu
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="list" className="text-xs sm:text-sm">
            Danh sách
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs sm:text-sm">
            Lịch
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs sm:text-sm">
            Dự báo km
          </TabsTrigger>
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
            ) : tableRows.length > 0 ? (
              tableRows.map((row: any) => {
                const action = getActionConfig(row);
                const statusLabel =
                  MAINTENANCE_STATUS_LABELS[row.status] ?? row.status ?? 'Chưa xác định';

                return (
                  <Card
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/attention/maintenance/${row.id}`)}
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{row.displayTitle}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.vehiclePrimary} • {getMaintenanceTypeLabel(row.maintenanceType)}
                          </p>
                          {row.vehicleSecondary ? (
                            <p className="text-xs text-muted-foreground">{row.vehicleSecondary}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {row.displayDescription}
                          </p>
                        </div>
                        <Badge variant={MAINTENANCE_STATUS_BADGE_VARIANTS[row.status] ?? 'outline'}>
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
                            {row.nextServiceMileage ? `${formatNumber(row.nextServiceMileage)} km` : '-'}
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
              data={tableRows}
              pagination={false}
              searchKey="vehicleSearch"
              searchPlaceholder="Tìm xe, biển số, thiết bị hoặc khách hàng..."
              isLoading={maint.isLoading}
              onRowClick={(row) => router.push(`/dashboard/attention/maintenance/${row.id}`)}
            />
          </div>

          <InfiniteScrollTrigger
            hasMore={maint.hasMore}
            isLoadingMore={maint.isFetchingNextPage}
            onLoadMore={maint.loadMore}
            loadedCount={maint.loadedCount}
            totalCount={maint.total}
            itemLabel="lịch bảo trì"
          />
        </TabsContent>

        <TabsContent value="calendar">
          {tab === 'calendar' ? <MaintenanceCalendar day={day} onDayChange={setDay} rows={tableRows} /> : null}
        </TabsContent>

        <TabsContent value="forecast">
          {tab === 'forecast' ? <MileageForecaster rows={tableRows} /> : null}
        </TabsContent>
      </Tabs>

      <MaintenanceForm
        open={createOpen}
        defaultValues={createDefaults}
        vehicles={vehicles}
        customers={customers}
        isPending={createMutation.isPending}
        onOpenChange={(value) => {
          setCreateOpen(value);
          if (!value) {
            setCreateDefaults(undefined);
          }
        }}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />
    </PageContainer>
  );
};

export default MaintenancePage;
