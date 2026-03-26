'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { firmwareServices, type FirmwareDeployment, type FirmwareRecord } from '@/lib/api/firmware';

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Đã xếp hàng',
  pending: 'Đang chờ',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const UploadDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setVersion('');
      setDescription('');
      setFile(null);
    }
  }, [open]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!version.trim() || !file) {
        throw new Error('Cần chọn file firmware và nhập phiên bản.');
      }

      const formData = new FormData();
      formData.append('version', version.trim());
      formData.append('description', description.trim());
      formData.append('file', file);

      return firmwareServices.upload(formData);
    },
    onSuccess: () => {
      toast.success('Tải firmware thành công');
      void queryClient.invalidateQueries({ queryKey: ['firmware'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể tải firmware.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tải lên firmware</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmware-version">Phiên bản</Label>
            <Input
              id="firmware-version"
              value={version}
              placeholder="Ví dụ: 1.4.2"
              onChange={(event) => setVersion(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware-file">Tệp nhị phân</Label>
            <Input
              id="firmware-file"
              type="file"
              accept=".bin,.fw,.img,.hex,application/octet-stream"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {file.name} • {formatBytes(file.size)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Hỗ trợ file firmware dạng `.bin`, `.fw`, `.img`, `.hex`.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware-description">Ghi chú phát hành</Label>
            <Textarea
              id="firmware-description"
              value={description}
              placeholder="Mô tả thay đổi chính hoặc lưu ý khi triển khai OTA."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Tải lên
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeployDialog = ({
  firmware,
  devices,
  open,
  onOpenChange,
}: {
  firmware: FirmwareRecord | null;
  devices: ReturnType<typeof useDevices>['data'] extends infer T
    ? T extends { items: infer U }
      ? U
      : never
    : never;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
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

  const visibleIds = filteredDevices.map((device) => device.deviceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Triển khai firmware {firmware?.version ? `v${firmware.version}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="deploy-search">Tìm thiết bị</Label>
              <Input
                id="deploy-search"
                value={search}
                placeholder="Tìm theo mã, tên hoặc firmware hiện tại..."
                onChange={(event) => setSearch(event.target.value)}
                type="search"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])))}
              >
                Chọn tất cả đang lọc
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                Bỏ chọn
              </Button>
            </div>

            <ScrollArea className="h-72 rounded-lg border">
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
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleDevice(device.deviceId)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{device.deviceName}</p>
                            <Badge variant="outline">{device.currentStatus}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{device.deviceId}</p>
                          <p className="text-xs text-muted-foreground">
                            Firmware hiện tại: {device.firmwareVersion ?? 'Chưa ghi nhận'}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
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
                  <SelectItem value="rolling">Rolling</SelectItem>
                  <SelectItem value="all_at_once">Đồng loạt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Firmware: {firmware?.version ?? '--'}</p>
              <p>Đã chọn: {selectedIds.length} thiết bị</p>
              <p>Dung lượng: {formatBytes(firmware?.size ?? 0)}</p>
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
  const firmwareRows = firmwareQuery.data?.firmwares ?? [];
  const firmwareKey = firmwareRows.map((item) => item.id).join('-');

  const deploymentsQuery = useQuery({
    queryKey: ['firmware-deployments-summary', firmwareKey],
    enabled: firmwareRows.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        firmwareRows.map((item) => firmwareServices.getDeployments(item.id)),
      );

      return results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
        .sort((left, right) => {
          const rightTime = Date.parse(right.completedAt ?? right.startedAt ?? '') || 0;
          const leftTime = Date.parse(left.completedAt ?? left.startedAt ?? '') || 0;
          return rightTime - leftTime;
        });
    },
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
      toast.success(variables.isActive ? 'Đã ngưng kích hoạt firmware' : 'Đã kích hoạt firmware');
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

  const columns: ColumnDef<FirmwareRecord>[] = [
    {
      accessorKey: 'version',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phiên bản" />,
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{row.original.version}</p>
          {row.original.isActive ? <Badge>Đang hoạt động</Badge> : <Badge variant="outline">Lưu trữ</Badge>}
        </div>
      ),
    },
    {
      accessorKey: 'filename',
      header: 'Tệp',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.filename}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(row.original.size)}</p>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Ghi chú',
      cell: ({ row }) => row.original.description || <span className="text-muted-foreground">--</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Tạo lúc',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDeployTarget(row.original)}>
            Triển khai
          </Button>
          <Button
            size="sm"
            variant={row.original.isActive ? 'secondary' : 'outline'}
            disabled={activeMutation.isPending}
            onClick={() =>
              activeMutation.mutate({ id: row.original.id, isActive: row.original.isActive })
            }
          >
            {row.original.isActive ? 'Ngưng active' : 'Kích hoạt'}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`/api/v1/firmware/${row.original.id}/download`}>
              <Download className="mr-2 h-4 w-4" />
              Tải về
            </a>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      pageTitle="Firmware"
      pageDescription="Quản lý binary firmware, trạng thái active và các đợt triển khai OTA."
      pageHeaderAction={<Button onClick={() => setUploadOpen(true)}>Tải lên firmware</Button>}
    >
      <DataTable
        columns={columns}
        data={firmwareRows}
        searchKey="version"
        searchLabel="Tìm firmware"
        searchPlaceholder="Tìm theo phiên bản..."
        isLoading={firmwareQuery.isLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle>Bảng theo dõi triển khai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deploymentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải trạng thái triển khai...</p>
          ) : (deploymentsQuery.data ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Chưa có đợt triển khai firmware nào.
            </div>
          ) : (
            (deploymentsQuery.data ?? []).slice(0, 20).map((item: FirmwareDeployment) => (
              <div
                key={`${item.id}-${item.jobId ?? item.deviceId}`}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.deviceId}</p>
                    <p className="text-xs text-muted-foreground">
                      Target {item.targetVersion ?? '--'} • Hiện tại {item.currentVersion ?? '--'}
                    </p>
                  </div>
                  <Badge variant={item.status === 'failed' ? 'destructive' : 'outline'}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Tiến độ: {item.progress ?? 0}%</span>
                  <span>Bắt đầu: {formatDateTime(item.startedAt)}</span>
                  <span>Hoàn tất: {formatDateTime(item.completedAt)}</span>
                </div>
                {item.errorMessage ? (
                  <p className="mt-2 text-xs text-rose-600">{item.errorMessage}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <DeployDialog
        firmware={deployTarget}
        devices={devicesQuery.data?.items ?? []}
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
