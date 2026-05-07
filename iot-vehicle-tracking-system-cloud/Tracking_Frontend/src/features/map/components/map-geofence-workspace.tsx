'use client';

import { useState } from 'react';
import { MapPinned, PencilLine, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { DevicePosition } from '@/features/map/types';
import type { MapGeofenceDraft, MapGeofenceRecord } from './map-geofence-types';

const TRIGGER_LABELS: Record<MapGeofenceRecord['triggerOn'], string> = {
  enter: 'Khi đi vào',
  exit: 'Khi đi ra',
  both: 'Cả hai chiều',
};

const clampRadiusKm = (value: number) => {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return value;
};

const toRadiusKm = (value: number) => Math.max(value / 1000, 1);

const toRadiusLabel = (value: number) => {
  const radiusKm = toRadiusKm(value);
  return radiusKm >= 10
    ? `${radiusKm.toLocaleString('vi-VN', {
        maximumFractionDigits: Number.isInteger(radiusKm) ? 0 : 1,
      })} km`
    : `${radiusKm} km`;
};

const CompactHint = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border bg-muted/10 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
    {children}
  </div>
);

const GeofenceSummaryCard = ({
  geofence,
  onEdit,
  onDelete,
  isDeleting,
}: {
  geofence: MapGeofenceRecord;
  onEdit: (geofence: MapGeofenceRecord) => void;
  onDelete: (geofence: MapGeofenceRecord) => void;
  isDeleting: boolean;
}) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border bg-background px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{geofence.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {toRadiusLabel(Number(geofence.radiusMeters ?? 0))} · {TRIGGER_LABELS[geofence.triggerOn]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => onEdit(geofence)}>
              <PencilLine className="mr-2 h-4 w-4" />
              Sửa
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={() => setConfirmDeleteOpen(true)}
              aria-label={
                geofence.name ? `Xoá vùng ${geofence.name}` : 'Xoá vùng giám sát'
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={geofence.isActive ? 'secondary' : 'outline'}>
            {geofence.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
          </Badge>
          <Badge variant="outline">{geofence.vehicleIds?.length ?? 0} xe được gán</Badge>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Xoá vùng giám sát"
        description={
          geofence.name
            ? `Vùng "${geofence.name}" sẽ bị xoá khỏi bản đồ và danh sách quản lý.`
            : 'Vùng này sẽ bị xoá khỏi bản đồ và danh sách quản lý.'
        }
        confirmLabel="Xoá vùng"
        variant="destructive"
        isPending={isDeleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          onDelete(geofence);
        }}
      />
    </>
  );
};

export const MapGeofenceWorkspace = ({
  open,
  geofences,
  draft,
  selectedDevice,
  isSaving,
  onClose,
  onStartCreate,
  onDraftChange,
  onEdit,
  onDelete,
  onCancelDraft,
  onSave,
  isDeleting = false,
  onSeedFromSelectedDevice,
}: {
  open: boolean;
  geofences: MapGeofenceRecord[];
  draft: MapGeofenceDraft | null;
  selectedDevice: DevicePosition | null;
  isSaving: boolean;
  onClose: () => void;
  onStartCreate: () => void;
  onDraftChange: (draft: MapGeofenceDraft) => void;
  onEdit: (geofence: MapGeofenceRecord) => void;
  onDelete: (geofence: MapGeofenceRecord) => void;
  onCancelDraft: () => void;
  onSave: () => void;
  isDeleting?: boolean;
  onSeedFromSelectedDevice: () => void;
}) => {
  if (!open) {
    return null;
  }

  const selectedDeviceLabel = selectedDevice ? selectedDevice.vehiclePlate ?? selectedDevice.deviceName : null;
  const hasSelectedDevice = Boolean(selectedDevice);
  const circleGeofences = geofences.filter((item) => item.geofenceType === 'circle');

  const updateDraft = (patch: Partial<MapGeofenceDraft>) => {
    if (!draft) {
      return;
    }
    onDraftChange({ ...draft, ...patch });
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[var(--layer-map-overlay)] flex max-h-[78dvh] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/96 shadow-2xl backdrop-blur md:top-3 md:bottom-3 md:left-auto md:w-[420px] md:max-h-[calc(100dvh-5rem)]">
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Vùng giám sát trên bản đồ</p>
            <Badge variant="outline">{circleGeofences.length} vùng bán kính</Badge>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Đóng vùng giám sát">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {draft ? (
        <>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {draft.source === 'create' ? 'Soạn vùng bán kính mới' : 'Chỉnh vùng bán kính'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Tập trung vào 4 quyết định chính: tên, bán kính, kiểu cảnh báo và tâm vùng.
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{toRadiusLabel(draft.radiusMeters)}</Badge>
                </div>
              </div>

              <CompactHint>
                {selectedDevice
                  ? `Xe đang chọn: ${selectedDeviceLabel} · ${selectedDevice.lat.toFixed(5)}, ${selectedDevice.lon.toFixed(5)}. Có thể dùng xe này làm tâm khởi tạo rồi tinh chỉnh thêm.`
                  : 'Chưa chọn xe. Hệ thống giữ tâm hiện tại của bản đồ hoặc tâm đang được chỉnh trong bản nháp này.'}
              </CompactHint>

              <div className="space-y-2">
                <label className="text-xs font-medium">Tên vùng giám sát</label>
                <Input
                  value={draft.name}
                  placeholder="Ví dụ: Depot quận 7"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
              </div>

              <div className="space-y-3 rounded-2xl border bg-background px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium">Bán kính ưu tiên</label>
                  <Badge variant="outline">{toRadiusLabel(draft.radiusMeters)}</Badge>
                </div>
                {(() => {
                  const radiusKm = clampRadiusKm(toRadiusKm(draft.radiusMeters));
                  const sliderRadiusKm = Math.min(radiusKm, 500);
                  const isBeyondSlider = radiusKm > 500;

                  return (
                    <>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        value={Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1)}
                        onChange={(event) => {
                          const nextKm = clampRadiusKm(Number(event.target.value || 1));
                          updateDraft({ radiusMeters: Math.round(nextKm * 1000) });
                        }}
                      />
                      <Slider
                        min={1}
                        max={500}
                        step={1}
                        value={[sliderRadiusKm]}
                        onValueChange={(value) =>
                          updateDraft({ radiusMeters: Math.round((value[0] ?? 1) * 1000) })
                        }
                      />
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>1 km</span>
                        <span>{isBeyondSlider ? '500 km+' : `${sliderRadiusKm} km`}</span>
                        <span>500 km</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-3 rounded-2xl border bg-background px-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Kiểu cảnh báo</label>
                  <Select
                    value={draft.triggerOn}
                    onValueChange={(value: MapGeofenceDraft['triggerOn']) =>
                      updateDraft({ triggerOn: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kiểu cảnh báo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enter">Khi đi vào</SelectItem>
                      <SelectItem value="exit">Khi đi ra</SelectItem>
                      <SelectItem value="both">Cả hai chiều</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Kích hoạt vùng</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">Tắt để dừng phát cảnh báo từ vùng này.</p>
                  </div>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(value) => updateDraft({ isActive: value })}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border bg-background px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Tâm hiện tại</p>
                    <p className="mt-2 break-all text-base font-semibold text-foreground">
                      {draft.centerLatitude.toFixed(6)}, {draft.centerLongitude.toFixed(6)}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {draft.isPickingCenter
                        ? 'Chạm trực tiếp lên bản đồ để chốt tâm mới. Marker và vùng xem trước sẽ cập nhật ngay.'
                        : 'Bật chế độ chọn tâm rồi bấm trực tiếp trên bản đồ nếu cần đổi nhanh vị trí trung tâm.'}
                    </p>
                  </div>
                  <Badge variant={draft.isPickingCenter ? 'default' : 'outline'} className="shrink-0">
                    {draft.isPickingCenter ? 'Đang chọn tâm' : 'Đã có tâm'}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant={draft.isPickingCenter ? 'default' : 'outline'}
                    className="w-full justify-center sm:justify-start"
                    onClick={() => updateDraft({ isPickingCenter: !draft.isPickingCenter })}
                  >
                    {draft.isPickingCenter ? 'Hủy chọn tâm trên bản đồ' : 'Chọn tâm trên bản đồ'}
                  </Button>
                  {hasSelectedDevice ? (
                    <Button type="button" variant="ghost" className="w-full justify-center sm:justify-start" onClick={onSeedFromSelectedDevice}>
                      <MapPinned className="mr-2 h-4 w-4" />
                      Dùng xe làm tâm
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Mô tả</label>
                <Textarea
                  value={draft.description}
                  placeholder="Ghi chú phạm vi, nhóm vận hành hoặc lý do cần giám sát."
                  onChange={(event) => updateDraft({ description: event.target.value })}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="border-t bg-background/96 px-5 py-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onCancelDraft}>
                Hủy chỉnh
              </Button>
              <Button onClick={onSave} disabled={isSaving || draft.name.trim().length < 2}>
                {isSaving ? 'Đang lưu...' : draft.source === 'create' ? 'Lưu vùng mới' : 'Cập nhật vùng'}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            <div className="rounded-2xl border bg-muted/10 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Tạo nhanh
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full justify-start"
                  onClick={hasSelectedDevice ? onSeedFromSelectedDevice : onStartCreate}
                >
                  {hasSelectedDevice ? <MapPinned className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {hasSelectedDevice ? 'Tạo vùng theo xe đang chọn' : 'Tạo vùng tại tâm bản đồ'}
                </Button>
                {hasSelectedDevice ? (
                  <Button variant="outline" className="w-full justify-start" onClick={onStartCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Hoặc tạo từ tâm bản đồ hiện tại
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Danh sách vùng bán kính</p>
                <Badge variant="outline">{circleGeofences.length} vùng</Badge>
              </div>

              {circleGeofences.length > 0 ? (
                circleGeofences.map((geofence) => (
                  <GeofenceSummaryCard
                    key={geofence.id}
                    geofence={geofence}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Chưa có vùng bán kính nào. Bấm nút tạo mới để bắt đầu.
                </div>
              )}
            </div>

            <Button asChild variant="ghost" className="w-full justify-start px-0 text-xs text-muted-foreground">
              <Link href="/dashboard/zones">Mở trang vùng giám sát đầy đủ</Link>
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
