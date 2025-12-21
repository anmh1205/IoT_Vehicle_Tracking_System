import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageContainer from '@/components/layout/page-container';

export default function StatisticsPage() {
  return (
    <PageContainer
      pageTitle='Thống kê'
      pageDescription='Biểu đồ và báo cáo thống kê (đang port UI)'
    >
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Sẽ thêm biểu đồ runtime, so sánh, export dữ liệu bằng Recharts/echarts.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Báo cáo</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Port bảng thống kê, bộ lọc thời gian và hành động xuất file.
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

