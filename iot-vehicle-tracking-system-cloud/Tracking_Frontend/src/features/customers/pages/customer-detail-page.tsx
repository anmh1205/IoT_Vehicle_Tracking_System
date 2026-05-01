'use client';

import { use, useDeferredValue, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Loader2, Link2, Unlink2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/stat-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { customerServices } from '@/lib/api/customers';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  suspended: 'Tạm khóa',
};

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  company: 'Doanh nghiệp',
  individual: 'Cá nhân',
};

const DetailCell = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const VehicleItem = ({
  vehicle,
  onAction,
  pending,
  actionLabel,
  actionIcon,
}: {
  vehicle: any;
  onAction: () => void;
  pending: boolean;
  actionLabel: string;
  actionIcon: ReactNode;
}) => (
  <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
    <div className="space-y-1">
      <p className="font-medium">
        {vehicle.plateNumber ?? vehicle.vehicleId ?? `Phương tiện #${vehicle.id}`}
      </p>
      <p className="text-sm text-muted-foreground">
        {[vehicle.vehicleId, vehicle.brand, vehicle.model].filter(Boolean).join(' • ') ||
          'Chưa đủ dữ liệu nhận diện'}
      </p>
      <p className="text-xs text-muted-foreground">
        {vehicle.deviceId ? `Thiết bị ${vehicle.deviceId}` : 'Chưa gắn thiết bị đo từ xa'}
      </p>
    </div>

    <Button variant="outline" disabled={pending} onClick={onAction}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : actionIcon}
      {actionLabel}
    </Button>
  </div>
);

const CustomerDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const customerId = Number(id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const deferredVehicleSearch = useDeferredValue(vehicleSearch);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => customerServices.getById(customerId),
    enabled: Number.isFinite(customerId),
  });

  const relatedVehicles = useQuery({
    queryKey: ['customer-detail-vehicles', customerId],
    queryFn: () =>
      vehicleServices.getList({
        page: 1,
        limit: 100,
        customerId,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: Number.isFinite(customerId),
  });

  const availableVehicles = useQuery({
    queryKey: ['customer-assignable-vehicles', deferredVehicleSearch],
    queryFn: () =>
      vehicleServices.getList({
        page: 1,
        limit: 50,
        customerState: 'unassigned',
        search: deferredVehicleSearch || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    enabled: assignOpen,
  });

  const updateVehicleCustomer = useMutation({
    mutationFn: ({ vehicleId, nextCustomerId }: { vehicleId: number; nextCustomerId: number | null }) =>
      vehicleServices.update(vehicleId, { customerId: nextCustomerId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer-detail-vehicles', customerId] }),
        queryClient.invalidateQueries({ queryKey: ['customer-assignable-vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
      ]);
      setAssignOpen(false);
      setVehicleSearch('');
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật gán phương tiện thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật khách hàng sở hữu cho phương tiện.'),
      );
    },
  });

  if (query.isError) {
    return (
      <PageContainer pageTitle={`Khách hàng #${id}`} pageDescription="Chi tiết khách hàng">
        <EmptyState
          title="Không thể tải dữ liệu"
          description="Không thể lấy thông tin khách hàng. Vui lòng thử lại."
          action={{ label: 'Thử lại', onClick: () => void query.refetch() }}
        />
      </PageContainer>
    );
  }

  const detail = query.data ?? {};
  const pageTitle = detail.name ?? detail.customerCode ?? `Khách hàng #${id}`;
  const statusLabel = STATUS_LABELS[detail.status] ?? detail.status ?? 'Chưa xác định';
  const typeLabel =
    CUSTOMER_TYPE_LABELS[detail.customerType] ?? detail.customerType ?? 'Chưa phân loại';
  const assignedVehicles = relatedVehicles.data?.items ?? relatedVehicles.data?.data?.items ?? [];
  const assignableVehicles =
    availableVehicles.data?.items ?? availableVehicles.data?.data?.items ?? [];
  const missingSignals = [
    !detail.contactPerson ? 'Thiếu đầu mối liên hệ' : null,
    !detail.phone && !detail.email ? 'Thiếu kênh liên lạc trực tiếp' : null,
    !detail.taxCode && detail.customerType === 'company' ? 'Thiếu mã số thuế doanh nghiệp' : null,
  ].filter(Boolean);

  return (
    <PageContainer pageTitle={pageTitle} pageDescription="Chi tiết khách hàng">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={STATUS_VARIANTS[detail.status] ?? 'secondary'}>{statusLabel}</Badge>
              <Badge variant="outline">{typeLabel}</Badge>
              <Badge variant={assignedVehicles.length > 0 ? 'secondary' : 'outline'}>
                {assignedVehicles.length} phương tiện liên quan
              </Badge>
              {missingSignals.length > 0 ? (
                <TooltipProvider delayDuration={120}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Thông tin hồ sơ khách hàng"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="max-w-[280px] text-xs leading-relaxed">
                      {missingSignals.join(' • ')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {detail.name ?? 'Khách hàng chưa có tên hiển thị'}
              </p>
              {detail.customerCode ? (
                <p className="mt-1 text-sm text-muted-foreground">Mã khách hàng: {detail.customerCode}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Người liên hệ"
              value={detail.contactPerson ?? 'Chưa có'}
              valueClassName="text-xl leading-7 font-semibold"
            />
            <StatCard
              title="Điện thoại"
              value={detail.phone ?? 'Chưa có'}
              valueClassName="text-xl leading-7 font-semibold"
            />
            <StatCard
              title="Email"
              value={detail.email ?? 'Chưa có'}
              valueClassName="text-lg leading-6 font-semibold break-all"
            />
            <StatCard
              title="Mã số thuế"
              value={detail.taxCode ?? 'Chưa có'}
              valueClassName="text-xl leading-7 font-semibold"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-4 pt-3 pb-2">
            <CardTitle className="text-base">Thông tin liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <DetailCell label="Tên khách hàng" value={detail.name ?? 'Chưa có'} />
            <DetailCell label="Loại khách hàng" value={typeLabel} />
            <DetailCell label="Địa chỉ" value={detail.address ?? 'Chưa cập nhật'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-3 pb-2">
            <CardTitle className="text-base">Thông tin quản trị</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <DetailCell label="Mã khách hàng" value={detail.customerCode ?? 'Chưa có'} />
            <DetailCell label="Trạng thái" value={statusLabel} />
            <DetailCell label="ID nội bộ" value={detail.id ? String(detail.id) : 'Chưa có'} />
            <DetailCell label="Tạo lúc" value={formatDateTime(detail.createdAt)} />
            <DetailCell
              label="Cập nhật gần nhất"
              value={formatDateTime(detail.updatedAt)}
              hint={detail.updatedAt ? formatRelative(detail.updatedAt) : undefined}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 px-4 pt-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Phương tiện liên quan</CardTitle>
            <Button onClick={() => setAssignOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Gán phương tiện
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {relatedVehicles.isLoading ? (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Đang tải danh sách phương tiện liên quan...
              </div>
            ) : assignedVehicles.length > 0 ? (
              assignedVehicles.map((vehicle: any) => (
                <VehicleItem
                  key={vehicle.id}
                  vehicle={vehicle}
                  pending={updateVehicleCustomer.isPending}
                  actionLabel="Bỏ gán"
                  actionIcon={<Unlink2 className="mr-2 h-4 w-4" />}
                  onAction={() =>
                    updateVehicleCustomer.mutate({ vehicleId: vehicle.id, nextCustomerId: null })
                  }
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có phương tiện nào gán cho khách hàng này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="px-4 pt-3 pb-2">
            <CardTitle className="text-base">Ghi chú nghiệp vụ</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {detail.notes ? (
              <p className="text-sm leading-6 text-foreground">{detail.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có ghi chú.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gán phương tiện cho khách hàng</DialogTitle>
            <DialogDescription>
              Chọn phương tiện chưa gán để liên kết với hồ sơ khách hàng.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={vehicleSearch}
            onChange={(event) => setVehicleSearch(event.target.value)}
            placeholder="Tìm theo mã xe, biển số hoặc hãng xe..."
          />

          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {availableVehicles.isLoading ? (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Đang tải danh sách phương tiện chưa gán...
              </div>
            ) : assignableVehicles.length > 0 ? (
              assignableVehicles.map((vehicle: any) => (
                <VehicleItem
                  key={vehicle.id}
                  vehicle={vehicle}
                  pending={updateVehicleCustomer.isPending}
                  actionLabel="Gán xe"
                  actionIcon={<Link2 className="mr-2 h-4 w-4" />}
                  onAction={() =>
                    updateVehicleCustomer.mutate({ vehicleId: vehicle.id, nextCustomerId: customerId })
                  }
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Không tìm thấy phương tiện chưa gán phù hợp.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default CustomerDetailPage;
