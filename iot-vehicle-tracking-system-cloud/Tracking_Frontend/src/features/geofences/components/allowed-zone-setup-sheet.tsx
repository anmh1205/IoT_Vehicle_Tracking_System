'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Loader2, MapPin, ShieldAlert, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { zoneServices } from '@/lib/api/zones';
import { useVehicleAllowedZone, useVehicleAllowedZonePreview } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import {
  allowedZoneAlertModeOptions,
  allowedZoneFormSchema,
  createAllowedZoneFormDefaults,
  describeBoundarySelections,
  getZoneTypeLabel,
  toAllowedZonePayload,
  type AllowedZoneFormValues,
} from '@/features/geofences/lib/allowed-zone-form';
import { AllowedZoneRadiusField } from './allowed-zone-radius-field';
import { ZoneBoundarySelector } from './zone-boundary-selector';
import type { ZonePreviewDraft } from '@/features/map/components/map-allowed-zone-layer';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

type MapPickValue = { latitude: number; longitude: number } | null;

const getResetKey = (
  zoneUpdatedAt?: string | null,
  previewSnapshotAt?: string | null,
) => `${zoneUpdatedAt ?? 'none'}:${previewSnapshotAt ?? 'none'}`;

const getBoundaryResolveKey = (values: AllowedZoneFormValues) =>
  values.boundarySelections
    .map((selection) => `${selection.provider}:${selection.unitCode}`)
    .sort()
    .join('|');

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
  onPreviewChange?: (draft: ZonePreviewDraft) => void;
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
    queryKey: ['zone-boundary-sheet-preview', boundaryResolveKey],
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
      setPreviewReady(false);
      if (onPreviewChange) {
        onPreviewChange(null);
      }
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
    setPreviewReady(true);
  }, [form, onPreviewChange, open, preview, resetKey, zone]);

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
    if (!onPreviewChange) {
      return;
    }

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
      onPreviewChange(
        centerSource === 'map_pick' && mapPickArmed
          ? {
              zoneType: 'circle',
              centerLatitude: null,
              centerLongitude: null,
              radiusMeters,
              isPickingCenter: true,
            }
          : null,
      );
      return;
    }

    onPreviewChange({
      zoneType: 'circle',
      centerLatitude: resolvedCenter.latitude,
      centerLongitude: resolvedCenter.longitude,
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
      onOpenChange(false);
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
      onOpenChange(false);
    } catch (error) {
      notificationUtils.error(
        'Gỡ vùng thất bại',
        getApiErrorMessage(error, 'Không thể gỡ vùng hiện tại.'),
      );
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,36rem)] gap-0 px-0">
          <SheetHeader className="border-b px-5 pb-4">
            <SheetTitle>Thiết lập vùng</SheetTitle>
            <SheetDescription>
              {vehicleLabel ?? vehicleId ?? 'Phương tiện chưa xác định'} chỉ có một vùng hoạt động tại một thời điểm.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
                      <RadioGroupItem value="circle" id="sheet-zone-type-circle" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="sheet-zone-type-circle">Bán kính</Label>
                        <p className="text-xs text-muted-foreground">
                          Dùng tâm + bán kính để cấu hình một vùng tròn.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value="administrative_boundary" id="sheet-zone-type-admin" disabled={!canEdit} />
                      <div className="space-y-1">
                        <Label htmlFor="sheet-zone-type-admin">Địa lý hành chính</Label>
                        <p className="text-xs text-muted-foreground">
                          Tìm và chọn nhiều tỉnh, huyện, xã để hợp vùng.
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
                          <RadioGroupItem value="vehicle_position" id="sheet-zone-center-vehicle" disabled={!canEdit} />
                          <div className="space-y-1">
                            <Label htmlFor="sheet-zone-center-vehicle">Theo vị trí telemetry gần nhất</Label>
                            <p className="text-xs text-muted-foreground">
                              Dùng snapshot do backend xác định để giữ cùng stale-warning.
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 rounded-xl border p-3">
                          <RadioGroupItem value="map_pick" id="sheet-zone-center-map" disabled={!canEdit} />
                          <div className="space-y-1">
                            <Label htmlFor="sheet-zone-center-map">Chọn tay trên bản đồ</Label>
                            <p className="text-xs text-muted-foreground">
                              Dùng khi muốn cố định khu vực khác với vị trí hiện tại của xe.
                            </p>
                          </div>
                        </label>
                      </RadioGroup>
                    )}
                  />

                  {centerSource === 'map_pick' ? (
                    <div className="space-y-3 rounded-xl border bg-background p-3">
                      {allowMapPick ? (
                        <Button
                          type="button"
                          variant={mapPickArmed ? 'secondary' : 'outline'}
                          disabled={!canEdit}
                          onClick={() => setMapPickArmed((value) => !value)}
                        >
                          <MapPin className="mr-2 h-4 w-4" />
                          {mapPickArmed ? 'Đang chờ click trên bản đồ' : 'Chọn tâm trên bản đồ'}
                        </Button>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="sheet-zone-latitude">Vĩ độ</Label>
                          <Input
                            id="sheet-zone-latitude"
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
                          <Label htmlFor="sheet-zone-longitude">Kinh độ</Label>
                          <Input
                            id="sheet-zone-longitude"
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
                      {resolvedCenter.latitude.toFixed(6)}, {resolvedCenter.longitude.toFixed(6)}
                    </p>
                    {resolvedCenter.snapshotAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Snapshot {formatDateTime(resolvedCenter.snapshotAt)} · {formatRelative(resolvedCenter.snapshotAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="rounded-2xl border bg-muted/10 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Loại vùng đang chọn</p>
                      <p className="mt-1 font-medium">{getZoneTypeLabel(zoneType)}</p>
                    </div>
                    <Badge variant="outline">
                      {boundarySelections.length > 0 ? `${boundarySelections.length} đơn vị` : 'Chưa chọn'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {describeBoundarySelections(boundarySelections)}
                  </p>
                </div>

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
                    {resolvedBoundaryGeometry
                      ? 'Dữ liệu hình học đã sẵn sàng để xem trước và lưu.'
                      : 'Chưa có dữ liệu hình học để xem trước.'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {resolvedBoundaryQuery.isFetching
                      ? 'Đang phân giải dữ liệu hình học từ bộ nhớ đệm địa giới...'
                      : 'Backend sẽ hợp các đơn vị đã chọn thành một vùng duy nhất cho xe.'}
                  </p>
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
                  <Label htmlFor="sheet-zone-cooldown">Cooldown cảnh báo (giây)</Label>
                  <Input
                    id="sheet-zone-cooldown"
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

          <SheetFooter className="border-t px-5 pt-4">
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
            ) : (
              <div />
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
