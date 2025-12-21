import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageContainer from '@/components/layout/page-container';

export default function SystemStatusPage() {
  return (
    <PageContainer
      pageTitle='Tình trạng hệ thống'
      pageDescription='Giám sát dịch vụ backend, database, stream (đang port UI)'
    >
      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Sẽ thêm cards trạng thái API/DB/Socket, badge màu và progress.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Realtime</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Kết nối socket, cập nhật realtime và fallback polling khi mất kết nối.
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

