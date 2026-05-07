'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  MAINTENANCE_TYPE_OPTIONS,
  getMaintenanceTypeLabel,
} from '@/features/maintenance/maintenance-meta';

const EMPTY_FORM = {
  vehicleId: '',
  maintenanceType: 'general',
  title: '',
  description: '',
  scheduledDate: '',
  mileageAtService: '',
  nextServiceMileage: '',
  nextServiceDate: '',
  cost: '',
  serviceProvider: '',
  notes: '',
};

const AsideTile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border bg-background px-3 py-3">
    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 font-medium">{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

export const MaintenanceForm = ({
  open,
  onOpenChange,
  defaultValues,
  vehicles,
  customers,
  onSubmit,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  defaultValues?: Partial<typeof EMPTY_FORM>;
  vehicles: any[];
  customers: any[];
  onSubmit: (values: typeof EMPTY_FORM) => void;
  isPending?: boolean;
}) => {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...EMPTY_FORM,
      ...defaultValues,
    });
  }, [defaultValues, open]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.vehicleId === form.vehicleId) ?? null,
    [form.vehicleId, vehicles],
  );
  const selectedCustomer = selectedVehicle?.customerId
    ? customers.find((customer) => customer.id === selectedVehicle.customerId) ?? null
    : null;

  const isSubmitDisabled =
    isPending ||
    form.vehicleId.trim().length === 0 ||
    form.title.trim().length === 0 ||
    form.maintenanceType.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[min(96vw,1100px)] max-w-none flex-col overflow-hidden p-0 sm:w-[min(96vw,1100px)] sm:max-w-none">
        <DialogHeader className="shrink-0 border-b bg-background px-6 py-4 pr-14">
          <DialogTitle>Tạo lịch bảo trì</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_320px] xl:grid-cols-[minmax(0,1.18fr)_360px]">
            <div className="space-y-4 pr-1">
              <section className="space-y-4 rounded-2xl border bg-muted/10 p-4">
                <div>
                  <p className="text-sm font-semibold">Thông tin công việc</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gắn phiếu vào đúng xe, đúng hạng mục để điều phối và đối chiếu cảnh báo bảo trì thuận hơn.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-vehicle">Phương tiện</Label>
                  <Select
                    value={form.vehicleId}
                    onValueChange={(value) => setForm((state) => ({ ...state, vehicleId: value }))}
                  >
                    <SelectTrigger id="maintenance-vehicle">
                      <SelectValue placeholder="Chọn phương tiện cần bảo trì" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.vehicleId} value={vehicle.vehicleId}>
                          {vehicle.plateNumber
                            ? `${vehicle.plateNumber} - ${vehicle.vehicleId}`
                            : vehicle.vehicleId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-type">Loại bảo trì</Label>
                    <Select
                      value={form.maintenanceType}
                      onValueChange={(value) =>
                        setForm((state) => ({ ...state, maintenanceType: value }))
                      }
                    >
                      <SelectTrigger id="maintenance-type">
                        <SelectValue placeholder="Chọn hạng mục bảo trì" />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINTENANCE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maintenance-title">Tiêu đề công việc</Label>
                    <Input
                      id="maintenance-title"
                      placeholder="Ví dụ: Thay dầu định kỳ 25.000 km"
                      value={form.title}
                      onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance-description">Mô tả</Label>
                  <Textarea
                    id="maintenance-description"
                    className="min-h-[112px]"
                    placeholder="Mô tả triệu chứng, phạm vi xử lý hoặc yêu cầu từ điều phối"
                    value={form.description}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, description: event.target.value }))
                    }
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">Mốc xử lý và chi phí</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nhập trước mốc hẹn, km hiện tại và mốc km kế tiếp để đội vận hành không phải mở thêm trang khác.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-scheduled-date">Ngày hẹn xử lý</Label>
                    <Input
                      id="maintenance-scheduled-date"
                      type="datetime-local"
                      value={form.scheduledDate}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, scheduledDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-next-date">Ngày nhắc lần sau</Label>
                    <Input
                      id="maintenance-next-date"
                      type="date"
                      value={form.nextServiceDate}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, nextServiceDate: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-mileage">Km hiện tại</Label>
                    <Input
                      id="maintenance-mileage"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.mileageAtService}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, mileageAtService: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-next-mileage">Mốc km tiếp theo</Label>
                    <Input
                      id="maintenance-next-mileage"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.nextServiceMileage}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, nextServiceMileage: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-cost">Chi phí dự kiến</Label>
                    <Input
                      id="maintenance-cost"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.cost}
                      onChange={(event) => setForm((state) => ({ ...state, cost: event.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">Điều phối xử lý</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lưu lại gara phụ trách và ghi chú bàn giao để ca sau tiếp nhận nhanh hơn.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-provider">Đơn vị xử lý</Label>
                    <Input
                      id="maintenance-provider"
                      placeholder="Ví dụ: Thu Duc Fleet Garage"
                      value={form.serviceProvider}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, serviceProvider: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-note">Ghi chú điều phối</Label>
                    <Input
                      id="maintenance-note"
                      placeholder="Ví dụ: ưu tiên xử lý trong ca sáng"
                      value={form.notes}
                      onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4 pr-1 lg:sticky lg:top-4">
              <div className="rounded-2xl border bg-muted/15 p-4">
                <p className="text-sm font-semibold">Thông tin phương tiện</p>
              </div>

              {selectedVehicle ? (
                <div className="space-y-3 text-sm">
                  <AsideTile
                    label="Phương tiện"
                    value={
                      selectedVehicle.plateNumber
                        ? `${selectedVehicle.plateNumber} - ${selectedVehicle.vehicleId}`
                        : selectedVehicle.vehicleId
                    }
                    hint={
                      selectedVehicle.brand || selectedVehicle.model
                        ? [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ')
                        : 'Chưa có dòng xe'
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <AsideTile
                      label="Khách hàng"
                      value={selectedCustomer?.name ?? 'Chưa liên kết khách hàng'}
                    />
                    <AsideTile
                      label="Thiết bị"
                      value={selectedVehicle.deviceId ?? 'Chưa gắn thiết bị'}
                    />
                    <AsideTile
                      label="Công tơ mét"
                      value={
                        selectedVehicle.mileageKm
                          ? `${selectedVehicle.mileageKm.toLocaleString('vi-VN')} km`
                          : 'Chưa có dữ liệu'
                      }
                    />
                    <AsideTile
                      label="Hạng mục"
                      value={getMaintenanceTypeLabel(form.maintenanceType)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-dashed px-4 py-4 text-muted-foreground">
                    Chọn phương tiện để xem thông tin liên quan.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <AsideTile
                      label="Bắt buộc"
                      value="Xe, loại bảo trì, tiêu đề"
                      hint="Đủ 3 trường này mới có thể tạo phiếu."
                    />
                    <AsideTile
                      label="Tự đối chiếu"
                      value="Khách hàng, thiết bị, km"
                      hint="Hiện ra ngay sau khi chọn xe."
                    />
                    <AsideTile
                      label="Hạng mục đang chọn"
                      value={getMaintenanceTypeLabel(form.maintenanceType)}
                      hint="Dùng để nhắc đúng checklist xử lý."
                    />
                    <AsideTile
                      label="Mẹo thao tác"
                      value="Điền mốc km trước"
                      hint="Giúp dự báo lịch và cảnh báo khớp logic hơn."
                    />
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isSubmitDisabled} onClick={() => onSubmit(form)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tạo phiếu bảo trì
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
