'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { zoneServices } from '@/lib/api/zones';
import { useVehicleAllowedZone, useVehicleAllowedZonePreview } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import {
  allowedZoneAlertModeOptions,
  allowedZoneFormSchema,
  createAllowedZoneFormDefaults,
  describeBoundarySelections,
  formatAllowedZoneRadius,
  getZoneTypeLabel,
  toAllowedZonePayload,
  type AllowedZoneFormValues,
} from '@/features/geofences/lib/allowed-zone-form';
import { AllowedZoneRadiusField } from '@/features/geofences/components/allowed-zone-radius-field';
import { ZoneBoundarySelector } from '@/features/geofences/components/zone-boundary-selector';
import type { ZonePreviewDraft } from '@/features/map/components/map-allowed-zone-layer';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

type MapPickValue = { latitude: number; longitude: number } | null;

const getResetKey = (zoneUpdatedAt?: string | null, previewSnapshotAt?: string | null) =>
  `${zoneUpdatedAt ?? 'none'}:${previewSnapshotAt ?? 'none'}`;

const getBoundaryResolveKey = (values: AllowedZoneFormValues) =>
  values.boundarySelections
    .map((selection) => `${selection.provider}:${selection.unitCode}`)
    .sort()
    .join('|');

export const MapAllowedZonePanel = ({
  open,
  vehicleId,
  vehicleLabel,
  canEdit,
  mapPickValue,
  onClose,
  onDirtyChange,
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
  onDirtyChange: (dirty: boolean) => void;
  onPreviewChange: (draft: ZonePreviewDraft) => void;
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
  const zoneType = form.watch('zoneType');
  const centerSource = form.watch('centerSource');
  const radiusMeters = form.watch('radiusMeters');
  const centerLatitude = form.watch('centerLatitude');
  const centerLongitude = form.watch('centerLongitude');
  const boundarySelections = form.watch('boundarySelections');
  const previewQuery = useVehicleAllowedZonePreview(
    vehicleId,
    open && previewReady && zoneQuery.isFetched && zoneType === 'circle' && centerSource === 'vehicle_position',
  );
  const preview = previewQuery.data;
  const resetKey = getResetKey(zone?.updatedAt, preview?.snapshotAt);
  const boundaryResolveKey = getBoundaryResolveKey(form.getValues());
  const resolvedBoundaryQuery = useQuery({
    queryKey: ['zone-boundary-resolve-preview', boundaryResolveKey],
    enabled: open && zoneType === 'administrative_boundary' && boundarySelections.length > 0,
    queryFn: () =>
      zoneServices.resolveBoundaries({
        selections: boundarySelections.map((selection) => ({
          provider: selection.provider,
          unitCode: selection.unitCode,
        })),
      }),
  });

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      lastResetKeyRef.current = null;
      setMapPickArmed(false);
      setPreviewReady(false);
      onDirtyChange(false);
      onPreviewChange(null);
      return;
    }

    if (initializedForOpenRef.current && lastResetKeyRef.current === resetKey) {
      return;
    }

    if (initializedForOpenRef.current && form.formState.isDirty) {
      return;
    }

    form.reset(createAllowedZoneFormDefaults(zone, preview));
    initializedForOpenRef.current = true;
    lastResetKeyRef.current = resetKey;
    setMapPickArmed(false);
    setPreviewReady(true);
  }, [form, onDirtyChange, onPreviewChange, open, preview, resetKey, zone]);

  useEffect(() => {
    onDirtyChange(open ? form.formState.isDirty : false);
  }, [form.formState.isDirty, onDirtyChange, open]);

  useEffect(() => {
    if (!mapPickValue || zoneType !== 'circle' || centerSource !== 'map_pick') {
      return;
    }

    form.setValue('centerLatitude', mapPickValue.latitude, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue('centerLongitude', mapPickValue.longitude, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setMapPickArmed(false);
  }, [centerSource, form, mapPickValue, zoneType]);

  useEffect(() => {
    if (zoneType !== 'circle' || centerSource !== 'map_pick') {
      setMapPickArmed(false);
    }
  }, [centerSource, zoneType]);

  const resolvedCenter = useMemo(() => {
    if (zoneType !== 'circle') {
      return null;
    }

    if (centerSource === 'vehicle_position') {
      if (preview) {
        return {
          latitude: preview.circleCenterLatitude,
          longitude: preview.circleCenterLongitude,
          snapshotAt: preview.snapshotAt,
        };
      }

      if (
        zone?.zoneType === 'circle' &&
        zone.circleCenterLatitude !== null &&
        zone.circleCenterLongitude !== null
      ) {
        return {
          latitude: zone.circleCenterLatitude,
          longitude: zone.circleCenterLongitude,
          snapshotAt: zone.centerSnapshotAt,
        };
      }

      return null;
    }

    return centerLatitude !== null && centerLongitude !== null
      ? { latitude: centerLatitude, longitude: centerLongitude, snapshotAt: null }
      : null;
  }, [centerLatitude, centerLongitude, centerSource, preview, zone, zoneType]);

  const resolvedBoundaryGeometry =
    zoneType === 'administrative_boundary'
      ? resolvedBoundaryQuery.data?.geometry ??
        (zone?.zoneType === 'administrative_boundary' ? zone.geometry : null)
      : null;

  useEffect(() => {
    if (!open) {
      onPreviewChange(null);
      return;
    }

    if (zoneType === 'administrative_boundary') {
      onPreviewChange({
        zoneType: 'administrative_boundary',
        geometry: resolvedBoundaryGeometry,
        isPickingCenter: false,
      });
      return;
    }

    if (!resolvedCenter) {
      onPreviewChange(null);
      return;
    }

    onPreviewChange({
      zoneType: 'circle',
      centerLatitude: resolvedCenter.latitude ?? 0,
      centerLongitude: resolvedCenter.longitude ?? 0,
      radiusMeters,
      isPickingCenter: centerSource === 'map_pick' && mapPickArmed,
    });
  }, [
    centerSource,
    mapPickArmed,
    onPreviewChange,
    open,
    radiusMeters,
    resolvedBoundaryGeometry,
    resolvedCenter,
    zoneType,
  ]);

  const resolvedWarning =
    zoneType === 'circle' && centerSource === 'vehicle_position'
      ? preview?.warning ?? zone?.warning
      : zone?.warning;

  const handleSave = form.handleSubmit(async (values) => {
    if (!vehicleId) {
      return;
    }

    if (
      values.zoneType === 'administrative_boundary' &&
      values.boundarySelections.length > 0 &&
      !resolvedBoundaryQuery.data?.geometry
    ) {
      notificationUtils.error(
        'Không thể lưu vùng',
        'Các đơn vị hành chính đã chọn chưa phân giải được dữ liệu hình học để xem trước và lưu.',
      );
      return;
    }

    try {
      await upsertMutation.mutateAsync(toAllowedZonePayload(values));
      notificationUtils.success('Đã lưu vùng');
      onSaved();
    } catch (error) {
      notificationUtils.error(
        'Lưu vùng thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật vùng cho phương tiện này.'),
      );
    }
  });

  const handleDelete = async () => {
    if (!vehicleId) {
      return;
    }

    try {
      await deleteMutation.mutateAsync();
      notificationUtils.success('Đã gỡ vùng hiện tại');
      setConfirmDeleteOpen(false);
      onDeleted();
    } catch (error) {
      notificationUtils.error(
        'Gỡ vùng thất bại',
        getApiErrorMessage(error, 'Không thể gỡ vùng hiện tại.'),
      );
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[1000] flex max-h-[78dvh] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/96 shadow-2xl backdrop-blur md:bottom-3 md:left-auto md:right-3 md:top-3 md:w-[440px] md:max-h-[calc(100dvh-5rem)]">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Vùng trên bản đồ</p>
              <Badge variant="outline">{zone ? 'Đã cấu hình' : 'Chưa có vùng'}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {vehicleLabel ?? vehicleId ?? 'Phương tiện chưa xác định'} · mỗi xe chỉ có một vùng đang hoạt động.
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Đóng khung vùng">
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
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Loại vùng</p>
                <p className="mt-1 font-medium">{getZoneTypeLabel(zoneType)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/10 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cấu hình</p>
                <p className="mt-1 font-medium">
                  {zoneType === 'circle'
                    ? formatAllowedZoneRadius(radiusMeters)
                    : describeBoundarySelections(boundarySelections)}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <Label>Loại vùng</Label>
              <Controller
                control={form.control}
                name="zoneType"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={(nextValue) => {
                      field.onChange(nextValue);
                      if (nextValue === 'circle') {
                        form.setValue('boundarySelections', [], { shouldDirty: true });
                      } else {
                        form.setValue('centerSource', 'vehicle_position', { shouldDirty: true });
                        form.setValue('centerLatitude', null, { shouldDirty: true });
                        form.setValue('centerLongitude', null, { shouldDirty: true });
                      }
                    }}
                    className="gap-3"
                  >
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="circle" id="map-zone-type-circle" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="map-zone-type-circle">Bán kính</Label>
                        <p className="text-xs text-muted-foreground">
                          Dùng tâm + bán kính để xác định một vùng tròn quanh xe.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="administrative_boundary" id="map-zone-type-admin" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="map-zone-type-admin">Địa lý hành chính</Label>
                        <p className="text-xs text-muted-foreground">
                          Chọn nhiều tỉnh, huyện, xã rồi hợp thành một vùng duy nhất.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                )}
              />
            </div>

            {zoneType === 'circle' ? (
              <>
                <AllowedZoneRadiusField
                  value={radiusMeters}
                  onChange={(value) => form.setValue('radiusMeters', value, { shouldDirty: true })}
                  disabled={!canEdit}
                />

                <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
                  <Label>Nguồn lấy tâm vùng</Label>
                  <Controller
                    control={form.control}
                    name="centerSource"
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                        <label className="flex items-start gap-3 rounded-xl border p-3">
                          <RadioGroupItem value="vehicle_position" id="map-zone-center-vehicle" disabled={!canEdit} />
                          <div className="space-y-1">
                            <Label htmlFor="map-zone-center-vehicle">Theo vị trí telemetry gần nhất</Label>
                            <p className="text-xs text-muted-foreground">
                              Dùng snapshot backend để giữ đúng stale-warning.
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 rounded-xl border p-3">
                          <RadioGroupItem value="map_pick" id="map-zone-center-map" disabled={!canEdit} />
                          <div className="space-y-1">
                            <Label htmlFor="map-zone-center-map">Chọn tay trên bản đồ</Label>
                            <p className="text-xs text-muted-foreground">
                              Click trực tiếp trên map để đặt lại tâm vùng.
                            </p>
                          </div>
                        </label>
                      </RadioGroup>
                    )}
                  />

                  {centerSource === 'map_pick' ? (
                    <div className="space-y-3 rounded-xl border bg-background p-3">
                      <Button
                        type="button"
                        variant={mapPickArmed ? 'secondary' : 'outline'}
                        disabled={!canEdit}
                        onClick={() => setMapPickArmed((value) => !value)}
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        {mapPickArmed ? 'Đang chờ click trên bản đồ' : 'Chọn tâm trên bản đồ'}
                      </Button>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="map-zone-latitude">Vĩ độ</Label>
                          <Input
                            id="map-zone-latitude"
                            type="number"
                            inputMode="decimal"
                            step="0.000001"
                            disabled={!canEdit}
                            value={centerLatitude ?? ''}
                            onChange={(event) =>
                              form.setValue(
                                'centerLatitude',
                                event.target.value === '' ? null : Number(event.target.value),
                                { shouldValidate: true, shouldDirty: true },
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="map-zone-longitude">Kinh độ</Label>
                          <Input
                            id="map-zone-longitude"
                            type="number"
                            inputMode="decimal"
                            step="0.000001"
                            disabled={!canEdit}
                            value={centerLongitude ?? ''}
                            onChange={(event) =>
                              form.setValue(
                                'centerLongitude',
                                event.target.value === '' ? null : Number(event.target.value),
                                { shouldValidate: true, shouldDirty: true },
                              )
                            }
                          />
                        </div>
                      </div>
                      <p className="text-xs text-destructive">
                        {form.formState.errors.centerLatitude?.message ??
                          form.formState.errors.centerLongitude?.message}
                      </p>
                    </div>
                  ) : null}
                </div>

                {resolvedCenter ? (
                  <div className="rounded-2xl border bg-muted/10 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tâm vùng hiện dùng</p>
                    <p className="mt-1 font-medium">
                      {resolvedCenter.latitude?.toFixed(6)}, {resolvedCenter.longitude?.toFixed(6)}
                    </p>
                    {resolvedCenter.snapshotAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Snapshot {formatDateTime(resolvedCenter.snapshotAt)} · {formatRelative(resolvedCenter.snapshotAt)}
                      </p>
                    ) : null}
                    {centerSource === 'vehicle_position' && previewQuery.isLoading ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Đang lấy snapshot telemetry mới nhất...
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <ZoneBoundarySelector
                  value={boundarySelections}
                  disabled={!canEdit}
                  onChange={(next) =>
                    form.setValue('boundarySelections', next, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />

                <div className="rounded-2xl border bg-muted/10 p-4 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Xem trước hợp vùng</p>
                  <p className="mt-1 font-medium">
                    {boundarySelections.length > 0
                      ? describeBoundarySelections(boundarySelections)
                      : 'Chưa có đơn vị nào được chọn'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {resolvedBoundaryQuery.isFetching
                      ? 'Đang phân giải dữ liệu hình học từ bộ nhớ đệm địa giới...'
                      : resolvedBoundaryGeometry
                        ? 'Dữ liệu hình học đã sẵn sàng để xem trước và lưu.'
                        : 'Chưa có dữ liệu hình học để xem trước.'}
                  </p>
                  {form.formState.errors.boundarySelections?.message ? (
                    <p className="mt-2 text-xs text-destructive">
                      {String(form.formState.errors.boundarySelections.message)}
                    </p>
                  ) : null}
                </div>
              </>
            )}

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
                  <Label htmlFor="map-zone-cooldown">Cooldown cảnh báo (giây)</Label>
                  <Input
                    id="map-zone-cooldown"
                    type="number"
                    min={0}
                    step={30}
                    disabled={!canEdit}
                    value={form.watch('cooldownSec')}
                    onChange={(event) =>
                      form.setValue('cooldownSec', Math.max(0, Number(event.target.value || 0)), {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              </div>
            </details>
          </div>
        </ScrollArea>

        <div className="border-t bg-background/96 px-4 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            {zone ? (
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || deleteMutation.isPending}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Gỡ vùng hiện tại
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              disabled={
                !vehicleId ||
                !canEdit ||
                upsertMutation.isPending ||
                zoneQuery.isLoading ||
                previewQuery.isLoading ||
                resolvedBoundaryQuery.isFetching
              }
              onClick={handleSave}
            >
              {upsertMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {zone ? 'Cập nhật vùng' : 'Lưu vùng'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Gỡ vùng hiện tại"
        description="Thao tác này sẽ tắt vùng đang hoạt động của phương tiện này."
        confirmLabel="Gỡ vùng"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};
