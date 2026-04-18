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
  const selectedCustomer = useMemo(
    () =>
      selectedVehicle?.customerId
        ? customers.find((customer) => customer.id === selectedVehicle.customerId) ?? null
        : null,
    [customers, selectedVehicle?.customerId],
  );

  const isSubmitDisabled =
    isPending ||
    form.vehicleId.trim().length === 0 ||
    form.title.trim().length === 0 ||
    form.maintenanceType.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tạo lịch bảo trì</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="maintenance-description">Mô tả</Label>
              <Textarea
                id="maintenance-description"
                placeholder="Mô tả triệu chứng, phạm vi xử lý hoặc yêu cầu từ điều phối"
                value={form.description}
                onChange={(event) =>
                  setForm((state) => ({ ...state, description: event.target.value }))
                }
              />
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
          </div>

          <div className="space-y-4 rounded-2xl border bg-muted/15 p-4">
            <div>
              <p className="text-sm font-semibold">Ngữ cảnh phương tiện</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Phiếu bảo trì được gắn trực tiếp vào xe đang chọn để điều phối và đối chiếu cảnh báo
                thuận hơn.
              </p>
            </div>

            {selectedVehicle ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border bg-background px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Phương tiện
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedVehicle.plateNumber
                      ? `${selectedVehicle.plateNumber} - ${selectedVehicle.vehicleId}`
                      : selectedVehicle.vehicleId}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedVehicle.brand || selectedVehicle.model
                      ? [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ')
                      : 'Chưa có dòng xe'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-background px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Khách hàng
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedCustomer?.name ?? 'Chưa liên kết khách hàng'}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-background px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Thiết bị
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedVehicle.deviceId ?? 'Chưa gắn thiết bị'}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-background px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Công tơ mét
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedVehicle.mileageKm
                        ? `${selectedVehicle.mileageKm.toLocaleString('vi-VN')} km`
                        : 'Chưa có dữ liệu'}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-background px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Hạng mục đang chọn
                    </p>
                    <p className="mt-1 font-medium">
                      {getMaintenanceTypeLabel(form.maintenanceType)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chọn một phương tiện để xem biển số, thiết bị, khách hàng và công tơ mét hiện tại.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
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
