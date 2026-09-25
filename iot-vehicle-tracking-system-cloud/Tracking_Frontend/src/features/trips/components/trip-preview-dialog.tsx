'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TripDetail } from '@/features/trips/components/trip-detail';
import { TripReplayControls } from '@/features/trips/components/trip-replay-controls';
import { useTripLiveTracking } from '@/features/trips/hooks/use-trip-live-tracking';
import { tripServices } from '@/lib/api/trips';
import { formatDateTime, formatDuration } from '@/lib/utils/date/format';

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
  <div className="rounded-xl border bg-muted/20 p-3">
    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold">{value}</p>
  </div>
);

export const TripPreviewDialog = ({
  open,
  tripId,
  onOpenChange,
}: {
  open: boolean;
  tripId: number | null;
  onOpenChange: (value: boolean) => void;
}) => {
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState<'1x' | '2x' | '4x'>('1x');
  const [interval, setInterval_] = useState<'15s' | '1m' | '5m' | '10m'>('15s');

  const tripQuery = useQuery({
    queryKey: ['trip-preview-detail', tripId],
    queryFn: () => tripServices.getById(Number(tripId)),
    enabled: open && Boolean(tripId),
  });

  const isInProgress = open && tripQuery.data?.status === 'in_progress';
  const telemetryQuery = useQuery({
    queryKey: ['trip-preview-telemetry', tripId, interval],
    queryFn: () => tripServices.getTelemetry(Number(tripId), { interval }),
    enabled: open && Boolean(tripId),
  });

  useTripLiveTracking(
    Number(tripId ?? 0),
    Boolean(tripId) && isInProgress,
    tripQuery.data?.deviceId ?? null,
  );

  const points = useMemo(() => telemetryQuery.data?.points ?? [], [telemetryQuery.data?.points]);
  const summary = telemetryQuery.data?.summary;
  const moving = useMemo(
    () => points[Math.min(cursor, Math.max(points.length - 1, 0))],
    [cursor, points],
  );

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      setCursor(0);
      setInterval_('15s');
      return;
    }

    setCursor(0);
    setPlaying(false);
  }, [open, tripId]);

  useEffect(() => {
    if (!playing || points.length === 0) {
      return;
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,960px)] max-h-[92dvh] w-[min(96vw,1320px)] max-w-none flex-col overflow-hidden p-0 sm:w-[min(96vw,1320px)] sm:max-w-none">
        <DialogHeader className="shrink-0 gap-3 border-b bg-background px-6 py-4 pr-14">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <DialogTitle>{tripQuery.data?.tripCode ?? 'Xem nhanh chuyến đi'}</DialogTitle>
              <DialogDescription className="sr-only">
                Xem nhanh trạng thái, hành trình phát lại và thống kê chi tiết của chuyến đi.
              </DialogDescription>
              <div className="flex flex-wrap gap-2">
                {tripQuery.data?.status ? (
                  <Badge variant={tripQuery.data.status === 'in_progress' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[tripQuery.data.status] ?? tripQuery.data.status}
                  </Badge>
                ) : null}
                {tripQuery.data?.vehiclePlate ? (
                  <Badge variant="outline">{tripQuery.data.vehiclePlate}</Badge>
                ) : tripQuery.data?.vehicleId ? (
                  <Badge variant="outline">{tripQuery.data.vehicleId}</Badge>
                ) : null}
                {tripQuery.data?.deviceId ? <Badge variant="outline">{tripQuery.data.deviceId}</Badge> : null}
                {tripQuery.data?.customerName ? (
                  <Badge variant="outline">{tripQuery.data.customerName}</Badge>
                ) : null}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Khoảng cách" value={`${distanceKm} km`} />
                <StatTile label="Thời gian" value={formatDuration(durationMinutes * 60)} />
                <StatTile label="TB tốc độ" value={`${avgSpeed} km/h`} />
                <StatTile label="Đỉnh tốc độ" value={`${maxSpeed} km/h`} />
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Điểm đi</p>
                    <p className="font-medium">{tripQuery.data.startLocation ?? 'Chưa cấu hình'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(tripQuery.data.actualStart ?? tripQuery.data.plannedStart)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Điểm đến</p>
                    <p className="font-medium">{tripQuery.data.endLocation ?? 'Chưa cấu hình'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(tripQuery.data.actualEnd ?? tripQuery.data.plannedEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phương tiện / khách hàng</p>
                    <p className="font-medium">
                      {tripQuery.data.vehiclePlate ?? tripQuery.data.vehicleId ?? 'Chưa gắn xe'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tripQuery.data.customerName ?? tripQuery.data.deviceId ?? 'Chưa có ngữ cảnh bổ sung'}
                    </p>
                  </div>
                </div>
              </div>

              {telemetryQuery.isError ? (
                <EmptyState
                  title="Không thể tải phần phát lại"
                  description="Telemetry của hành trình hiện chưa sẵn sàng."
                  action={{ label: 'Thử lại', onClick: () => void telemetryQuery.refetch() }}
                />
              ) : telemetryQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Đang tải dữ liệu phát lại...
                </div>
              ) : (
                <>
                  {points.length === 0 ? (
                    <div className="rounded-2xl border bg-muted/10 p-4">
                      <EmptyState
                        title="Chưa có dữ liệu phát lại"
                        description="Chuyến đi chưa ghi nhận đủ mốc GPS để phát lại hành trình."
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

                  <TripDetail
                    trip={tripQuery.data}
                    summary={summary}
                    points={points}
                    moving={moving}
                    cursor={cursor}
                  />
                </>
              )}
            </div>
          ) : (
            <EmptyState
              title="Chưa có chuyến đi"
              description="Không tìm thấy dữ liệu cho chuyến đi đang chọn."
            />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          {tripId ? (
            <Button asChild>
              <Link href={`/dashboard/operations/trips/${tripId}`}>Mở trang chi tiết</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
