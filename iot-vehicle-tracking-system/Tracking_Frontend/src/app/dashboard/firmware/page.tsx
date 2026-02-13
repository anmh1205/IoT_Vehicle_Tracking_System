'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { firmwareServices } from '@/lib/api/firmware';
import { useSocket } from '@/components/providers/socket-provider';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
const STATUS_LABELS: Record<string, string> = {
  pending: 'Đang chờ',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
};
const UploadDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    version: '',
    filename: '',
    size: '0',
    sha256: '',
    description: '',
  });
  const createMutation = useMutation({
    mutationFn: () => firmwareServices.upload({ ...form, size: Number(form.size) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware'] });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tải lên phần mềm nhúng</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Phiên bản"
            value={form.version}
            onChange={(e) => setForm((s) => ({ ...s, version: e.target.value }))}
          />
          <Input
            placeholder="Tên tệp (.bin)"
            value={form.filename}
            onChange={(e) => setForm((s) => ({ ...s, filename: e.target.value }))}
          />
          <Input
            placeholder="Dung lượng"
            value={form.size}
            onChange={(e) => setForm((s) => ({ ...s, size: e.target.value }))}
          />
          <Input
            placeholder="SHA256"
            value={form.sha256}
            onChange={(e) => setForm((s) => ({ ...s, sha256: e.target.value }))}
          />
          <Textarea
            placeholder="Ghi chú phát hành"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => createMutation.mutate()}>Tải lên</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const FirmwarePage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const firmware = useQuery({
    queryKey: ['firmware'],
    queryFn: () => firmwareServices.getList({ limit: 200 }),
  });
  const deployments = useQuery({
    queryKey: ['firmware-deployments-summary'],
    queryFn: async () => {
      const list = firmware.data?.firmwares ?? firmware.data?.items ?? [];
      const results = await Promise.all(
        list
          .slice(0, 5)
          .map((item: any) => firmwareServices.getDeployments(item.id).catch(() => [])),
      );
      return results.flat();
    },
    enabled: !!firmware.data,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => firmwareServices.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['firmware'] }),
  });
  const deployMutation = useMutation({
    mutationFn: (id: number) => firmwareServices.deploy(id, { deviceIds: [], strategy: 'rolling' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] }),
  });
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onProgress = (payload: any) =>
      toast.info(`Phần mềm nhúng ${payload.deviceId}: ${payload.progress}%`);
    const onComplete = (payload: any) => {
      toast.success(`Hoàn tất cập nhật phần mềm nhúng: ${payload.deviceId}`);
      queryClient.invalidateQueries({ queryKey: ['firmware-deployments-summary'] });
    };
    socket.on('firmware:progress', onProgress);
    socket.on('firmware:complete', onComplete);
    return () => {
      socket.off('firmware:progress', onProgress);
      socket.off('firmware:complete', onComplete);
    };
  }, [socket, queryClient]);
  const rows = firmware.data?.firmwares ?? firmware.data?.items ?? [];
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'version',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phiên bản" />,
    },
    { accessorKey: 'filename', header: 'Tệp' },
    { accessorKey: 'size', header: 'Dung lượng' },
    { accessorKey: 'description', header: 'Ghi chú' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => deployMutation.mutate(row.original.id)}
          >
            Triển khai
          </Button>
          <Button
            size="sm"
            variant="destructive"
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
      pageTitle="Phần mềm nhúng"
      pageDescription="Quản lý tệp phần mềm nhúng"
      pageHeaderAction={<Button onClick={() => setOpen(true)}>Tải lên phần mềm nhúng</Button>}
    >
      <DataTable
        columns={columns}
        data={rows}
        searchKey="version"
        searchPlaceholder="Tìm phần mềm nhúng..."
        isLoading={firmware.isLoading}
      />

      <div className="rounded border p-4">
        <h3 className="mb-3 text-sm font-semibold">Bảng theo dõi triển khai</h3>
        <div className="space-y-2 text-sm">
          {(deployments.data ?? []).map((item: any) => (
            <div key={item.id} className="rounded border p-2">
              {item.deviceId} - {STATUS_LABELS[item.status] ?? item.status}
            </div>
          ))}
        </div>
      </div>

      <UploadDialog open={open} onOpenChange={setOpen} />
    </PageContainer>
  );
};
export default FirmwarePage;
