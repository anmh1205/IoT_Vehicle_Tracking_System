'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { customerServices } from '@/lib/api/customers';
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
  const query = useQuery({
    queryKey: ['customer-detail', id],
    queryFn: () => customerServices.getById(Number(id)),
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
  const typeLabel = CUSTOMER_TYPE_LABELS[detail.customerType] ?? detail.customerType ?? 'Chưa phân loại';
  const missingSignals = [
    !detail.contactPerson ? 'Thiếu đầu mối liên hệ' : null,
    !detail.phone && !detail.email ? 'Thiếu kênh liên lạc trực tiếp' : null,
    !detail.taxCode && detail.customerType === 'company' ? 'Thiếu mã số thuế doanh nghiệp' : null,
  ].filter(Boolean);

  return (
    <PageContainer
      pageTitle={pageTitle}
      pageDescription="Hồ sơ khách hàng, liên hệ vận hành và dấu mốc thay đổi"
    >
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANTS[detail.status] ?? 'secondary'}>{statusLabel}</Badge>
                <Badge variant="outline">{typeLabel}</Badge>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {detail.name ?? 'Khách hàng chưa có tên hiển thị'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.customerCode ? `Mã khách hàng: ${detail.customerCode}` : 'Chưa cấu hình mã khách hàng'}
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
              {missingSignals.join(' • ')}. Hồ sơ khách hàng chưa đủ để điều phối liên lạc và chứng từ ổn định.
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
          <CardHeader>
            <CardTitle className="text-base">Ghi chú nghiệp vụ</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.notes ? (
              <p className="text-sm leading-6 text-foreground">{detail.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có ghi chú. Nên bổ sung phạm vi vận hành, đầu mối ưu tiên và cam kết SLA để đội điều phối tra cứu nhanh.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default CustomerDetailPage;
