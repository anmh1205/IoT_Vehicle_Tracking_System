'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, MoreHorizontal, ShieldAlert, UploadCloud } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { useSocket } from '@/components/providers/socket-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInfiniteDevices } from '@/features/devices/hooks/use-devices';
import type { Device } from '@/features/devices/types';
import { useProgressiveList } from '@/hooks/use-progressive-list';
import { useRoleAccess } from '@/hooks/use-role-access';
import { deviceServices } from '@/lib/api/devices';
import { toApiUrl } from '@/lib/api/base-url';
import { firmwareServices, type FirmwareRecord } from '@/lib/api/firmware';
import { FirmwareDeployDialog } from './components/firmware-deploy-dialog';
import { FirmwareDeploymentHistory } from './components/firmware-deployment-history';
import { FirmwareDeviceAssignment, type FirmwareAssignmentAction } from './components/firmware-device-assignment';
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

const DEVICE_LOOKUP_BATCH_SIZE = 200;

const normalizeVersion = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .toLowerCase();

const terminalFirmwareStatuses = new Set(['completed', 'success', 'failed', 'rolled_back', 'stuck_timeout']);
const FIRMWARE_PROGRESS_REFRESH_MS = 2000;

const fetchAllDevicesForFirmware = async (): Promise<Device[]> => {
  const firstPage = await deviceServices.getList({
    page: 1,
    limit: DEVICE_LOOKUP_BATCH_SIZE,
    sortBy: 'deviceId',
    sortOrder: 'asc',
  });

  const totalPages = Math.max(firstPage.pagination.totalPages ?? 1, 1);
  if (totalPages === 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      deviceServices.getList({
        page: index + 2,
        limit: DEVICE_LOOKUP_BATCH_SIZE,
        sortBy: 'deviceId',
        sortOrder: 'asc',
      }),
    ),
  );

  return Array.from(
    new Map(
      [firstPage, ...remainingPages]
        .flatMap((page) => page.items)
        .map((device) => [device.deviceId, device]),
    ).values(),
  );
};

const FirmwarePage = () => {
  const access = useRoleAccess();
  const queryClient = useQueryClient();
  const socket = useSocket('firmware');
  const [activeTab, setActiveTab] = useState('library');
  const [firmwareSearch, setFirmwareSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState<FirmwareRecord | null>(null);
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(null);
  const [policySearch, setPolicySearch] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [policyStatus, setPolicyStatus] = useState<
    'all' | 'running' | 'online' | 'disconnected' | 'stopped'
  >('all');

  const firmwareQuery = useQuery({
    queryKey: ['firmware'],
    queryFn: () => firmwareServices.getList({ limit: 100 }),
    enabled: access.canManageFirmware,
  });

  const deviceInventoryQuery = useQuery({
    queryKey: ['firmware-device-inventory'],
    queryFn: fetchAllDevicesForFirmware,
    enabled: access.canManageFirmware,
  });

  const policyDevicesQuery = useInfiniteDevices(
    {
      search: policySearch || undefined,
      status: policyStatus === 'all' ? undefined : policyStatus,
    },
    12,
    access.canManageFirmware,
  );

  const firmwareRows = useMemo(
    () =>
      [...(firmwareQuery.data?.firmwares ?? [])].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      ),
    [firmwareQuery.data?.firmwares],
  );
  const allDevices = useMemo(() => deviceInventoryQuery.data ?? [], [deviceInventoryQuery.data]);
  const policyDevices = policyDevicesQuery.items;
  const firmwareKey = useMemo(() => firmwareRows.map((item) => item.id).join('-'), [firmwareRows]);

  const deploymentsQuery = useQuery({
    queryKey: ['firmware-deployments-summary', firmwareKey],
    enabled: access.canManageFirmware && firmwareRows.length > 0,
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

  const filteredFirmwares = useMemo(() => {
    const keyword = firmwareSearch.trim().toLowerCase();
    if (!keyword) {
      return firmwareRows;
    }

    return firmwareRows.filter((item) =>
      [item.version, item.filename, item.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [firmwareRows, firmwareSearch]);
  const visibleFirmwares = useProgressiveList(filteredFirmwares, {
    pageSize: 20,
    resetKey: `${firmwareSearch.trim().toLowerCase()}|${filteredFirmwares.length}`,
  });

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
        variables.isActive ? 'Đã hạ bản stable' : 'Đã đặt firmware làm bản stable',
      );
      void queryClient.invalidateQueries({ queryKey: ['firmware'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Không thể cập nhật trạng thái firmware.',
      );
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: async ({ device, mode, firmware }: FirmwareAssignmentAction) => {
      const fallbackStableFirmware = activeFirmware;
      const targetFirmware = mode === 'stable' ? fallbackStableFirmware : firmware;

      if (mode === 'stable' && !fallbackStableFirmware) {
        throw new Error('Chưa có firmware stable. Hãy chọn một bản stable trước khi gán.');
      }

      if (mode === 'fixed' && !firmware) {
        throw new Error('Cần chọn một firmware cụ thể để gán cho thiết bị.');
      }

      const previousTarget = device.targetFirmwareVersion ?? null;
      const nextTarget = mode === 'stable' ? null : targetFirmware?.version ?? null;

      await deviceServices.update(device.id, {
        targetFirmwareVersion: nextTarget,
      });

      const desiredVersion = targetFirmware?.version ?? null;
      const alreadyOnTarget =
        desiredVersion !== null &&
        normalizeVersion(device.firmwareVersion) === normalizeVersion(desiredVersion);

      if (!targetFirmware || alreadyOnTarget) {
        return {
          skippedDeploy: true,
          device,
          targetFirmware,
          mode,
        };
      }

      try {
        await firmwareServices.deploy(targetFirmware.id, {
          deviceIds: [device.deviceId],
          strategy: 'rolling',
        });
      } catch (error) {
        await deviceServices.update(device.id, {
          targetFirmwareVersion: previousTarget,
        });
        throw error;
      }

      return {
        skippedDeploy: false,
        device,
        targetFirmware,
        mode,
      };
    },
    onSuccess: (result) => {
      if (result.skippedDeploy) {
        toast.success(`Đã lưu chính sách firmware cho ${result.device.deviceId}.`);
      } else {
        toast.success(`Đã lưu chính sách và gửi lệnh OTA cho ${result.device.deviceId}.`);
      }

      void queryClient.invalidateQueries({ queryKey: ['devices'] });
      void queryClient.invalidateQueries({ queryKey: ['firmware-device-inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['device-detail'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể lưu chính sách firmware cho thiết bị này.',
      );
    },
    onSettled: () => {
      setAssigningDeviceId(null);
    },
  });

  useEffect(() => {
    if (!socket) {
      return;
    }

    let lastProgressRefresh = 0;
    const refreshFirmwareViews = () => {
      void queryClient.invalidateQueries({ queryKey: ['firmware-device-inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
      void queryClient.invalidateQueries({ queryKey: ['device-detail'] });
    };
    const refreshProgressViews = () => {
      const now = Date.now();
      if (now - lastProgressRefresh < FIRMWARE_PROGRESS_REFRESH_MS) {
        return;
      }
      lastProgressRefresh = now;
      void queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
    };
    const onAssignment = (payload: { device_ids?: string[]; status?: string }) => {
      const count = Array.isArray(payload.device_ids) ? payload.device_ids.length : 0;
      toast.info(count > 0 ? `Đã giao firmware cho ${count} thiết bị` : 'Đã giao firmware');
      refreshFirmwareViews();
    };

    const onProgress = (payload: {
      deviceId?: string;
      progress?: number | null;
      status?: string;
      error?: string | null;
    }) => {
      const status = String(payload.status ?? '').toLowerCase();
      const label = payload.deviceId ?? 'thiết bị';

      if (status === 'completed' || status === 'success') {
        toast.success(`Hoàn tất cập nhật firmware cho ${label}`);
      } else if (status === 'rolled_back') {
        toast.warning(`Firmware đã rollback cho ${label}`);
      } else if (status === 'failed' || status === 'stuck_timeout') {
        toast.error(payload.error ?? `Cập nhật firmware thất bại cho ${label}`);
      } else {
        toast.info(`Thiết bị ${label}: ${payload.progress ?? 0}%`);
      }

      if (terminalFirmwareStatuses.has(status)) {
        refreshFirmwareViews();
      } else {
        refreshProgressViews();
      }
    };

    socket.on('firmware:assignment', onAssignment);
    socket.on('firmware:progress', onProgress);

    return () => {
      socket.off('firmware:assignment', onAssignment);
      socket.off('firmware:progress', onProgress);
    };
  }, [socket, queryClient]);

  const firmwareColumns = useMemo<ColumnDef<FirmwareRecord>[]>(
    () => [
      {
        accessorKey: 'version',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phiên bản" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{getFirmwareDisplayVersion(row.original.version)}</p>
              <Badge variant={row.original.isActive ? 'default' : 'outline'}>
                {row.original.isActive
                  ? FIRMWARE_STATUS_LABELS.active
                  : FIRMWARE_STATUS_LABELS.inactive}
              </Badge>
              {latestFirmware?.id === row.original.id ? <Badge variant="secondary">Mới nhất</Badge> : null}
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={row.original.isActive ? 'secondary' : 'outline'}
              disabled={activeMutation.isPending}
              onClick={() =>
                !row.original.isActive &&
                activeMutation.mutate({ id: row.original.id, isActive: row.original.isActive })
              }
            >
              {row.original.isActive ? 'Stable hiện tại' : 'Đặt stable'}
            </Button>
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
                {row.original.isActive ? (
                  <DropdownMenuItem
                    onSelect={() =>
                      activeMutation.mutate({ id: row.original.id, isActive: row.original.isActive })
                    }
                  >
                    Gỡ trạng thái stable
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <a href={toApiUrl(`/firmware/${row.original.id}/download`)}>
                    <Download className="mr-2 h-4 w-4" />
                    Tải về
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteTargetId(row.original.id)}
                >
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [activeMutation, deleteMutation, latestFirmware?.id],
  );

  const latestDeployment = deployments[0] ?? null;
  const devicesFollowingStable = allDevices.filter((device) => !device.targetFirmwareVersion).length;
  const fixedDevices = Math.max(allDevices.length - devicesFollowingStable, 0);
  const outOfPolicyDevices = allDevices.filter((device) => {
    const expectedVersion = device.targetFirmwareVersion ?? activeFirmware?.version ?? null;
    if (!expectedVersion) {
      return false;
    }

    return normalizeVersion(device.firmwareVersion) !== normalizeVersion(expectedVersion);
  }).length;
  const policySummaryLabel = deviceInventoryQuery.isLoading
    ? '--'
    : `${devicesFollowingStable} theo stable • ${fixedDevices} bản cố định`;
  const policySummaryDescription = deviceInventoryQuery.isLoading
    ? 'Đang tải đầy đủ danh sách thiết bị để đối chiếu chính sách firmware.'
    : outOfPolicyDevices > 0
      ? `${outOfPolicyDevices} thiết bị chưa chạy đúng bản mục tiêu.`
      : 'Tất cả thiết bị đã khớp với chính sách firmware hiện tại.';

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
      pageTitle="Firmware OTA"
      pageDescription="Quản lý kho firmware, chọn bản stable và gán chính sách OTA riêng cho từng thiết bị."
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
        isLoading={
          firmwareQuery.isLoading || deploymentsQuery.isLoading || deviceInventoryQuery.isLoading
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-dashed bg-gradient-to-r from-background via-muted/30 to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bản stable và kho phát hành</CardTitle>
            <CardDescription>
              Đặt một bản stable để thiết bị mới mặc định đi theo cùng chuẩn phát hành. Dùng bản cố
              định khi cần khóa riêng cho một thiết bị hoặc nhóm thử nghiệm.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Stable toàn hệ thống
              </p>
              <p className="mt-2 text-lg font-semibold">
                {activeFirmware ? getFirmwareDisplayVersion(activeFirmware.version) : 'Chưa chọn'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeFirmware
                  ? `File ${activeFirmware.filename} • tải lên ${formatDateTime(activeFirmware.createdAt)}`
                  : 'Kho firmware chưa có bản stable để thiết bị mặc định đi theo.'}
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Bản phát hành mới nhất
              </p>
              <p className="mt-2 text-lg font-semibold">
                {latestFirmware ? getFirmwareDisplayVersion(latestFirmware.version) : 'Chưa có'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {latestFirmware
                  ? `${latestFirmware.filename} • ${formatBytes(latestFirmware.size)}`
                  : 'Chưa có file firmware nào được tải lên.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tình hình rollout hiện tại</CardTitle>
            <CardDescription>
              Tách riêng ba lớp vận hành: kho phát hành, chính sách theo thiết bị và lịch sử OTA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Chính sách thiết bị
              </p>
              <p className="mt-2 text-lg font-semibold">{policySummaryLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">{policySummaryDescription}</p>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Đợt OTA gần nhất
              </p>
              <p className="mt-2 font-semibold">
                {latestDeployment
                  ? getDeploymentStatusLabel(latestDeployment.summaryStatus ?? latestDeployment.status)
                  : 'Chưa có đợt OTA'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {latestDeployment
                  ? `Thiết bị ${latestDeployment.deviceId} • ${getFirmwareDisplayVersion(latestDeployment.targetVersion)}`
                  : 'Khi có đợt triển khai mới, trạng thái gần nhất sẽ hiển thị ở đây.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="library">Thư viện firmware</TabsTrigger>
          <TabsTrigger value="devices">Gán theo thiết bị</TabsTrigger>
          <TabsTrigger value="history">Lịch sử triển khai</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-base">Kho firmware</CardTitle>
                  <CardDescription>
                    Quản lý release, tải file mới, chọn stable và mở nhanh luồng triển khai OTA.
                  </CardDescription>
                </div>
                <div className="rounded-full border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                  {filteredFirmwares.length}/{firmwareRows.length} bản phát hành đang hiển thị
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={firmwareSearch}
                  onChange={(event) => setFirmwareSearch(event.target.value)}
                  placeholder="Tìm theo phiên bản, tên file hoặc ghi chú phát hành..."
                  className="w-full md:max-w-[420px]"
                />
              </div>

              <DataTable
                columns={firmwareColumns}
                data={visibleFirmwares.items}
                pagination={false}
                isLoading={firmwareQuery.isLoading}
                emptyTitle="Chưa có firmware phù hợp"
                emptyDescription="Tải lên bản phát hành đầu tiên hoặc thay đổi từ khóa tìm kiếm."
                emptyAction={{ label: 'Tải lên firmware', onClick: () => setUploadOpen(true) }}
              />

              <InfiniteScrollTrigger
                hasMore={visibleFirmwares.hasMore}
                onLoadMore={visibleFirmwares.loadMore}
                loadedCount={visibleFirmwares.loadedCount}
                totalCount={visibleFirmwares.totalCount}
                itemLabel="bản firmware"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <FirmwareDeviceAssignment
            devices={policyDevices}
            firmwares={firmwareRows}
            activeFirmware={activeFirmware}
            isLoading={policyDevicesQuery.isLoading}
            isLoadingMore={policyDevicesQuery.isFetchingNextPage}
            assigningDeviceId={assigningDeviceId}
            totalDevices={policyDevicesQuery.total}
            loadedDevices={policyDevicesQuery.loadedCount}
            hasMore={policyDevicesQuery.hasMore}
            search={policySearch}
            statusFilter={policyStatus}
            onLoadMore={policyDevicesQuery.loadMore}
            onSearchChange={setPolicySearch}
            onStatusChange={setPolicyStatus}
            onAssign={(action) => {
              setAssigningDeviceId(action.device.deviceId);
              assignmentMutation.mutate(action);
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <FirmwareDeploymentHistory
            deployments={deployments}
            devices={allDevices}
            isLoading={deploymentsQuery.isLoading || deviceInventoryQuery.isLoading}
          />
        </TabsContent>
      </Tabs>

      <FirmwareUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <FirmwareDeployDialog
        firmware={deployTarget}
        open={!!deployTarget}
        onOpenChange={(next) => {
          if (!next) {
            setDeployTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Xóa firmware"
        description="Bạn có chắc muốn xóa firmware này? Thao tác không thể hoàn tác."
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId !== null) {
            deleteMutation.mutate(deleteTargetId, {
              onSettled: () => setDeleteTargetId(null),
            });
          }
        }}
      />
    </PageContainer>
  );
};

export default FirmwarePage;
