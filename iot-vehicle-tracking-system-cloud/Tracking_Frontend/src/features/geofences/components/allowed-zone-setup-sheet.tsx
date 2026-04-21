'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { VehicleAllowedZone, VehicleAllowedZonePreviewCenter } from '@/lib/api/geofences';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Loader2, MapPin, ShieldAlert, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useVehicleAllowedZone, useVehicleAllowedZonePreview } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import {
  allowedZoneAlertModeOptions,
  allowedZoneFormSchema,
  createAllowedZoneFormDefaults,
  toAllowedZonePayload,
  type AllowedZoneFormValues,
} from '@/features/geofences/lib/allowed-zone-form';
import { AllowedZoneRadiusField } from './allowed-zone-radius-field';

type MapPickValue = { latitude: number; longitude: number } | null;

type PreviewDraft = {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isPickingCenter: boolean;
} | null;

const getResetKey = (
  zone: VehicleAllowedZone | null | undefined,
  preview: VehicleAllowedZonePreviewCenter | null | undefined,
) =>
  JSON.stringify({
    zoneId: zone?.id ?? null,
    zoneUpdatedAt: zone?.updatedAt ?? null,
    previewSnapshotAt: preview?.snapshotAt ?? null,
    previewLatitude: preview?.centerLatitude ?? null,
    previewLongitude: preview?.centerLongitude ?? null,
  });

export const AllowedZoneSetupSheet = ({
  open,
  onOpenChange,
  vehicleId,
  vehicleLabel,
  canEdit = false,
  allowMapPick = false,
  mapPickValue = null,
  onPreviewChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  canEdit?: boolean;
  allowMapPick?: boolean;
  mapPickValue?: MapPickValue;
  onPreviewChange?: (draft: PreviewDraft) => void;
}) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [mapPickArmed, setMapPickArmed] = useState(false);
  const initializedForOpenRef = useRef(false);
  const lastResetKeyRef = useRef<string | null>(null);
  const { zoneQuery, upsertMutation, deleteMutation } = useVehicleAllowedZone(vehicleId);
  const zone = zoneQuery.data;
  const form = useForm<AllowedZoneFormValues>({
    resolver: zodResolver(allowedZoneFormSchema),
    defaultValues: createAllowedZoneFormDefaults(zone, undefined),
  });
  const centerSource = form.watch('centerSource');
  const previewQuery = useVehicleAllowedZonePreview(vehicleId, open && zoneQuery.isFetched && centerSource === 'vehicle_position');
  const preview = previewQuery.data;
  const resetKey = getResetKey(zone, preview);
  const radiusMeters = form.watch('radiusMeters');
  const centerLatitude = form.watch('centerLatitude');
  const centerLongitude = form.watch('centerLongitude');

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      lastResetKeyRef.current = null;
      return;
    }

    if (initializedForOpenRef.current && lastResetKeyRef.current === resetKey) {
      return;
    }

    if (initializedForOpenRef.current && form.formState.isDirty) {
      return;
    }

    form.reset(createAllowedZoneFormDefaults(zone, preview));
    setMapPickArmed(false);
    initializedForOpenRef.current = true;
    lastResetKeyRef.current = resetKey;
  }, [form, open, preview, resetKey, zone]);

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

  const resolvedWarning = centerSource === 'vehicle_position' ? preview?.warning ?? zone?.warning : zone?.warning;
  const resolvedCenter = useMemo(() => {
    if (centerSource === 'vehicle_position') {
      return preview
        ? { latitude: preview.centerLatitude, longitude: preview.centerLongitude, snapshotAt: preview.snapshotAt }
        : zone
          ? { latitude: zone.centerLatitude, longitude: zone.centerLongitude, snapshotAt: zone.centerSnapshotAt }
          : null;
    }
    return centerLatitude !== null && centerLongitude !== null
      ? { latitude: centerLatitude, longitude: centerLongitude, snapshotAt: null }
      : null;
  }, [centerLatitude, centerLongitude, centerSource, preview, zone]);

  useEffect(() => {
    if (!onPreviewChange) {
      return;
    }

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

  const handleSave = form.handleSubmit(async (values) => {
    if (!vehicleId) return;
    try {
      await upsertMutation.mutateAsync(toAllowedZonePayload(values));
      notificationUtils.success('Đã lưu vùng cho phép');
      onOpenChange(false);
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
      onOpenChange(false);
    } catch (error) {
      notificationUtils.error('Gỡ vùng cho phép thất bại', getApiErrorMessage(error, 'Không thể gỡ vùng cho phép.'));
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,34rem)] gap-0 px-0">
          <SheetHeader className="border-b px-5 pb-4">
            <SheetTitle>Thiết lập vùng cho phép</SheetTitle>
            <SheetDescription>
              {vehicleLabel ?? vehicleId ?? 'Phương tiện chưa xác định'} chỉ có một vùng hoạt động tại một thời điểm.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <AllowedZoneRadiusField value={radiusMeters} onChange={(value) => form.setValue('radiusMeters', value, { shouldDirty: true })} disabled={!canEdit} />

            <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <Label>Nguồn lấy tâm vùng</Label>
              <Controller
                control={form.control}
                name="centerSource"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="vehicle_position" id="allowed-zone-center-vehicle" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="allowed-zone-center-vehicle">Theo vị trí telemetry gần nhất</Label>
                        <p className="text-xs text-muted-foreground">Dùng snapshot do backend xác định để giữ cùng semantics stale-warning.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="map_pick" id="allowed-zone-center-map" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="allowed-zone-center-map">Chọn tay trên bản đồ</Label>
                        <p className="text-xs text-muted-foreground">Dùng khi muốn cố định khu vực khác với vị trí hiện tại của xe.</p>
                      </div>
                    </label>
                  </RadioGroup>
                )}
              />

              {centerSource === 'map_pick' ? (
                <div className="space-y-3 rounded-xl border bg-background p-3">
                  {allowMapPick ? (
                    <Button type="button" variant={mapPickArmed ? 'secondary' : 'outline'} disabled={!canEdit} onClick={() => setMapPickArmed((value) => !value)}>
                      <MapPin className="mr-2 h-4 w-4" />
                      {mapPickArmed ? 'Đang chờ click trên bản đồ' : 'Chọn tâm trên bản đồ'}
                    </Button>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="allowed-zone-latitude">Vĩ độ</Label>
                      <Input id="allowed-zone-latitude" type="number" inputMode="decimal" step="0.000001" disabled={!canEdit} value={centerLatitude ?? ''} onChange={(event) => form.setValue('centerLatitude', event.target.value === '' ? null : Number(event.target.value), { shouldValidate: true, shouldDirty: true })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="allowed-zone-longitude">Kinh độ</Label>
                      <Input id="allowed-zone-longitude" type="number" inputMode="decimal" step="0.000001" disabled={!canEdit} value={centerLongitude ?? ''} onChange={(event) => form.setValue('centerLongitude', event.target.value === '' ? null : Number(event.target.value), { shouldValidate: true, shouldDirty: true })} />
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
                        className={cn(
                          'rounded-xl border px-3 py-2 text-left',
                          form.watch('alertMode') === option.value && 'border-primary bg-primary/5',
                        )}
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
                  <Label htmlFor="allowed-zone-cooldown">Cooldown cảnh báo (giây)</Label>
                  <Input id="allowed-zone-cooldown" type="number" min={0} step={30} disabled={!canEdit} value={form.watch('cooldownSec')} onChange={(event) => form.setValue('cooldownSec', Math.max(0, Number(event.target.value || 0)), { shouldDirty: true })} />
                </div>
              </div>
            </details>
          </div>

          <SheetFooter className="border-t px-5 pt-4">
            {zone ? (
              <Button type="button" variant="outline" disabled={!canEdit || deleteMutation.isPending} onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Gỡ vùng hiện tại
              </Button>
            ) : <div />}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
            <Button type="button" disabled={!vehicleId || !canEdit || upsertMutation.isPending || zoneQuery.isLoading || previewQuery.isLoading} onClick={handleSave}>
              {upsertMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu vùng cho phép
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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


