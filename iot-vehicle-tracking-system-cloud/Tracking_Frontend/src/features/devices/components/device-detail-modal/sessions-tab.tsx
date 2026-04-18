'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatDuration, formatNumber } from '@/lib/utils/date/format';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { DeviceDetailEmptyState } from './empty-state';
import { useDeviceDetailModal } from './modal-context';

export const SessionsTab = ({
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const { sessions, sessionsHasMore, onSessionsLoadMore, sessionsLoading } = useDeviceDetailModal();

  if (sessions.length === 0 && !sessionsLoading) {
    return (
      <DeviceDetailEmptyState
        title="Chưa có phiên chạy"
        description="Danh sách phiên sẽ hiển thị sau khi thiết bị bắt đầu và kết thúc ít nhất một chu kỳ chạy."
      />
    );
  }

  const content = (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">Phiên #{session.id}</CardTitle>
              <Badge variant="outline">{DEVICE_STATUS_LABELS[session.status] ?? session.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Bắt đầu</p>
              <p className="font-medium">{formatDateTime(session.serverSessionStart)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kết thúc</p>
              <p className="font-medium">{formatDateTime(session.serverSessionEnd)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thời lượng</p>
              <p className="font-medium">{formatDuration(session.uptime ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số điểm dữ liệu</p>
              <p className="font-medium">{formatNumber(session.dataPointsCount)}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center">
        <Button variant="outline" onClick={onSessionsLoadMore} disabled={!sessionsHasMore || sessionsLoading}>
          {sessionsLoading ? 'Đang tải...' : sessionsHasMore ? 'Tải thêm phiên' : 'Đã tải hết'}
        </Button>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    content
  );
};
