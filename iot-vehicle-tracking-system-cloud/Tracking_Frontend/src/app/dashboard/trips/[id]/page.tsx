'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { tripServices } from '@/lib/api/trips';
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

  const distanceKm = summary?.distanceKm ?? tripQuery.data?.distanceKm ?? 0;
  const durationMinutes = summary?.durationMinutes ?? 0;
  const avgSpeed = summary?.avgSpeed ?? 0;
  const maxSpeed = summary?.maxSpeed ?? 0;

  return (
    <PageContainer
      pageTitle={`Chuyến đi #${tripId}`}
      pageDescription={tripQuery.data?.tripCode ?? 'Chi tiết hành trình và replay telemetry'}
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Badge variant={tripQuery.data?.status === 'in_progress' ? 'default' : 'secondary'}>
                  {STATUS_LABELS[tripQuery.data?.status] ?? tripQuery.data?.status ?? 'Chưa xác định'}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {tripQuery.data?.driverName ? `Tài xế: ${tripQuery.data.driverName}` : 'Chưa gán tài xế'}
                </p>
              </div>
              <Select value={interval} onValueChange={setInterval_}>
                <SelectTrigger className="w-full sm:w-[160px]">
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
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Khoảng cách</p>
              <p className="mt-2 text-2xl font-semibold">{distanceKm} km</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Thời gian</p>
              <p className="mt-2 text-2xl font-semibold">{durationMinutes} phút</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tốc độ trung bình</p>
              <p className="mt-2 text-2xl font-semibold">{avgSpeed} km/h</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tốc độ tối đa</p>
              <p className="mt-2 text-2xl font-semibold">{maxSpeed} km/h</p>
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
        <TripDetail points={points} moving={moving} />
      )}
    </PageContainer>
  );
};

export default TripDetailPage;
