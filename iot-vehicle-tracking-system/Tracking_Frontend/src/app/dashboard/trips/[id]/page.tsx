'use client';
import { use, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tripServices } from '@/lib/api/trips';
import { TripDetail } from '@/features/trips/components/trip-detail';
import { TripReplayControls } from '@/features/trips/components/trip-replay-controls';
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
  });
  const points = useMemo(() => telemetryQuery.data?.points ?? [], [telemetryQuery.data?.points]);
  const moving = useMemo(
    () => points[Math.min(cursor, Math.max(points.length - 1, 0))],
    [points, cursor],
  );
  return (
    <PageContainer
      pageTitle={`Chuyến đi #${tripId}`}
      pageDescription={tripQuery.data?.tripCode ?? ''}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Khoảng cách</CardTitle>
          </CardHeader>
          <CardContent>{tripQuery.data?.distanceKm ?? 0} km</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Thời gian</CardTitle>
          </CardHeader>
          <CardContent>{tripQuery.data?.durationMinutes ?? 0} phút</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ trung bình</CardTitle>
          </CardHeader>
          <CardContent>{tripQuery.data?.avgSpeed ?? 0} km/h</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tốc độ tối đa</CardTitle>
          </CardHeader>
          <CardContent>{tripQuery.data?.maxSpeed ?? 0} km/h</CardContent>
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
