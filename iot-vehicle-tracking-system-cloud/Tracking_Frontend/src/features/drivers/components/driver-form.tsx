'use client';

import { useEffect, useState } from 'react';
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

interface DriverFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: any;
  onSubmit: (values: any) => void;
  isPending?: boolean;
}

const EMPTY_FORM = {
  driverCode: '',
  fullName: '',
  phone: '',
  email: '',
  licenseNumber: '',
  licenseType: '',
  licenseExpiry: '',
  dateOfBirth: '',
  address: '',
  status: 'active',
  notes: '',
};

export const DriverForm = ({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isPending = false,
}: DriverFormProps) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setLocalErrors({});
      return;
    }

    if (!defaultValues) {
      setForm(EMPTY_FORM);
      setLocalErrors({});
      return;
    }

    setForm({
      driverCode: defaultValues.driverCode ?? '',
      fullName: defaultValues.fullName ?? '',
      phone: defaultValues.phone ?? '',
      email: defaultValues.email ?? '',
      licenseNumber: defaultValues.licenseNumber ?? '',
      licenseType: defaultValues.licenseType ?? '',
      licenseExpiry: defaultValues.licenseExpiry ? defaultValues.licenseExpiry.split('T')[0] : '',
      dateOfBirth: defaultValues.dateOfBirth ? defaultValues.dateOfBirth.split('T')[0] : '',
      address: defaultValues.address ?? '',
      status: defaultValues.status ?? 'active',
      notes: defaultValues.notes ?? '',
    });
    setLocalErrors({});
  }, [defaultValues, open]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.driverCode.trim()) errors.driverCode = 'Mã tài xế là bắt buộc';
    if (!form.fullName.trim()) errors.fullName = 'Họ và tên là bắt buộc';
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật tài xế' : 'Thêm tài xế'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="driver-code">Mã tài xế</Label>
            <Input
              id="driver-code"
              placeholder="Ví dụ: DRV-001"
              autoCapitalize="characters"
              spellCheck={false}
              value={form.driverCode}
              disabled={Boolean(defaultValues?.id)}
              className={localErrors.driverCode ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, driverCode: event.target.value }))}
            />
            {localErrors.driverCode ? (
              <p role="alert" className="text-sm text-destructive">{localErrors.driverCode}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-full-name">Họ và tên</Label>
            <Input
              id="driver-full-name"
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={form.fullName}
              className={localErrors.fullName ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, fullName: event.target.value }))}
            />
            {localErrors.fullName ? (
              <p role="alert" className="text-sm text-destructive">{localErrors.fullName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-phone">Số điện thoại</Label>
            <Input
              id="driver-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901234567"
              value={form.phone}
              onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-email">Email</Label>
            <Input
              id="driver-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="driver@fleet.vn"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-license-number">Số GPLX</Label>
            <Input
              id="driver-license-number"
              placeholder="Nhập số giấy phép lái xe"
              value={form.licenseNumber}
              onChange={(event) =>
                setForm((state) => ({ ...state, licenseNumber: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-license-type">Hạng GPLX</Label>
            <Select
              value={form.licenseType || 'none'}
              onValueChange={(value) =>
                setForm((state) => ({ ...state, licenseType: value === 'none' ? '' : value }))
              }
            >
              <SelectTrigger id="driver-license-type">
                <SelectValue placeholder="Chọn hạng GPLX" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa xác định</SelectItem>
                <SelectItem value="A1">A1</SelectItem>
                <SelectItem value="A2">A2</SelectItem>
                <SelectItem value="B1">B1</SelectItem>
                <SelectItem value="B2">B2</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="FC">FC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-license-expiry">Ngày hết hạn GPLX</Label>
            <Input
              id="driver-license-expiry"
              type="date"
              value={form.licenseExpiry}
              onChange={(event) =>
                setForm((state) => ({ ...state, licenseExpiry: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-birth-date">Ngày sinh</Label>
            <Input
              id="driver-birth-date"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) =>
                setForm((state) => ({ ...state, dateOfBirth: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="driver-address">Địa chỉ</Label>
            <Input
              id="driver-address"
              autoComplete="street-address"
              placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1"
              value={form.address}
              onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver-status">Trạng thái</Label>
            <Select value={form.status} onValueChange={(value) => setForm((state) => ({ ...state, status: value }))}>
              <SelectTrigger id="driver-status">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                <SelectItem value="suspended">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="driver-notes">Ghi chú</Label>
            <Textarea
              id="driver-notes"
              placeholder="Ghi chú về ca trực, tuyến phụ trách hoặc lưu ý đặc biệt"
              value={form.notes}
              onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isPending} onClick={handleSubmit}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu tài xế
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
