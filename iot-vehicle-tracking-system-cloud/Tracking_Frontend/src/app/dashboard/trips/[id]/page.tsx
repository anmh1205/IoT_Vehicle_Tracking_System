'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
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
  const [interval, setInterval_] = useState<'15s' | '1m' | '5m' | '10m'>('15s');

  const tripQuery = useQuery({
    queryKey: ['trip-detail', tripId],
    queryFn: () => tripServices.getById(tripId),
  });

  const isInProgress = tripQuery.data?.status === 'in_progress';
  const telemetryQuery = useQuery({
    queryKey: ['trip-telemetry', tripId, interval],
    queryFn: () => tripServices.getTelemetry(tripId, { interval }),
  });

  useTripLiveTracking(tripId, isInProgress, tripQuery.data?.deviceId ?? null);

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

  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [interval, tripId]);

  const distanceKm = tripQuery.data?.distanceKm ?? summary?.distanceKm ?? 0;
  const durationMinutes = summary?.durationMinutes ?? 0;
  const avgSpeed = summary?.avgSpeed ?? 0;
  const maxSpeed = summary?.maxSpeed ?? 0;
  const telemetryStart = tripQuery.data?.actualStart ?? tripQuery.data?.plannedStart ?? points[0]?.timestamp;
  const telemetryEnd =
    tripQuery.data?.actualEnd ?? points.at(-1)?.timestamp ?? tripQuery.data?.plannedEnd ?? null;
  const pageTitle = tripQuery.data?.tripCode ?? `Chuyến đi #${tripId}`;

  return (
    <PageContainer
      pageTitle={pageTitle}
      pageDescription="Chi tiết hành trình, dòng thời gian và phát lại telemetry."
    >
      {tripQuery.isError ? (
        <EmptyState
          title="Không thể tải chuyến đi"
          description="Dữ liệu chuyến đi hiện chưa sẵn sàng. Hãy thử lại sau."
          action={{ label: 'Thử lại', onClick: () => void tripQuery.refetch() }}
        />
      ) : tripQuery.isLoading ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Đang tải dữ liệu chuyến đi...
        </div>
      ) : tripQuery.data ? (
        <>
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={tripQuery.data.status === 'in_progress' ? 'default' : 'secondary'}>
                      {STATUS_LABELS[tripQuery.data.status] ?? tripQuery.data.status ?? 'Chưa xác định'}
                    </Badge>
                    {tripQuery.data.vehiclePlate ? (
                      <Badge variant="outline">{tripQuery.data.vehiclePlate}</Badge>
                    ) : tripQuery.data.vehicleId ? (
                      <Badge variant="outline">{tripQuery.data.vehicleId}</Badge>
                    ) : null}
                    {tripQuery.data.deviceId ? <Badge variant="outline">{tripQuery.data.deviceId}</Badge> : null}
                    {tripQuery.data.customerName ? (
                      <Badge variant="outline">{tripQuery.data.customerName}</Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold">
                      {tripQuery.data.driverName ? `Tài xế: ${tripQuery.data.driverName}` : 'Chưa gán tài xế'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tripQuery.data.driverPhone ?? 'Chưa có số điện thoại tài xế'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatTile label="Khoảng cách" value={`${distanceKm} km`} />
                <StatTile label="Thời gian" value={formatDuration(durationMinutes * 60)} />
                <StatTile label="Tốc độ trung bình" value={`${avgSpeed} km/h`} />
                <StatTile label="Đỉnh tốc độ" value={`${maxSpeed} km/h`} />
                <StatTile label="Mốc GPS" value={`${points.length}`} />
              </div>

              <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 text-sm lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Điểm đi</p>
                  <p className="font-medium">{tripQuery.data.startLocation ?? 'Chưa cấu hình'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(telemetryStart)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Điểm đến</p>
                  <p className="font-medium">{tripQuery.data.endLocation ?? 'Chưa cấu hình'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(telemetryEnd)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ghi chú chuyến đi</p>
                  <p className="font-medium">{tripQuery.data.notes ?? 'Chưa có ghi chú điều phối'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {telemetryQuery.isLoading ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Đang tải dữ liệu phát lại...
            </div>
          ) : points.length === 0 ? (
            <div className="rounded-2xl border bg-muted/10 p-4">
              <EmptyState
                title="Chưa có dữ liệu phát lại"
                description="Chuyến đi chưa có đủ telemetry để chạy lại hành trình."
              />
            </div>
          ) : (
            <TripReplayControls
              playing={playing}
              cursor={cursor}
              max={Math.max(points.length - 1, 0)}
              speed={speed}
              interval={interval}
              currentTimestamp={moving?.timestamp ?? null}
              currentSpeed={moving?.speed ?? null}
              onToggle={() => setPlaying((value) => !value)}
              onReset={() => {
                setCursor(0);
                setPlaying(false);
              }}
              onCursorChange={setCursor}
              onSpeedChange={setSpeed}
              onIntervalChange={setInterval_}
            />
          )}

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
        </>
      ) : (
        <EmptyState
          title="Chưa có chuyến đi"
          description="Không tìm thấy dữ liệu cho chuyến đi đang chọn."
        />
      )}
    </PageContainer>
  );
};

export default TripDetailPage;
