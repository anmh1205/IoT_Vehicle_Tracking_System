'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { violationServices } from '@/lib/api/violations';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/utils/date/format';
import { getViolationTypeLabel } from '@/features/violations/utils/violation-labels';

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const SEVERITY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

const InfoRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const hasLocation = (lat: number | null, lon: number | null) =>
  lat !== null &&
  lon !== null &&
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  !(lat === 0 && lon === 0);

export const ViolationDetailModal = ({
  open,
  onOpenChange,
  violationId,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  violationId: number | null;
}) => {
  const query = useQuery({
    queryKey: ['violation-detail', violationId],
    queryFn: () => violationServices.getById(violationId as number),
    enabled: open && violationId !== null,
  });

  const detail = query.data ?? {};
  const violationTypeLabel = getViolationTypeLabel(detail.violationType);
  const severityLabel = SEVERITY_LABELS[detail.severity] ?? detail.severity ?? 'Chưa xác định';
  const speedDelta = useMemo(() => {
    if (
      detail.actualSpeed === null ||
      detail.actualSpeed === undefined ||
      detail.speedLimit === null ||
      detail.speedLimit === undefined
    ) {
      return null;
    }
    return Number(detail.actualSpeed) - Number(detail.speedLimit);
  }, [detail.actualSpeed, detail.speedLimit]);

  const locationReady = hasLocation(detail.locationLat ?? null, detail.locationLon ?? null);
  const mapUrl = locationReady
    ? `https://maps.google.com/?q=${detail.locationLat},${detail.locationLon}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,880px)] max-h-[92dvh] w-[min(96vw,1100px)] max-w-none flex-col overflow-hidden p-0 sm:w-[min(96vw,1100px)] sm:max-w-none">
        <DialogHeader className="shrink-0 border-b bg-background px-5 py-4 sm:px-6">
          <DialogTitle>Chi tiết vi phạm</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {query.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={SEVERITY_VARIANTS[detail.severity] ?? 'secondary'}>
                          {severityLabel}
                        </Badge>
                        <Badge variant="outline">{violationTypeLabel}</Badge>
                        <Badge variant={detail.acknowledged ? 'secondary' : 'default'}>
                          {detail.acknowledged ? 'Đã xác nhận' : 'Chưa xử lý'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold tracking-tight">
                          {detail.vehicleId ?? 'Vi phạm chưa gắn phương tiện'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {detail.description ?? 'Chưa có mô tả chi tiết cho bản ghi vi phạm này.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
                      <InfoRow label="Mã bản ghi" value={detail.id ? String(detail.id) : '-'} />
                      <InfoRow label="Driver ID" value={detail.driverId ? String(detail.driverId) : 'Chưa có'} />
                      <InfoRow label="Alert ID" value={detail.alertId ? String(detail.alertId) : 'Chưa có'} />
                      <InfoRow label="Phạt ước tính" value={`${formatNumber(detail.fineAmount ?? 0)} VND`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Thông tin vận hành</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <InfoRow
                        label="Tốc độ thực tế"
                        value={
                          detail.actualSpeed !== null && detail.actualSpeed !== undefined
                            ? `${detail.actualSpeed} km/h`
                            : 'Chưa có'
                        }
                      />
                      <InfoRow
                        label="Giới hạn tốc độ"
                        value={
                          detail.speedLimit !== null && detail.speedLimit !== undefined
                            ? `${detail.speedLimit} km/h`
                            : 'Chưa có'
                        }
                      />
                      <InfoRow
                        label="Chênh lệch"
                        value={
                          speedDelta === null
                            ? 'Không xác định'
                            : speedDelta > 0
                              ? `+${speedDelta} km/h`
                              : `${speedDelta} km/h`
                        }
                        hint={speedDelta !== null && speedDelta > 0 ? 'Đang vượt giới hạn' : undefined}
                      />
                      <InfoRow label="Mức độ nghiêm trọng" value={severityLabel} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vị trí vi phạm</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {locationReady ? (
                        <>
                          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                            <p className="text-xs text-muted-foreground">Tọa độ</p>
                            <p className="mt-1 font-medium">
                              {detail.locationLat}, {detail.locationLon}
                            </p>
                          </div>
                          <Button asChild variant="outline">
                            <a href={mapUrl ?? '#'} target="_blank" rel="noreferrer">
                              <MapPin className="mr-2 h-4 w-4" />
                              Mở vị trí trên bản đồ
                            </a>
                          </Button>
                        </>
                      ) : (
                        <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                          Bản ghi vi phạm này chưa có tọa độ hợp lệ.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Mốc xử lý</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-xs text-muted-foreground">Phát hiện vi phạm</p>
                        <p className="mt-1 text-sm font-medium">{formatDateTime(detail.createdAt)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatRelative(detail.createdAt)}</p>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-xs text-muted-foreground">Xác nhận vi phạm</p>
                        <p className="mt-1 text-sm font-medium">{formatDateTime(detail.acknowledgedAt)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {detail.acknowledged
                            ? `Người xử lý: ${detail.acknowledgedBy ?? 'không rõ'}`
                            : 'Chưa có người xác nhận'}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-xs text-muted-foreground">Cập nhật gần nhất</p>
                        <p className="mt-1 text-sm font-medium">{formatDateTime(detail.updatedAt)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ghi chú xử lý</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {detail.notes ?? 'Chưa có ghi chú.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {query.isError ? (
                <Card className="border-destructive/40">
                  <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    Không thể tải chi tiết vi phạm. Vui lòng thử lại.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
