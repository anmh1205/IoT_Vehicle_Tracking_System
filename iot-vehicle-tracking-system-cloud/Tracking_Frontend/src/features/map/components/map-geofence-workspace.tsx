'use client';

import { MapPinned, PencilLine, Plus, X } from 'lucide-react';
import Link from 'next/link';
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

const toRadiusLabel = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} km` : `${value} m`;

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
  onCancelDraft,
  onSave,
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
  onCancelDraft: () => void;
  onSave: () => void;
  onSeedFromSelectedDevice: () => void;
}) => {
  if (!open) {
    return null;
  }

  const updateDraft = (patch: Partial<MapGeofenceDraft>) => {
    if (!draft) {
      return;
    }

    onDraftChange({ ...draft, ...patch });
  };

  const circleGeofences = geofences.filter((item) => item.geofenceType === 'circle');
  const nonCircleCount = geofences.length - circleGeofences.length;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[1000] max-h-[70dvh] rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur md:bottom-3 md:left-auto md:top-3 md:right-3 md:max-h-none md:w-[380px]">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
        <div>
          <p className="text-sm font-semibold">Vùng giám sát trên bản đồ</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tạo hoặc chỉnh geofence bán kính ngay trên map, không cần đổi sang màn hình khác.
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Đóng vùng giám sát">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[calc(70dvh-5rem)] md:max-h-[calc(100dvh-8rem)]">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onStartCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo vùng bán kính
            </Button>
            <Button variant="outline" onClick={onSeedFromSelectedDevice} disabled={!selectedDevice}>
              <MapPinned className="mr-2 h-4 w-4" />
              Dùng xe đã chọn
            </Button>
          </div>

          <div className="rounded-xl border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            {selectedDevice
              ? `Xe đang chọn: ${selectedDevice.deviceName} · ${selectedDevice.lat.toFixed(5)}, ${selectedDevice.lon.toFixed(5)}`
              : 'Chưa chọn xe nào. Có thể tạo vùng bằng tâm bản đồ hiện tại rồi bấm Chọn tâm trên bản đồ.'}
          </div>

          {draft ? (
            <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {draft.source === 'create' ? 'Soạn vùng bán kính mới' : 'Chỉnh vùng bán kính'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bật chế độ chọn tâm rồi nhấn trực tiếp lên map để đặt lại vị trí trung tâm.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onCancelDraft}>
                  Hủy
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Tên vùng giám sát</label>
                <Input
                  value={draft.name}
                  placeholder="Ví dụ: Depot quận 7"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Bán kính</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={draft.radiusMeters}
                    onChange={(event) =>
                      updateDraft({ radiusMeters: Math.max(Number(event.target.value || 0), 50) })
                    }
                  />
                  <Slider
                    min={100}
                    max={5000}
                    step={50}
                    value={[draft.radiusMeters]}
                    onValueChange={(value) =>
                      updateDraft({ radiusMeters: value[0] ?? draft.radiusMeters })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">{toRadiusLabel(draft.radiusMeters)}</p>
                </div>

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

                  <div className="flex items-center justify-between rounded-xl border bg-background/70 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Kích hoạt vùng</p>
                      <p className="text-[11px] text-muted-foreground">Tắt để ẩn khỏi luồng cảnh báo</p>
                    </div>
                    <Switch
                      checked={draft.isActive}
                      onCheckedChange={(value) => updateDraft({ isActive: value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-background/70 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Tâm hiện tại</p>
                  <p className="mt-1 text-sm font-semibold">
                    {draft.centerLatitude.toFixed(6)}, {draft.centerLongitude.toFixed(6)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={draft.isPickingCenter ? 'default' : 'outline'}
                  className="h-auto justify-start px-3 py-2.5 text-left"
                  onClick={() => updateDraft({ isPickingCenter: !draft.isPickingCenter })}
                >
                  <div>
                    <p className="text-sm font-medium">Chọn tâm trên bản đồ</p>
                    <p className="text-xs opacity-80">
                      {draft.isPickingCenter
                        ? 'Đang chờ một cú nhấn trên map để đặt tâm mới.'
                        : 'Bật lên để nhấn trực tiếp vào bản đồ và thay tâm.'}
                    </p>
                  </div>
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Mô tả</label>
                <Textarea
                  value={draft.description}
                  placeholder="Ghi chú phạm vi, nhóm vận hành hoặc lý do cần giám sát."
                  onChange={(event) => updateDraft({ description: event.target.value })}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={onCancelDraft}>
                  Hủy chỉnh
                </Button>
                <Button onClick={onSave} disabled={isSaving || draft.name.trim().length < 2}>
                  {isSaving ? 'Đang lưu...' : draft.source === 'create' ? 'Lưu vùng mới' : 'Cập nhật vùng'}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Danh sách vùng bán kính</p>
              <span className="text-xs text-muted-foreground">{circleGeofences.length} vùng</span>
            </div>

            <div className="space-y-2">
              {circleGeofences.length > 0 ? (
                circleGeofences.map((geofence) => (
                  <div key={geofence.id} className="rounded-xl border bg-muted/20 px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{geofence.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {toRadiusLabel(Number(geofence.radiusMeters ?? 0))} · {TRIGGER_LABELS[geofence.triggerOn]}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onEdit(geofence)}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Sửa
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{geofence.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                      <span>•</span>
                      <span>{(geofence.vehicleIds?.length ?? 0)} xe được gán</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">
                  Chưa có geofence hình tròn nào. Bấm “Tạo vùng bán kính” để bắt đầu.
                </div>
              )}
            </div>
          </div>

          {nonCircleCount > 0 ? (
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
              Còn {nonCircleCount} vùng đa giác hoặc hình chữ nhật. Chúng vẫn hiển thị trên bản đồ,
              nhưng phần chỉnh nhanh ở đây đang ưu tiên geofence bán kính.
            </div>
          ) : null}

          <Button asChild variant="ghost" className="w-full justify-start px-0 text-xs text-muted-foreground">
            <Link href="/dashboard/operations/geofences">Mở trang vùng giám sát đầy đủ</Link>
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
