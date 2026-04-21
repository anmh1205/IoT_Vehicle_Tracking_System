'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, MoreHorizontal, ShieldAlert, UploadCloud } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { PageContainer } from '@/components/layout/PageContainer';
import { useSocket } from '@/components/providers/socket-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { useRoleAccess } from '@/hooks/use-role-access';
import { toApiUrl } from '@/lib/api/base-url';
import { firmwareServices, type FirmwareRecord } from '@/lib/api/firmware';
import { FirmwareDeployDialog } from './components/firmware-deploy-dialog';
import { FirmwareDeploymentHistory } from './components/firmware-deployment-history';
import { FirmwareSummaryCards } from './components/firmware-summary-cards';
import { FirmwareUploadDialog } from './components/firmware-upload-dialog';
import {
  FIRMWARE_STATUS_LABELS,
  formatBytes,
  formatDateTime,
  getFirmwareDisplayVersion,
  getDeploymentStatusLabel,
  sortDeploymentsByRecentActivity,
} from './components/firmware-utils';

const normalizeVersion = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .toLowerCase();

const FirmwarePage = () => {
  const access = useRoleAccess();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState<FirmwareRecord | null>(null);

  const firmwareQuery = useQuery({
    queryKey: ['firmware'],
    queryFn: () => firmwareServices.getList({ limit: 100 }),
  });
  const devicesQuery = useDevices({ limit: 100 });

  const firmwareRows = useMemo(
    () =>
      [...(firmwareQuery.data?.firmwares ?? [])].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      ),
    [firmwareQuery.data?.firmwares],
  );
  const devices = devicesQuery.data?.items ?? [];
  const firmwareKey = useMemo(() => firmwareRows.map((item) => item.id).join('-'), [firmwareRows]);

  const deploymentsQuery = useQuery({
    queryKey: ['firmware-deployments-summary', firmwareKey],
    enabled: firmwareRows.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        firmwareRows.map((item) => firmwareServices.getDeployments(item.id)),
      );

      return results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
        .sort(sortDeploymentsByRecentActivity);
    },
  });

  const deployments = useMemo(() => deploymentsQuery.data ?? [], [deploymentsQuery.data]);
  const activeFirmware = firmwareRows.find((item) => item.isActive) ?? null;
  const latestFirmware = firmwareRows[0] ?? null;
  const latestDeployment = deployments[0] ?? null;
  const inProgressCount = deployments.filter((item) =>
    [
      'assigned',
      'pending',
      'processing',
      'downloading',
      'verifying',
      'installing',
      'rebooting',
      'confirming',
      'in_progress',
    ].includes(item.summaryStatus ?? item.status),
  ).length;
  const failedCount = deployments.filter((item) =>
    ['failed', 'stuck_timeout'].includes(item.summaryStatus ?? item.status),
  ).length;
  const successfulCount = deployments.filter((item) =>
    ['completed', 'success'].includes(item.summaryStatus ?? item.status),
  ).length;
  const activeVersionToken = normalizeVersion(activeFirmware?.version);
  const devicesOnActiveFirmware = activeVersionToken
    ? devices.filter((device) => normalizeVersion(device.firmwareVersion) === activeVersionToken).length
    : 0;
  const driftCount = Math.max(devices.length - devicesOnActiveFirmware, 0);
  const onlineCount = devices.filter((device) =>
    ['running', 'online'].includes(device.currentStatus),
  ).length;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => firmwareServices.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa firmware');
      void queryClient.invalidateQueries({ queryKey: ['firmware'] });
      void queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa firmware.');
    },
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      isActive ? firmwareServices.deactivate(id) : firmwareServices.activate(id),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.isActive ? 'Đã ngưng kích hoạt firmware' : 'Đã kích hoạt firmware',
      );
      void queryClient.invalidateQueries({ queryKey: ['firmware'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái firmware.');
    },
  });

  useEffect(() => {
    if (!socket) return;

    const onProgress = (payload: { deviceId?: string; progress?: number }) => {
      toast.info(`Thiết bị ${payload.deviceId ?? '--'}: ${payload.progress ?? 0}%`);
    };

    const onComplete = (payload: { deviceId?: string }) => {
      toast.success(`Hoàn tất cập nhật firmware cho ${payload.deviceId ?? 'thiết bị'}`);
      void queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
    };

    socket.on('firmware:progress', onProgress);
    socket.on('firmware:complete', onComplete);

    return () => {
      socket.off('firmware:progress', onProgress);
      socket.off('firmware:complete', onComplete);
    };
  }, [socket, queryClient]);

  const columns = useMemo<ColumnDef<FirmwareRecord>[]>(
    () => [
      {
        accessorKey: 'version',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phiên bản" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{getFirmwareDisplayVersion(row.original.version)}</p>
              <Badge variant={row.original.isActive ? 'default' : 'outline'}>
                {row.original.isActive ? FIRMWARE_STATUS_LABELS.active : FIRMWARE_STATUS_LABELS.inactive}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {row.original.filename} • {formatBytes(row.original.size)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Ghi chú phát hành',
        cell: ({ row }) =>
          row.original.description || <span className="text-muted-foreground">Chưa có ghi chú</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Thời điểm tải lên',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setDeployTarget(row.original)}>
              Triển khai
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Mở thêm thao tác firmware">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() =>
                    activeMutation.mutate({ id: row.original.id, isActive: row.original.isActive })
                  }
                >
                  {row.original.isActive ? 'Ngưng kích hoạt' : 'Kích hoạt'}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={toApiUrl(`/firmware/${row.original.id}/download`)}>
                    <Download className="mr-2 h-4 w-4" />
                    Tải về
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => deleteMutation.mutate(row.original.id)}
                >
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [activeMutation, deleteMutation],
  );

  if (!access.canManageFirmware) {
    return (
      <PageContainer pageTitle="Firmware" pageDescription="Khu vực hạn chế">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Bạn không có quyền truy cập phân hệ này.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      pageTitle="Firmware"
      pageDescription="Quản lý bản phát hành, trạng thái kích hoạt và lịch sử triển khai OTA cho thiết bị."
      pageHeaderAction={
        <Button onClick={() => setUploadOpen(true)}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Tải lên firmware
        </Button>
      }
    >
      <FirmwareSummaryCards
        firmwares={firmwareRows}
        deployments={deployments}
        isLoading={firmwareQuery.isLoading || deploymentsQuery.isLoading}
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin bản phát hành</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Bản active trong kho</p>
              <p className="mt-1 font-semibold">
                {activeFirmware ? getFirmwareDisplayVersion(activeFirmware.version) : '--'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeFirmware ? `Tạo lúc ${formatDateTime(activeFirmware.createdAt)}` : 'Chưa có bản active'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Bản tải lên mới nhất</p>
              <p className="mt-1 font-semibold">
                {latestFirmware ? getFirmwareDisplayVersion(latestFirmware.version) : '--'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {latestFirmware ? latestFirmware.filename : 'Chưa có file firmware'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Thiết bị đang đúng bản active</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{devicesOnActiveFirmware}</p>
              <p className="mt-1 text-xs text-muted-foreground">Trong {devices.length} thiết bị OTA</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Thiết bị lệch active</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{driftCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cần đối chiếu giữa firmware kho và firmware thực tế trên thiết bị
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin đợt OTA gần nhất</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Job OTA</p>
              <p className="mt-1 font-semibold">{latestDeployment?.jobId ?? 'Chưa có job'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Device {latestDeployment?.deviceId ?? '--'}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Version đích</p>
              <p className="mt-1 font-semibold">
                {getFirmwareDisplayVersion(latestDeployment?.targetVersion)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cập nhật {formatDateTime(latestDeployment?.lastSeenAt ?? latestDeployment?.updatedAt)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Kết quả đợt OTA</p>
              <p className="mt-1 font-semibold">
                {successfulCount} thành công • {failedCount} lỗi • {inProgressCount} đang chạy
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Thiết bị online/trực tuyến: {onlineCount}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Trạng thái gần nhất</p>
              <p className="mt-1 font-semibold">
                {latestDeployment
                  ? getDeploymentStatusLabel(latestDeployment.summaryStatus ?? latestDeployment.status)
                  : '--'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {latestDeployment?.stuckReason ?? latestDeployment?.errorMessage ?? 'Không ghi nhận cảnh báo mới'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={firmwareRows}
            searchKey="version"
            searchLabel="Tìm firmware"
            searchPlaceholder="Tìm theo phiên bản, ghi chú hoặc tên file..."
            isLoading={firmwareQuery.isLoading}
            emptyTitle="Chưa có firmware phù hợp"
            emptyDescription="Tải lên bản phát hành đầu tiên hoặc thay đổi từ khóa tìm kiếm."
            emptyAction={{ label: 'Tải lên firmware', onClick: () => setUploadOpen(true) }}
          />
        </CardContent>
      </Card>

      <FirmwareDeploymentHistory
        deployments={deployments}
        devices={devices}
        isLoading={deploymentsQuery.isLoading}
      />

      <FirmwareUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <FirmwareDeployDialog
        firmware={deployTarget}
        devices={devices}
        open={!!deployTarget}
        onOpenChange={(next) => {
          if (!next) {
            setDeployTarget(null);
          }
        }}
      />
    </PageContainer>
  );
};

export default FirmwarePage;
