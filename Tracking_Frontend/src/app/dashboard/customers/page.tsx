'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { customerServices } from '@/lib/api/customers';
import type { ColumnDef } from '@tanstack/react-table';
const CustomerForm = ({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: any;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });
  const createMutation = useMutation({
    mutationFn: () => customerServices.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => customerServices.update(defaultValues.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Tên khách hàng"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <Input
            placeholder="Người liên hệ"
            value={form.contactPerson}
            onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))}
          />
          <Input
            placeholder="Số điện thoại"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <Input
            placeholder="Địa chỉ"
            value={form.address}
            onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={() => (defaultValues?.id ? updateMutation.mutate() : createMutation.mutate())}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const CustomersPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const customers = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerServices.getList({ limit: 200 }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => customerServices.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteItem(null);
    },
  });
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên khách hàng" />,
    },
    { accessorKey: 'contactPerson', header: 'Người liên hệ' },
    { accessorKey: 'phone', header: 'SDT' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'isActive',
      header: 'Hoat dong',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={!!row.original.isActive}
          onChange={() =>
            updateMutation.mutate({ id: row.original.id, isActive: !row.original.isActive })
          }
        />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditItem(row.original);
              setOpen(true);
            }}
          >
            Sửa
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteItem(row.original)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ];
  const rows = customers.data?.items ?? customers.data?.data?.items ?? [];
  return (
    <PageContainer
      pageTitle="Khách hàng"
      pageDescription="Quản lý thông tin khách hàng"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm khách hàng
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        searchKey="name"
        searchPlaceholder="Tìm khách hàng..."
        isLoading={customers.isLoading}
      />
      <CustomerForm open={open} onOpenChange={setOpen} defaultValues={editItem ?? undefined} />
      <ConfirmDialog
        open={!!deleteItem}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Xóa khách hàng"
        description={`Bạn có chắc muốn xóa ${deleteItem?.name ?? ''}? Việc này có thể ảnh hưởng các phương tiện liên kết.`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};
export default CustomersPage;
