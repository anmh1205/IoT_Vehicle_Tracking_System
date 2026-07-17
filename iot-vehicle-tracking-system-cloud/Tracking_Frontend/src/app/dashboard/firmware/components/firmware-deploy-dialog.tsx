'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CheckSquare2, Loader2, Search } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInfiniteDevices } from '@/features/devices/hooks/use-devices';
import type { Device } from '@/features/devices/types';
import { firmwareServices, type FirmwareRecord } from '@/lib/api/firmware';
import {
  DEVICE_STATUS_FILTER_OPTIONS,
  DEVICE_STATUS_LABELS,
  DEPLOYMENT_STRATEGY_LABELS,
  formatBytes,
  formatDateTime,
  getFirmwareDisplayVersion,
  type FirmwareDeviceStatusFilter,
} from './firmware-utils';

const PAGE_SIZE = 20;

const normalizeVersion = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .toLowerCase();

export const FirmwareDeployDialog = ({
  firmware,
  open,
  onOpenChange,
}: {
  firmware: FirmwareRecord | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FirmwareDeviceStatusFilter>('all');
  const [strategy, setStrategy] = useState<'rolling' | 'all_at_once'>('rolling');
  const [selectedDevicesById, setSelectedDevicesById] = useState<Record<string, Device>>({});
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    if (!open) {
      setSearch('');
      setStatusFilter('all');
      setStrategy('rolling');
      setSelectedDevicesById({});
    }
  }, [open]);

  const devicesQuery = useInfiniteDevices(
    {
      search: deferredSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    },
    PAGE_SIZE,
    open,
  );

  const devices = devicesQuery.items;

  useEffect(() => {
    if (devices.length === 0) {
      return;
    }

    setSelectedDevicesById((current) => {
      const next = { ...current };
      for (const device of devices) {
        if (next[device.deviceId]) {
          next[device.deviceId] = device;
        }
      }
      return next;
    });
  }, [devices]);

  const selectedDevices = useMemo(() => Object.values(selectedDevicesById), [selectedDevicesById]);
  const selectedIds = useMemo(() => Object.keys(selectedDevicesById), [selectedDevicesById]);
  const selectedCount = selectedIds.length;
  const targetVersion = normalizeVersion(firmware?.version);
  const connectivityCounts = useMemo(
    () =>
      devices.reduce(
        (counts, device) => {
          counts[device.currentStatus] += 1;
          return counts;
        },
        {
          running: 0,
          online: 0,
          stopped: 0,
          disconnected: 0,
        },
      ),
    [devices],
  );
  const alreadyOnTargetCount = selectedDevices.filter(
    (device) => normalizeVersion(device.firmwareVersion) === targetVersion,
  ).length;
  const versionDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const device of devices) {
      const key = device.firmwareVersion ?? 'Chưa ghi nhận';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [devices]);
  const selectedVehicleLabels = [...new Set(selectedDevices.map((device) => device.vehiclePlate).filter(Boolean))]
    .slice(0, 6)
    .join(', ');

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!firmware) {
        throw new Error('Chưa chọn firmware cần triển khai.');
      }
      if (selectedIds.length === 0) {
        throw new Error('Cần chọn ít nhất một thiết bị.');
      }

      return firmwareServices.deploy(firmware.id, { deviceIds: selectedIds, strategy });
    },
    onSuccess: () => {
      toast.success('Đã xếp lịch triển khai firmware');
      void queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể triển khai firmware.');
    },
  });

  const toggleDevice = (device: Device) => {
    setSelectedDevicesById((current) => {
      if (current[device.deviceId]) {
        const next = { ...current };
        delete next[device.deviceId];
        return next;
      }

      return {
        ...current,
        [device.deviceId]: device,
      };
    });
  };

  const selectVisibleDevices = () => {
    setSelectedDevicesById((current) => {
      const next = { ...current };
      for (const device of devices) {
        next[device.deviceId] = device;
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            Triển khai firmware {firmware?.version ? getFirmwareDisplayVersion(firmware.version) : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Thông tin bản phát hành</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Phiên bản đích</p>
                  <p className="mt-1 font-semibold">{getFirmwareDisplayVersion(firmware?.version)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Dung lượng</p>
                  <p className="mt-1 font-semibold">{formatBytes(firmware?.size ?? 0)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Tệp phát hành</p>
                  <p className="mt-1 truncate font-semibold">{firmware?.filename ?? '--'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tạo lúc {formatDateTime(firmware?.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <Label htmlFor="deploy-search">Tìm thiết bị</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deploy-search"
                    value={search}
                    placeholder="Tìm theo mã, tên, biển số hoặc firmware hiện tại..."
                    onChange={(event) => setSearch(event.target.value)}
                    type="search"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kết nối thiết bị</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as FirmwareDeviceStatusFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kết nối thiết bị" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectVisibleDevices}>
                <CheckSquare2 className="mr-2 h-4 w-4" />
                Chọn trang hiện tại
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDevicesById({})}>
                Bỏ chọn
              </Button>
            </div>

            <ScrollArea className="h-[30rem] rounded-lg border">
              <div className="space-y-2 p-3">
                {devicesQuery.isLoading ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Đang tải danh sách thiết bị...
                  </div>
                ) : devices.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Không tìm thấy thiết bị phù hợp.
                  </div>
                ) : (
                  devices.map((device) => {
                    const checked = Boolean(selectedDevicesById[device.deviceId]);
                    return (
                      <label
                        key={device.deviceId}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleDevice(device)} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{device.deviceName || device.deviceId}</p>
                            <Badge variant="outline">
                              {DEVICE_STATUS_LABELS[device.currentStatus] ?? device.currentStatus}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{device.deviceId}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {device.vehiclePlate ? <span>Biển số: {device.vehiclePlate}</span> : null}
                            {device.customerName ? <span>Khách hàng: {device.customerName}</span> : null}
                            <span>
                              Firmware hiện tại:{' '}
                              {device.firmwareVersion
                                ? getFirmwareDisplayVersion(device.firmwareVersion)
                                : 'Chưa ghi nhận'}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <InfiniteScrollTrigger
              hasMore={devicesQuery.hasMore}
              isLoadingMore={devicesQuery.isFetchingNextPage}
              onLoadMore={devicesQuery.loadMore}
              loadedCount={devicesQuery.loadedCount}
              totalCount={devicesQuery.total}
              itemLabel="thiết bị"
            />
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-2">
              <Label>Chiến lược triển khai</Label>
              <Select
                value={strategy}
                onValueChange={(value) => setStrategy(value as 'rolling' | 'all_at_once')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chiến lược" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rolling">{DEPLOYMENT_STRATEGY_LABELS.rolling}</SelectItem>
                  <SelectItem value="all_at_once">{DEPLOYMENT_STRATEGY_LABELS.all_at_once}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Thiết bị đã chọn</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{selectedCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Đã chọn qua nhiều trang; trang này đang hiển thị {devices.length} thiết bị
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Đã đúng firmware đích</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{alreadyOnTargetCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.max(selectedCount - alreadyOnTargetCount, 0)} thiết bị còn cần đổi firmware
                </p>
              </div>
            </div>

            <Card className="border-dashed bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Kết nối trên trang hiện tại</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Đang gửi dữ liệu</p>
                    <p className="mt-1 font-medium text-foreground">{connectivityCounts.running}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Còn heartbeat</p>
                    <p className="mt-1 font-medium text-foreground">{connectivityCounts.online}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Chậm nhịp</p>
                    <p className="mt-1 font-medium text-foreground">{connectivityCounts.stopped}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Mất kết nối</p>
                    <p className="mt-1 font-medium text-foreground">{connectivityCounts.disconnected}</p>
                  </div>
                </div>

                {versionDistribution.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Phân bố firmware trên trang hiện tại</p>
                    <div className="flex flex-wrap gap-2">
                      {versionDistribution.map(([version, count]) => (
                        <Badge key={version} variant="outline">
                          {getFirmwareDisplayVersion(version)} • {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="font-medium">Phạm vi triển khai</p>
              <p className="mt-1 text-muted-foreground">
                {selectedVehicleLabels
                  ? `Biển số: ${selectedVehicleLabels}`
                  : selectedCount > 0
                    ? 'Đã chọn thiết bị nhưng chưa có biển số gắn kèm.'
                    : 'Chưa chọn thiết bị nào.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={deployMutation.isPending} onClick={() => deployMutation.mutate()}>
            {deployMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xếp lịch...
              </>
            ) : (
              'Triển khai OTA'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
