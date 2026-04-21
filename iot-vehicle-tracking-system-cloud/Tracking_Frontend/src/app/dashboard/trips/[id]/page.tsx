'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tripServices } from '@/lib/api/trips';
import { formatDateTime, formatDuration } from '@/lib/utils/date/format';
import { TripDetail } from '@/features/trips/components/trip-detail';
import { TripReplayControls } from '@/features/trips/components/trip-replay-controls';
import { useTripLiveTracking } from '@/features/trips/hooks/use-trip-live-tracking';

const SPEED_MS: Record<string, number> = { '1x': 500, '2x': 250, '4x': 125 };

const STATUS_LABELS: Record<string, string> = {
  planned: 'Đã lên lịch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  started: 'Đã bắt đầu',
  ended: 'Đã kết thúc',
};

const StatTile = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border bg-muted/20 p-4">
    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-xl font-semibold">{value}</p>
  </div>
);

const TripDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const tripId = Number(id);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState<'1x' | '2x' | '4x'>('1x');
  const [interval, setInterval_] = useState<string>('15s');

  const tripQuery = useQuery({
    queryKey: ['trip-detail', tripId],
    queryFn: () => tripServices.getById(tripId),
  });

  const isInProgress = tripQuery.data?.status === 'in_progress';
  const telemetryQuery = useQuery({
    queryKey: ['trip-telemetry', tripId, interval],
    queryFn: () => tripServices.getTelemetry(tripId, { interval }),
    refetchInterval: isInProgress ? 30000 : false,
  });

  useTripLiveTracking(tripId, isInProgress);

  const points = useMemo(() => telemetryQuery.data?.points ?? [], [telemetryQuery.data?.points]);
  const summary = telemetryQuery.data?.summary;
  const moving = useMemo(
    () => points[Math.min(cursor, Math.max(points.length - 1, 0))],
    [points, cursor],
  );

  useEffect(() => {
    if (!playing || points.length === 0) return;

    const intervalId = setInterval(() => {
      setCursor((prev) => {
        if (prev >= points.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, SPEED_MS[speed] ?? 500);

    return () => clearInterval(intervalId);
  }, [playing, points.length, speed]);

  const distanceKm = tripQuery.data?.distanceKm ?? summary?.distanceKm ?? 0;
  const durationMinutes = summary?.durationMinutes ?? 0;
  const avgSpeed = summary?.avgSpeed ?? 0;
  const maxSpeed = summary?.maxSpeed ?? 0;
  const telemetryStart = tripQuery.data?.actualStart ?? tripQuery.data?.plannedStart ?? points[0]?.timestamp;
  const telemetryEnd =
    tripQuery.data?.actualEnd ?? points.at(-1)?.timestamp ?? tripQuery.data?.plannedEnd ?? null;
  const pageTitle = tripQuery.data?.tripCode ?? `Chuyến đi #${tripId}`;

  return (
    <PageContainer pageTitle={pageTitle} pageDescription="Chi tiết hành trình, timeline và replay telemetry">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={tripQuery.data?.status === 'in_progress' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[tripQuery.data?.status] ?? tripQuery.data?.status ?? 'Chưa xác định'}
                  </Badge>
                  {tripQuery.data?.vehicleId ? <Badge variant="outline">{tripQuery.data.vehicleId}</Badge> : null}
                  {tripQuery.data?.deviceId ? <Badge variant="outline">{tripQuery.data.deviceId}</Badge> : null}
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold">
                    {tripQuery.data?.driverName ? `Tài xế: ${tripQuery.data.driverName}` : 'Chưa gán tài xế'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tripQuery.data?.driverPhone ?? 'Chưa có số điện thoại tài xế'}
                  </p>
                </div>
              </div>

              <Select value={interval} onValueChange={setInterval_}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Độ phân giải" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15s">15 giây</SelectItem>
                  <SelectItem value="1m">1 phút</SelectItem>
                  <SelectItem value="5m">5 phút</SelectItem>
                  <SelectItem value="10m">10 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatTile label="Khoảng cách" value={`${distanceKm} km`} />
              <StatTile label="Thời gian" value={formatDuration(durationMinutes * 60)} />
              <StatTile label="TB tốc độ" value={`${avgSpeed} km/h`} />
              <StatTile label="Đỉnh tốc độ" value={`${maxSpeed} km/h`} />
              <StatTile label="Waypoint" value={`${points.length}`} />
            </div>

            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 text-sm lg:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Điểm đi</p>
                <p className="font-medium">{tripQuery.data?.startLocation ?? 'Chưa cấu hình'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(telemetryStart)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Điểm đến</p>
                <p className="font-medium">{tripQuery.data?.endLocation ?? 'Chưa cấu hình'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(telemetryEnd)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ghi chú chuyến đi</p>
                <p className="font-medium">{tripQuery.data?.notes ?? 'Chưa có ghi chú điều phối'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trạng thái đồng bộ</p>
                <p className="font-medium">
                  {isInProgress
                    ? 'Đang làm mới telemetry mỗi 30 giây'
                    : 'Đã dùng dữ liệu chốt tại thời điểm truy vấn'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replay hành trình</CardTitle>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <EmptyState
                title="Chưa có dữ liệu replay"
                description="Chuyến đi chưa có đủ dữ liệu telemetry để chạy lại hành trình."
              />
            ) : (
              <TripReplayControls
                playing={playing}
                cursor={cursor}
                max={Math.max(points.length - 1, 0)}
                speed={speed}
                onToggle={() => setPlaying((value) => !value)}
                onReset={() => {
                  setCursor(0);
                  setPlaying(false);
                }}
                onCursorChange={setCursor}
                onSpeedChange={setSpeed}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {telemetryQuery.isError ? (
        <EmptyState
          title="Không thể tải telemetry"
          description="Dữ liệu hành trình hiện chưa sẵn sàng. Hãy thử làm mới lại sau."
          action={{ label: 'Thử lại', onClick: () => void telemetryQuery.refetch() }}
        />
      ) : (
        <TripDetail
          trip={tripQuery.data}
          summary={summary}
          points={points}
          moving={moving}
          cursor={cursor}
        />
      )}
    </PageContainer>
  );
};

export default TripDetailPage;
