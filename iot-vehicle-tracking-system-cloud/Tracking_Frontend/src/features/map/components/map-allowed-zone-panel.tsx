'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Loader2, MapPin, ShieldAlert, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVehicleAllowedZone, useVehicleAllowedZonePreview } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import {
  allowedZoneAlertModeOptions,
  allowedZoneFormSchema,
  createAllowedZoneFormDefaults,
  toAllowedZonePayload,
  type AllowedZoneFormValues,
} from '@/features/geofences/lib/allowed-zone-form';
import { AllowedZoneRadiusField } from '@/features/geofences/components/allowed-zone-radius-field';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

type MapPickValue = { latitude: number; longitude: number } | null;
type PreviewDraft = {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isPickingCenter: boolean;
} | null;

const getResetKey = (zoneUpdatedAt?: string | null, previewSnapshotAt?: string | null) =>
  `${zoneUpdatedAt ?? 'none'}:${previewSnapshotAt ?? 'none'}`;

export const MapAllowedZonePanel = ({
  open,
  vehicleId,
  vehicleLabel,
  canEdit,
  mapPickValue,
  onClose,
  onPreviewChange,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  vehicleId: string | null;
  vehicleLabel: string | null;
  canEdit: boolean;
  mapPickValue: MapPickValue;
  onClose: () => void;
  onPreviewChange: (draft: PreviewDraft) => void;
  onSaved: () => void;
  onDeleted: () => void;
}) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [mapPickArmed, setMapPickArmed] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const initializedForOpenRef = useRef(false);
  const lastResetKeyRef = useRef<string | null>(null);
  const { zoneQuery, upsertMutation, deleteMutation } = useVehicleAllowedZone(vehicleId);
  const zone = zoneQuery.data;
  const form = useForm<AllowedZoneFormValues>({
    resolver: zodResolver(allowedZoneFormSchema),
    defaultValues: createAllowedZoneFormDefaults(zone, undefined),
  });
  const centerSource = form.watch('centerSource');
  const previewQuery = useVehicleAllowedZonePreview(vehicleId, open && previewReady && zoneQuery.isFetched && centerSource === 'vehicle_position');
  const preview = previewQuery.data;
  const radiusMeters = form.watch('radiusMeters');
  const centerLatitude = form.watch('centerLatitude');
  const centerLongitude = form.watch('centerLongitude');
  const resetKey = getResetKey(zone?.updatedAt, preview?.snapshotAt);

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      lastResetKeyRef.current = null;
      setMapPickArmed(false);
      setPreviewReady(false);
      onPreviewChange(null);
      return;
    }
    if (initializedForOpenRef.current && lastResetKeyRef.current === resetKey) return;
    if (initializedForOpenRef.current && form.formState.isDirty) return;
    form.reset(createAllowedZoneFormDefaults(zone, preview));
    initializedForOpenRef.current = true;
    lastResetKeyRef.current = resetKey;
    setMapPickArmed(false);
    setPreviewReady(true);
  }, [form, onPreviewChange, open, preview, resetKey, zone]);

  useEffect(() => {
    if (!mapPickValue || centerSource !== 'map_pick') return;
    form.setValue('centerLatitude', mapPickValue.latitude, { shouldValidate: true, shouldDirty: true });
    form.setValue('centerLongitude', mapPickValue.longitude, { shouldValidate: true, shouldDirty: true });
    setMapPickArmed(false);
  }, [centerSource, form, mapPickValue]);

  useEffect(() => {
    if (centerSource !== 'map_pick') {
      setMapPickArmed(false);
    }
  }, [centerSource]);

  const resolvedCenter = useMemo(() => {
    if (centerSource === 'vehicle_position') {
      if (preview) {
        return { latitude: preview.centerLatitude, longitude: preview.centerLongitude, snapshotAt: preview.snapshotAt };
      }
      if (zone) {
        return { latitude: zone.centerLatitude, longitude: zone.centerLongitude, snapshotAt: zone.centerSnapshotAt };
      }
      return null;
    }

    return centerLatitude !== null && centerLongitude !== null
      ? { latitude: centerLatitude, longitude: centerLongitude, snapshotAt: null }
      : null;
  }, [centerLatitude, centerLongitude, centerSource, preview, zone]);

  useEffect(() => {
    if (!open || !resolvedCenter) {
      onPreviewChange(null);
      return;
    }

    onPreviewChange({
      centerLatitude: resolvedCenter.latitude,
      centerLongitude: resolvedCenter.longitude,
      radiusMeters,
      isPickingCenter: centerSource === 'map_pick' && mapPickArmed,
    });
  }, [centerSource, mapPickArmed, onPreviewChange, open, radiusMeters, resolvedCenter]);

  const resolvedWarning = centerSource === 'vehicle_position' ? preview?.warning ?? zone?.warning : zone?.warning;

  const handleSave = form.handleSubmit(async (values) => {
    if (!vehicleId) return;
    try {
      await upsertMutation.mutateAsync(toAllowedZonePayload(values));
      notificationUtils.success('Đã lưu vùng cho phép');
      onSaved();
    } catch (error) {
      notificationUtils.error('Lưu vùng cho phép thất bại', getApiErrorMessage(error, 'Không thể cập nhật vùng cho phép.'));
    }
  });

  const handleDelete = async () => {
    if (!vehicleId) return;
    try {
      await deleteMutation.mutateAsync();
      notificationUtils.success('Đã gỡ vùng cho phép');
      setConfirmDeleteOpen(false);
      onDeleted();
    } catch (error) {
      notificationUtils.error('Gỡ vùng cho phép thất bại', getApiErrorMessage(error, 'Không thể gỡ vùng cho phép.'));
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[1000] flex max-h-[78dvh] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/96 shadow-2xl backdrop-blur md:bottom-3 md:left-auto md:right-3 md:top-3 md:w-[420px] md:max-h-[calc(100dvh-5rem)]">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Vùng cho phép trên bản đồ</p>
              <Badge variant="outline">{zone ? 'Đã cấu hình' : 'Chưa có vùng'}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{vehicleLabel ?? vehicleId ?? 'Phương tiện chưa xác định'} · mỗi xe chỉ có một vùng đang hoạt động.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Đóng panel vùng cho phép">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-muted/10 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Trạng thái</p>
                <p className="mt-1 font-medium">{zone ? 'Đang hoạt động' : 'Chưa thiết lập'}</p>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Bán kính</p>
                <p className="mt-1 font-medium">{Math.round(radiusMeters)} m</p>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Nguồn tâm</p>
                <p className="mt-1 font-medium">{centerSource === 'vehicle_position' ? 'Telemetry gần nhất' : 'Chọn trên map'}</p>
              </div>
            </div>

            <AllowedZoneRadiusField value={radiusMeters} onChange={(value) => form.setValue('radiusMeters', value, { shouldDirty: true })} disabled={!canEdit} />

            <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <Label>Nguồn lấy tâm vùng</Label>
              <Controller
                control={form.control}
                name="centerSource"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="vehicle_position" id="map-allowed-zone-center-vehicle" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="map-allowed-zone-center-vehicle">Theo vị trí telemetry gần nhất</Label>
                        <p className="text-xs text-muted-foreground">Dùng snapshot backend để giữ đúng stale-warning.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="map_pick" id="map-allowed-zone-center-map" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="map-allowed-zone-center-map">Chọn tay trên bản đồ</Label>
                        <p className="text-xs text-muted-foreground">Click trực tiếp trên map để đặt lại tâm vùng.</p>
                      </div>
                    </label>
                  </RadioGroup>
                )}
              />

              {centerSource === 'map_pick' ? (
                <div className="space-y-3 rounded-xl border bg-background p-3">
                  <Button type="button" variant={mapPickArmed ? 'secondary' : 'outline'} disabled={!canEdit} onClick={() => setMapPickArmed((value) => !value)}>
                    <MapPin className="mr-2 h-4 w-4" />
                    {mapPickArmed ? 'Đang chờ click trên bản đồ' : 'Chọn tâm trên bản đồ'}
                  </Button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="map-allowed-zone-latitude">Vĩ độ</Label>
                      <Input id="map-allowed-zone-latitude" type="number" inputMode="decimal" step="0.000001" disabled={!canEdit} value={centerLatitude ?? ''} onChange={(event) => form.setValue('centerLatitude', event.target.value === '' ? null : Number(event.target.value), { shouldValidate: true, shouldDirty: true })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="map-allowed-zone-longitude">Kinh độ</Label>
                      <Input id="map-allowed-zone-longitude" type="number" inputMode="decimal" step="0.000001" disabled={!canEdit} value={centerLongitude ?? ''} onChange={(event) => form.setValue('centerLongitude', event.target.value === '' ? null : Number(event.target.value), { shouldValidate: true, shouldDirty: true })} />
                    </div>
                  </div>
                  <p className="text-xs text-destructive">{form.formState.errors.centerLatitude?.message ?? form.formState.errors.centerLongitude?.message}</p>
                </div>
              ) : null}
            </div>

            {resolvedCenter ? (
              <div className="rounded-2xl border bg-muted/10 p-4 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tâm vùng hiện dùng</p>
                <p className="mt-1 font-medium">{resolvedCenter.latitude.toFixed(6)}, {resolvedCenter.longitude.toFixed(6)}</p>
                {resolvedCenter.snapshotAt ? <p className="mt-1 text-xs text-muted-foreground">Snapshot {formatDateTime(resolvedCenter.snapshotAt)} · {formatRelative(resolvedCenter.snapshotAt)}</p> : null}
                {centerSource === 'vehicle_position' && previewQuery.isLoading ? <p className="mt-1 text-xs text-muted-foreground">Đang lấy snapshot telemetry mới nhất...</p> : null}
              </div>
            ) : null}

            {resolvedWarning ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Cần chú ý trước khi lưu</AlertTitle>
                <AlertDescription>{resolvedWarning.message}</AlertDescription>
              </Alert>
            ) : null}

            <details className="rounded-2xl border bg-muted/10 p-4">
              <summary className="cursor-pointer text-sm font-medium">Tùy chọn cảnh báo nâng cao</summary>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Chế độ cảnh báo</Label>
                  <div className="grid gap-2">
                    {allowedZoneAlertModeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn('rounded-xl border px-3 py-2 text-left', form.watch('alertMode') === option.value && 'border-primary bg-primary/5')}
                        disabled={!canEdit}
                        onClick={() => form.setValue('alertMode', option.value, { shouldDirty: true })}
                      >
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-allowed-zone-cooldown">Cooldown cảnh báo (giây)</Label>
                  <Input id="map-allowed-zone-cooldown" type="number" min={0} step={30} disabled={!canEdit} value={form.watch('cooldownSec')} onChange={(event) => form.setValue('cooldownSec', Math.max(0, Number(event.target.value || 0)), { shouldDirty: true })} />
                </div>
              </div>
            </details>
          </div>
        </ScrollArea>

        <div className="border-t bg-background/96 px-4 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            {zone ? (
              <Button type="button" variant="outline" disabled={!canEdit || deleteMutation.isPending} onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Gỡ vùng hiện tại
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
            <Button type="button" disabled={!vehicleId || !canEdit || upsertMutation.isPending || zoneQuery.isLoading || previewQuery.isLoading} onClick={handleSave}>
              {upsertMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {zone ? 'Cập nhật vùng' : 'Lưu vùng cho phép'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Gỡ vùng cho phép"
        description="Thao tác này sẽ tắt vùng cho phép đang hoạt động của phương tiện này."
        confirmLabel="Gỡ vùng"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};



