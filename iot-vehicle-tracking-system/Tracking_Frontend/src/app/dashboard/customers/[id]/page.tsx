'use client';
import { use } from 'react';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customerServices } from '@/lib/api/customers';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  return (
    <PageContainer pageTitle={`Khách hàng #${id}`} pageDescription="Chi tiết khách hàng">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tên khách hàng"
          value={detail.name ?? '-'}
          icon={<Building2 className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Người liên hệ"
          value={detail.contactPerson ?? '-'}
          icon={<Phone className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Email"
          value={detail.email ?? '-'}
          icon={<Mail className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Trạng thái"
          value={detail.isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
          icon={<MapPin className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin liên hệ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Số điện thoại</p>
            <p className="font-medium">{detail.phone ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Địa chỉ</p>
            <p className="font-medium">{detail.address ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mã khách hàng</p>
            <p className="font-medium">{detail.customerCode ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ngày tạo</p>
            <p className="font-medium">{detail.createdAt ?? '-'}</p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default CustomerDetailPage;
