'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { CircleOff, MapPinned, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
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
import {
  describeBoundarySelections,
  formatAllowedZoneRadius,
  getZoneTypeLabel,
} from '@/features/geofences/lib/allowed-zone-form';
import { useRoleAccess } from '@/hooks/use-role-access';
import { zoneServices, type VehicleZoneVehicleSummary } from '@/lib/api/zones';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const membershipMeta: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  inside: { label: 'Đang trong vùng', variant: 'default' },
  outside: { label: 'Đang ngoài vùng', variant: 'destructive' },
  suspect: { label: 'Sát mép vùng', variant: 'secondary' },
  unknown: { label: 'Chưa đánh giá', variant: 'outline' },
};

const renderZoneSummary = (row: VehicleZoneVehicleSummary) => {
  const zone = row.zone;
  if (!zone) {
    return 'Chưa cấu hình';
  }

  if (zone.zoneType === 'administrative_boundary') {
    return describeBoundarySelections(zone.boundarySelections);
  }

  return formatAllowedZoneRadius(zone.radiusMeters);
};

const columns: ColumnDef<VehicleZoneVehicleSummary>[] = [
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
    id: 'membership',
    header: 'Trạng thái vùng',
    meta: { label: 'Trạng thái vùng' },
    cell: ({ row }) => {
      const zone = row.original.zone;
      if (!zone) {
        return <Badge variant="outline">Chưa thiết lập</Badge>;
      }

      const membership = membershipMeta[zone.membershipState] ?? membershipMeta.unknown;
      return <Badge variant={membership.variant}>{membership.label}</Badge>;
    },
  },
  {
    id: 'zoneType',
    header: 'Loại vùng',
    meta: { label: 'Loại vùng' },
    cell: ({ row }) => {
      const zone = row.original.zone;
      return zone ? getZoneTypeLabel(zone.zoneType) : '—';
    },
  },
  {
    id: 'summary',
    header: 'Cấu hình',
    meta: { label: 'Cấu hình' },
    cell: ({ row }) => renderZoneSummary(row.original),
  },
  {
    id: 'updatedAt',
    header: 'Cập nhật gần nhất',
    meta: { label: 'Cập nhật gần nhất' },
    cell: ({ row }) => {
      const zone = row.original.zone;
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
    cell: ({ row }) => row.original.zone?.warning?.message ?? 'Ổn định',
  },
];

const ZonesPage = () => {
  const access = useRoleAccess();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'configured' | 'missing' | 'outside'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleZoneVehicleSummary | null>(null);
  const deferredSearch = useDeferredValue(search);

  const zonesQuery = useQuery({
    queryKey: ['vehicles-for-zones-page'],
    queryFn: () => zoneServices.listVehicleZones(),
  });

  const rows = zonesQuery.data?.items ?? [];

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
        return Boolean(row.zone);
      }
      if (filter === 'missing') {
        return !row.zone;
      }
      if (filter === 'outside') {
        return row.zone?.membershipState === 'outside';
      }
      return true;
    });
  }, [deferredSearch, filter, rows]);

  const stats = useMemo(() => {
    const configured = rows.filter((row) => Boolean(row.zone)).length;
    const missing = rows.length - configured;
    const outside = rows.filter((row) => row.zone?.membershipState === 'outside').length;
    return { total: rows.length, configured, missing, outside };
  }, [rows]);

  return (
    <PageContainer
      pageTitle="Vùng"
      pageDescription="Quản lý vùng active theo từng xe, hỗ trợ cả bán kính và địa lý hành chính từ một luồng duy nhất."
      pageHeaderAction={
        <Button
          variant="outline"
          onClick={() => setSelectedVehicle(filteredRows[0] ?? null)}
          disabled={filteredRows.length === 0 || !access.canEditDevice}
        >
          <MapPinned className="mr-2 h-4 w-4" />
          Thiết lập nhanh
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng phương tiện"
          value={stats.total}
          icon={<MapPinned className="h-4 w-4" />}
          isLoading={zonesQuery.isLoading}
        />
        <StatCard
          title="Đã có vùng"
          value={stats.configured}
          icon={<ShieldCheck className="h-4 w-4" />}
          isLoading={zonesQuery.isLoading}
        />
        <StatCard
          title="Chưa thiết lập"
          value={stats.missing}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={zonesQuery.isLoading}
        />
        <StatCard
          title="Đang ngoài vùng"
          value={stats.outside}
          icon={<ShieldAlert className="h-4 w-4" />}
          isLoading={zonesQuery.isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        pagination={false}
        isLoading={zonesQuery.isLoading}
        onRowClick={access.canEditDevice ? setSelectedVehicle : undefined}
        emptyTitle="Chưa có phương tiện phù hợp"
        emptyDescription="Điều chỉnh bộ lọc hoặc chọn một phương tiện khác để thiết lập vùng."
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
            <Select
              value={filter}
              onValueChange={(value: 'all' | 'configured' | 'missing' | 'outside') => setFilter(value)}
            >
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

export default ZonesPage;
