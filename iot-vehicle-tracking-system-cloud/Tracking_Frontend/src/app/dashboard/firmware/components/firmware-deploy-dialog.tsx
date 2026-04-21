'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckSquare2, Loader2, Search } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import type { Device } from '@/features/devices/types';
import { firmwareServices, type FirmwareRecord } from '@/lib/api/firmware';
import {
  DEVICE_STATUS_LABELS,
  DEPLOYMENT_STRATEGY_LABELS,
  formatBytes,
  formatDateTime,
  getFirmwareDisplayVersion,
} from './firmware-utils';

type FirmwareDeployDialogProps = {
  firmware: FirmwareRecord | null;
  devices: Device[];
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

const normalizeVersion = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .toLowerCase();

export const FirmwareDeployDialog = ({
  firmware,
  devices,
  open,
  onOpenChange,
}: FirmwareDeployDialogProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [strategy, setStrategy] = useState<'rolling' | 'all_at_once'>('rolling');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setStrategy('rolling');
      setSelectedIds([]);
    }
  }, [open]);

  const filteredDevices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return devices;
    }

    return devices.filter((device) =>
      [device.deviceId, device.deviceName, device.vehiclePlate, device.firmwareVersion]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [devices, search]);

  const visibleIds = useMemo(() => filteredDevices.map((device) => device.deviceId), [filteredDevices]);
  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedIds.includes(device.deviceId)),
    [devices, selectedIds],
  );
  const selectedCount = selectedIds.length;
  const onlineCount = filteredDevices.filter((device) =>
    ['running', 'online'].includes(device.currentStatus),
  ).length;
  const disconnectedCount = filteredDevices.filter((device) => device.currentStatus === 'disconnected').length;
  const targetVersion = normalizeVersion(firmware?.version);
  const alreadyOnTargetCount = selectedDevices.filter(
    (device) => normalizeVersion(device.firmwareVersion) === targetVersion,
  ).length;
  const versionDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    filteredDevices.forEach((device) => {
      const key = device.firmwareVersion ?? 'Chưa ghi nhận';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [filteredDevices]);
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

  const toggleDevice = (deviceId: string) => {
    setSelectedIds((current) =>
      current.includes(deviceId)
        ? current.filter((item) => item !== deviceId)
        : [...current, deviceId],
    );
  };

  const selectVisibleDevices = () => {
    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
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

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectVisibleDevices}>
                <CheckSquare2 className="mr-2 h-4 w-4" />
                Chọn tất cả đang lọc
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                Bỏ chọn
              </Button>
            </div>

            <ScrollArea className="h-[30rem] rounded-lg border">
              <div className="space-y-2 p-3">
                {filteredDevices.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Không tìm thấy thiết bị phù hợp.
                  </div>
                ) : (
                  filteredDevices.map((device) => {
                    const checked = selectedIds.includes(device.deviceId);
                    return (
                      <label
                        key={device.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleDevice(device.deviceId)} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{device.deviceName}</p>
                            <Badge variant="outline">
                              {DEVICE_STATUS_LABELS[device.currentStatus] ?? device.currentStatus}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{device.deviceId}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {device.vehiclePlate ? <span>Biển số: {device.vehiclePlate}</span> : null}
                            <span>Firmware hiện tại: {device.firmwareVersion ?? 'Chưa ghi nhận'}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
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
                <p className="mt-1 text-xs text-muted-foreground">Trong {filteredDevices.length} thiết bị đang lọc</p>
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
                <CardTitle className="text-sm">Thông tin đợt triển khai</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Firmware đích: {getFirmwareDisplayVersion(firmware?.version)}</p>
                <p>Tệp: {firmware?.filename ?? '--'}</p>
                <p>Dung lượng: {formatBytes(firmware?.size ?? 0)}</p>
                <p>Chiến lược: {DEPLOYMENT_STRATEGY_LABELS[strategy]}</p>
                <p>Thiết bị online/trực tuyến: {onlineCount}</p>
                <p>Thiết bị mất kết nối: {disconnectedCount}</p>
              </CardContent>
            </Card>

            <Card className="border-dashed bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Phân bố firmware hiện tại</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {versionDistribution.length > 0 ? (
                  versionDistribution.map(([version, count]) => (
                    <div key={version} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="truncate text-muted-foreground">
                        {getFirmwareDisplayVersion(version === 'Chưa ghi nhận' ? null : version)}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Chưa có dữ liệu firmware hiện tại.</p>
                )}
              </CardContent>
            </Card>

            <div className="rounded-lg border bg-background p-3 text-sm">
              <p className="font-medium">Phạm vi phương tiện đã chọn</p>
              <p className="mt-1 text-muted-foreground">
                {selectedVehicleLabels || 'Chưa có phương tiện gắn với các thiết bị đang chọn.'}
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
                Đang triển khai...
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
