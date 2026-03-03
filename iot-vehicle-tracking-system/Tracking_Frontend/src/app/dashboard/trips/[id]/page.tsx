'use client';
import { use, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tripServices } from '@/lib/api/trips';
import { TripDetail } from '@/features/trips/components/trip-detail';
import { TripReplayControls } from '@/features/trips/components/trip-replay-controls';

const SPEED_MS: Record<string, number> = { '1x': 500, '2x': 250, '4x': 125 };

const statusLabel: Record<string, string> = {
  planned: 'Đã lên lịch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
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
  const tripQuery = useQuery({
    queryKey: ['trip-detail', tripId],
    queryFn: () => tripServices.getById(tripId),
  });
  const telemetryQuery = useQuery({
    queryKey: ['trip-telemetry', tripId],
    queryFn: () => tripServices.getTelemetry(tripId),
    // Auto-refetch for in_progress trips
    refetchInterval: tripQuery.data?.status === 'in_progress' ? 10000 : false,
  });
  const points = useMemo(() => telemetryQuery.data?.points ?? [], [telemetryQuery.data?.points]);
  const summary = telemetryQuery.data?.summary;
  const moving = useMemo(
    () => points[Math.min(cursor, Math.max(points.length - 1, 0))],
    [points, cursor],
  );

  // Auto-advance cursor during replay
  useEffect(() => {
    if (!playing || points.length === 0) return;
    const interval = setInterval(() => {
      setCursor((prev) => {
        if (prev >= points.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, SPEED_MS[speed] ?? 500);
    return () => clearInterval(interval);
  }, [playing, points.length, speed]);

  // Use summary from telemetry API (real-time computed), fallback to trip data
  const distanceKm = summary?.distanceKm ?? tripQuery.data?.distanceKm ?? 0;
  const durationMinutes = summary?.durationMinutes ?? 0;
  const avgSpeed = summary?.avgSpeed ?? 0;
  const maxSpeed = summary?.maxSpeed ?? 0;

  return (
    <PageContainer
      pageTitle={`Chuyến đi #${tripId}`}
      pageDescription={tripQuery.data?.tripCode ?? ''}
    >
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={tripQuery.data?.status === 'in_progress' ? 'default' : 'secondary'}>
          {statusLabel[tripQuery.data?.status] ?? tripQuery.data?.status}
        </Badge>
        {tripQuery.data?.driverName && (
          <span className="text-muted-foreground text-sm">{tripQuery.data.driverName}</span>
        )}
        <span className="text-muted-foreground text-sm">{points.length} điểm GPS</span>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Khoảng cách</CardTitle>
          </CardHeader>
          <CardContent>{distanceKm} km</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Thời gian</CardTitle>
          </CardHeader>
          <CardContent>{durationMinutes} phút</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ trung bình</CardTitle>
          </CardHeader>
          <CardContent>{avgSpeed} km/h</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ tối đa</CardTitle>
          </CardHeader>
          <CardContent>{maxSpeed} km/h</CardContent>
        </Card>
      </div>

      <TripDetail points={points} moving={moving} />

      <Card>
        <CardHeader>
          <CardTitle>Phát lại</CardTitle>
        </CardHeader>
        <CardContent>
          <TripReplayControls
            playing={playing}
            cursor={cursor}
            max={Math.max(points.length - 1, 0)}
            speed={speed}
            onToggle={() => setPlaying((v) => !v)}
            onReset={() => setCursor(0)}
            onCursorChange={setCursor}
            onSpeedChange={setSpeed}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
};
export default TripDetailPage;
