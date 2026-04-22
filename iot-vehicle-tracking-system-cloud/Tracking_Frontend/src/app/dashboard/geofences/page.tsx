'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { CircleOff, MapPinned, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AllowedZoneSetupSheet } from '@/features/geofences/components/allowed-zone-setup-sheet';
import { formatAllowedZoneRadius } from '@/features/geofences/lib/allowed-zone-form';
import { zoneQueryKey } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import { useRoleAccess } from '@/hooks/use-role-access';
import { geofenceServices } from '@/lib/api/geofences';
import { vehicleServices } from '@/lib/api/vehicles';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const VEHICLE_PAGE_LIMIT = 100;
const VEHICLE_MAX_PAGES = 20;

const membershipMeta: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  inside: { label: 'Đang trong vùng', variant: 'default' },
  outside: { label: 'Đang ngoài vùng', variant: 'destructive' },
  suspect: { label: 'Sát mép vùng', variant: 'secondary' },
  unknown: { label: 'Chưa đánh giá', variant: 'outline' },
};

type VehicleRow = {
  id: number;
  vehicleId: string;
  plateNumber: string | null;
  customerName: string | null;
  deviceId: string | null;
  status: string | null;
};

type AllowedZoneTableRow = VehicleRow & {
  allowedZone: Awaited<ReturnType<typeof geofenceServices.getVehicleAllowedZone>>;
};

const extractVehicleItems = (payload: any): VehicleRow[] =>
  (payload?.items ?? payload?.data?.items ?? []) as VehicleRow[];

const fetchVehiclesForAllowedZonePage = async (): Promise<VehicleRow[]> => {
  const firstPayload = await vehicleServices.getList({ page: 1, limit: VEHICLE_PAGE_LIMIT });
  const firstItems = extractVehicleItems(firstPayload);
  const firstPagination = firstPayload?.pagination ?? firstPayload?.data?.pagination;
  const totalPages = Math.max(
    Number(
      firstPagination?.totalPages ??
        Math.ceil(Number(firstPagination?.total ?? firstItems.length) / VEHICLE_PAGE_LIMIT),
    ) || 1,
    1,
  );

  if (totalPages <= 1) {
    return firstItems;
  }

  const pagePayloads = await Promise.all(
    Array.from({ length: Math.max(Math.min(totalPages, VEHICLE_MAX_PAGES) - 1, 0) }, (_, index) =>
      vehicleServices.getList({
        page: index + 2,
        limit: VEHICLE_PAGE_LIMIT,
      }),
    ),
  );

  return [
    ...firstItems,
    ...pagePayloads.flatMap((payload) => extractVehicleItems(payload)),
  ];
};

const columns: ColumnDef<AllowedZoneTableRow>[] = [
  {
    accessorKey: 'plateNumber',
    header: 'Phương tiện',
    meta: { label: 'Phương tiện' },
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium">{row.original.plateNumber ?? row.original.vehicleId}</p>
        <p className="text-xs text-muted-foreground">{row.original.vehicleId}</p>
      </div>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Khách hàng',
    meta: { label: 'Khách hàng' },
    cell: ({ row }) => row.original.customerName ?? 'Chưa gán',
  },
  {
    id: 'zoneStatus',
    header: 'Trạng thái vùng',
    meta: { label: 'Trạng thái vùng' },
    cell: ({ row }) => {
      const zone = row.original.allowedZone;
      if (!zone) {
        return <Badge variant="outline">Chưa thiết lập</Badge>;
      }
      const membership = membershipMeta[zone.membershipState] ?? membershipMeta.unknown;
      return <Badge variant={membership.variant}>{membership.label}</Badge>;
    },
  },
  {
    id: 'radius',
    header: 'Bán kính',
    meta: { label: 'Bán kính' },
    cell: ({ row }) => {
      const zone = row.original.allowedZone;
      return zone ? formatAllowedZoneRadius(zone.radiusMeters) : '—';
    },
  },
  {
    id: 'updatedAt',
    header: 'Cập nhật gần nhất',
    meta: { label: 'Cập nhật gần nhất' },
    cell: ({ row }) => {
      const zone = row.original.allowedZone;
      if (!zone) {
        return 'Chưa có vùng hoạt động';
      }
      return (
        <div className="space-y-1">
          <p>{formatDateTime(zone.updatedAt)}</p>
          <p className="text-xs text-muted-foreground">{formatRelative(zone.updatedAt)}</p>
        </div>
      );
    },
  },
  {
    id: 'warning',
    header: 'Cảnh báo',
    meta: { label: 'Cảnh báo' },
    cell: ({ row }) => row.original.allowedZone?.warning?.message ?? 'Ổn định',
  },
];

const GeofencesPage = () => {
  const access = useRoleAccess();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'configured' | 'missing' | 'outside'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<AllowedZoneTableRow | null>(null);
  const deferredSearch = useDeferredValue(search);

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles-for-allowed-zone-page'],
    queryFn: fetchVehiclesForAllowedZonePage,
  });

  const zoneQueries = useQueries({
    queries: (vehiclesQuery.data ?? []).map((vehicle) => ({
      queryKey: zoneQueryKey(vehicle.vehicleId),
      enabled: Boolean(vehicle.vehicleId),
      queryFn: () => geofenceServices.getVehicleAllowedZone(vehicle.vehicleId).catch(() => null),
    })),
  });

  const zonesLoading =
    vehiclesQuery.isLoading ||
    (vehiclesQuery.data?.length ?? 0) > 0 && zoneQueries.some((query) => query.isLoading);

  const rows = useMemo<AllowedZoneTableRow[]>(() => {
    const vehicles = vehiclesQuery.data ?? [];

    return vehicles.map((vehicle, index) => ({
      ...vehicle,
      allowedZone: zoneQueries[index]?.data ?? null,
    }));
  }, [vehiclesQuery.data, zoneQueries]);

  const filteredRows = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        keyword.length === 0 ||
        row.vehicleId.toLowerCase().includes(keyword) ||
        (row.plateNumber ?? '').toLowerCase().includes(keyword) ||
        (row.customerName ?? '').toLowerCase().includes(keyword) ||
        (row.deviceId ?? '').toLowerCase().includes(keyword);

      if (!matchesSearch) {
        return false;
      }

      if (filter === 'configured') {
        return Boolean(row.allowedZone);
      }
      if (filter === 'missing') {
        return !row.allowedZone;
      }
      if (filter === 'outside') {
        return row.allowedZone?.membershipState === 'outside';
      }
      return true;
    });
  }, [deferredSearch, filter, rows]);

  const stats = useMemo(() => {
    const configured = rows.filter((row) => Boolean(row.allowedZone)).length;
    const missing = rows.length - configured;
    const outside = rows.filter((row) => row.allowedZone?.membershipState === 'outside').length;
    return { total: rows.length, configured, missing, outside };
  }, [rows]);

  return (
    <PageContainer
      pageTitle="Vùng cho phép"
      pageDescription="Một phương tiện chỉ có một vùng hoạt động. Trang này ưu tiên thao tác thiết lập nhanh thay cho CRUD geofence tổng quát."
      pageHeaderAction={
        <Button variant="outline" onClick={() => setSelectedVehicle(filteredRows[0] ?? null)} disabled={filteredRows.length === 0 || !access.canEditDevice}>
          <MapPinned className="mr-2 h-4 w-4" />
          Thiết lập nhanh
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng phương tiện" value={stats.total} icon={<MapPinned className="h-4 w-4" />} isLoading={vehiclesQuery.isLoading} />
        <StatCard title="Đã có vùng" value={stats.configured} icon={<ShieldCheck className="h-4 w-4" />} isLoading={zonesLoading} />
        <StatCard title="Chưa thiết lập" value={stats.missing} icon={<CircleOff className="h-4 w-4" />} isLoading={zonesLoading} />
        <StatCard title="Đang ngoài vùng" value={stats.outside} icon={<ShieldAlert className="h-4 w-4" />} isLoading={zonesLoading} />
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        pagination={false}
        isLoading={zonesLoading}
        onRowClick={access.canEditDevice ? setSelectedVehicle : undefined}
        emptyTitle="Chưa có phương tiện phù hợp"
        emptyDescription="Điều chỉnh bộ lọc hoặc chọn một phương tiện khác để thiết lập vùng cho phép."
        emptyAction={
          rows.length > 0 && access.canEditDevice
            ? {
                label: 'Mở phương tiện đầu tiên',
                onClick: () => setSelectedVehicle(rows[0] ?? null),
              }
            : undefined
        }
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:flex-nowrap">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã xe, biển số, khách hàng hoặc thiết bị..."
              className="w-full sm:max-w-sm"
            />
            <Select value={filter} onValueChange={(value: 'all' | 'configured' | 'missing' | 'outside') => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Bộ lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phương tiện</SelectItem>
                <SelectItem value="configured">Đã có vùng</SelectItem>
                <SelectItem value="missing">Chưa thiết lập</SelectItem>
                <SelectItem value="outside">Đang ngoài vùng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <AllowedZoneSetupSheet
        open={Boolean(selectedVehicle)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVehicle(null);
          }
        }}
        vehicleId={selectedVehicle?.vehicleId ?? null}
        vehicleLabel={selectedVehicle?.plateNumber ?? selectedVehicle?.vehicleId ?? null}
        canEdit={access.canEditDevice && Boolean(selectedVehicle?.vehicleId)}
      />
    </PageContainer>
  );
};

export default GeofencesPage;
