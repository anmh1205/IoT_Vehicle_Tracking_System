'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CircleCheckBig, CircleOff, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Button } from '@/components/ui/button';
import { maintenanceServices } from '@/lib/api/maintenance';
import type { ColumnDef } from '@tanstack/react-table';
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
const MaintenancePage = () => {
  const queryClient = useQueryClient();
  const [day, setDay] = useState<Date | undefined>(new Date());
  const maint = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceServices.getList({ limit: 300 }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => maintenanceServices.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
  });
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'vehicleId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phương tiện" />,
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
    { accessorKey: 'scheduledDate', header: 'Ngày hẹn' },
    { accessorKey: 'completedDate', header: 'Ngày xong' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            updateMutation.mutate({
              id: row.original.id,
              status: 'completed',
              completedDate: new Date().toISOString(),
            })
          }
        >
          Đánh dấu xong
        </Button>
      ),
    },
  ];
  const rows = maint.data?.items ?? maint.data?.data?.items ?? [];
  const stats = {
    total: rows.length,
    scheduled: rows.filter((row: any) => row.status === 'scheduled').length,
    inProgress: rows.filter((row: any) => row.status === 'in_progress').length,
    completed: rows.filter((row: any) => row.status === 'completed').length,
  };

  return (
    <PageContainer pageTitle="Bảo trì" pageDescription="Quản lý lịch bảo trì phương tiện">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng lịch bảo trì"
          value={stats.total}
          icon={<Wrench className="h-4 w-4" />}
          isLoading={maint.isLoading}
        />
        <StatCard
          title="Đã lên lịch"
          value={stats.scheduled}
          icon={<CalendarClock className="h-4 w-4" />}
          isLoading={maint.isLoading}
        />
        <StatCard
          title="Đang xử lý"
          value={stats.inProgress}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={maint.isLoading}
        />
        <StatCard
          title="Hoàn tất"
          value={stats.completed}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={maint.isLoading}
        />
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="calendar">Lịch</TabsTrigger>
          <TabsTrigger value="forecast">Dự báo km</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <DataTable
            columns={columns}
            data={rows}
            searchKey="vehicleId"
            searchPlaceholder="Tìm phương tiện..."
            isLoading={maint.isLoading}
          />
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
