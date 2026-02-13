'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatDuration } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';
import { DeviceDetailEmptyState } from './empty-state';
import { SessionVibrationChartDialog } from './session-vibration-chart-dialog';
export const SessionsTab = () => {
  const { sessions, sessionsHasMore, onSessionsLoadMore, sessionsLoading, vibrationChart } =
    useDeviceDetailModal();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );
  if (sessions.length === 0 && !sessionsLoading) {
    return (
      <DeviceDetailEmptyState
        title="Chưa có phiên chạy nào"
        description="Dữ liệu phiên sẽ hiển thị khi thiết bị bắt đầu hoạt động."
      />
    );
  }
  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Phiên #{session.id}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSelectedSessionId(session.id)}>
                Xem biểu đồ rung
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Bắt đầu</p>
              <p>{formatDateTime(session.serverSessionStart)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kết thúc</p>
              <p>{formatDateTime(session.serverSessionEnd)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thời lượng</p>
              <p>{formatDuration(session.uptime ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg vibration</p>
              <p>{session.avgVibration?.toFixed(2) ?? '-'}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onSessionsLoadMore}
          disabled={!sessionsHasMore || sessionsLoading}
        >
          {sessionsLoading ? 'Đang tải...' : sessionsHasMore ? 'Tải thêm' : 'Đã tải hết'}
        </Button>
      </div>

      <SessionVibrationChartDialog
        open={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
        title={selectedSession ? `Biểu đồ rung phiên #${selectedSession.id}` : 'Biểu đồ rung'}
        data={vibrationChart}
      />
    </div>
  );
};
