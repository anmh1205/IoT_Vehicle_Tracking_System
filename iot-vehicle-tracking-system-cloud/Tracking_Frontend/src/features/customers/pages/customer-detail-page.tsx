'use client';

import { use, useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Link2, Unlink2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

const InfoRow = ({
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
      <PageContainer pageTitle={`Khách hàng #${id}`} pageDescription="Chi tiết">
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
    <PageContainer
      pageTitle={pageTitle}
      pageDescription="Hồ sơ khách hàng, phương tiện liên quan và ngữ cảnh điều phối đội xe"
    >
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANTS[detail.status] ?? 'secondary'}>{statusLabel}</Badge>
                <Badge variant="outline">{typeLabel}</Badge>
                <Badge variant={assignedVehicles.length > 0 ? 'secondary' : 'outline'}>
                  {assignedVehicles.length} phương tiện liên quan
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {detail.name ?? 'Khách hàng chưa có tên hiển thị'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.customerCode
                    ? `Mã khách hàng: ${detail.customerCode}`
                    : 'Chưa cấu hình mã khách hàng'}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
              <InfoRow label="Người liên hệ" value={detail.contactPerson ?? 'Chưa có'} />
              <InfoRow label="Điện thoại" value={detail.phone ?? 'Chưa có'} />
              <InfoRow label="Email" value={detail.email ?? 'Chưa có'} />
              <InfoRow label="Mã số thuế" value={detail.taxCode ?? 'Chưa có'} />
            </div>
          </div>

          {missingSignals.length > 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              {missingSignals.join(' • ')}. Hồ sơ khách hàng chưa đủ để điều phối liên lạc và chứng từ ổn
              định.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Tên khách hàng" value={detail.name ?? 'Chưa có'} />
            <InfoRow label="Loại khách hàng" value={typeLabel} />
            <InfoRow label="Người liên hệ chính" value={detail.contactPerson ?? 'Chưa có'} />
            <InfoRow label="Số điện thoại" value={detail.phone ?? 'Chưa có'} />
            <InfoRow label="Email" value={detail.email ?? 'Chưa có'} />
            <InfoRow label="Địa chỉ" value={detail.address ?? 'Chưa cập nhật'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin quản trị</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Mã khách hàng" value={detail.customerCode ?? 'Chưa có'} />
            <InfoRow label="Mã số thuế" value={detail.taxCode ?? 'Chưa cập nhật'} />
            <InfoRow label="Trạng thái" value={statusLabel} />
            <InfoRow label="ID nội bộ" value={detail.id ? String(detail.id) : 'Chưa có'} />
            <InfoRow label="Tạo lúc" value={formatDateTime(detail.createdAt)} />
            <InfoRow
              label="Cập nhật gần nhất"
              value={formatDateTime(detail.updatedAt)}
              hint={detail.updatedAt ? formatRelative(detail.updatedAt) : undefined}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Phương tiện liên quan</CardTitle>
            </div>
            <Button onClick={() => setAssignOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Gán phương tiện
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedVehicles.isLoading ? (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Đang tải danh sách phương tiện liên quan...
              </div>
            ) : assignedVehicles.length > 0 ? (
              assignedVehicles.map((vehicle: any) => (
                <div
                  key={vehicle.id}
                  className="flex flex-col gap-3 rounded-xl border bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {vehicle.plateNumber ?? vehicle.vehicleId ?? `Phương tiện #${vehicle.id}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[vehicle.vehicleId, vehicle.brand, vehicle.model].filter(Boolean).join(' • ') ||
                        'Chưa đủ dữ liệu nhận diện'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.deviceId ? `Thiết bị ${vehicle.deviceId}` : 'Chưa gắn thiết bị telemetry'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    disabled={updateVehicleCustomer.isPending}
                    onClick={() =>
                      updateVehicleCustomer.mutate({ vehicleId: vehicle.id, nextCustomerId: null })
                    }
                  >
                    {updateVehicleCustomer.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink2 className="mr-2 h-4 w-4" />
                    )}
                    Bỏ gán
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có phương tiện nào gán cho khách hàng này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ghi chú nghiệp vụ</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.notes ? (
              <p className="text-sm leading-6 text-foreground">{detail.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có ghi chú. Nên bổ sung phạm vi vận hành, đầu mối ưu tiên và cam kết SLA để đội
                điều phối tra cứu nhanh.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gán phương tiện cho khách hàng</DialogTitle>
            <DialogDescription>
              Chọn một phương tiện chưa gán để liên kết trực tiếp với hồ sơ khách hàng này.
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
                <div
                  key={vehicle.id}
                  className="flex flex-col gap-3 rounded-xl border bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {vehicle.plateNumber ?? vehicle.vehicleId ?? `Phương tiện #${vehicle.id}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[vehicle.vehicleId, vehicle.brand, vehicle.model].filter(Boolean).join(' • ') ||
                        'Chưa đủ dữ liệu nhận diện'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.deviceId ? `Thiết bị ${vehicle.deviceId}` : 'Chưa gắn thiết bị telemetry'}
                    </p>
                  </div>

                  <Button
                    disabled={updateVehicleCustomer.isPending}
                    onClick={() =>
                      updateVehicleCustomer.mutate({ vehicleId: vehicle.id, nextCustomerId: customerId })
                    }
                  >
                    {updateVehicleCustomer.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Gán xe
                  </Button>
                </div>
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
