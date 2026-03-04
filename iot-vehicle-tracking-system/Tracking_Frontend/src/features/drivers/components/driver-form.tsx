'use client';
import { useEffect, useState } from 'react';
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
}

export const DriverForm = ({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
}: DriverFormProps) => {
  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    if (!defaultValues) {
      setForm({
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
      });
      return;
    }
    setForm({
      driverCode: defaultValues.driverCode ?? '',
      fullName: defaultValues.fullName ?? '',
      phone: defaultValues.phone ?? '',
      email: defaultValues.email ?? '',
      licenseNumber: defaultValues.licenseNumber ?? '',
      licenseType: defaultValues.licenseType ?? '',
      licenseExpiry: defaultValues.licenseExpiry
        ? defaultValues.licenseExpiry.split('T')[0]
        : '',
      dateOfBirth: defaultValues.dateOfBirth
        ? defaultValues.dateOfBirth.split('T')[0]
        : '',
      address: defaultValues.address ?? '',
      status: defaultValues.status ?? 'active',
      notes: defaultValues.notes ?? '',
    });
  }, [defaultValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? 'Cập nhật tài xế' : 'Thêm tài xế'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Mã tài xế *</Label>
            <Input
              placeholder="VD: DRV-001"
              value={form.driverCode}
              onChange={(e) => setForm((s) => ({ ...s, driverCode: e.target.value }))}
              disabled={!!defaultValues?.id}
            />
          </div>
          <div className="space-y-1">
            <Label>Họ tên *</Label>
            <Input
              placeholder="Họ và tên"
              value={form.fullName}
              onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Số điện thoại</Label>
              <Input
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Số GPLX</Label>
              <Input
                placeholder="Số giấy phép lái xe"
                value={form.licenseNumber}
                onChange={(e) => setForm((s) => ({ ...s, licenseNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Hạng GPLX</Label>
              <Select
                value={form.licenseType}
                onValueChange={(v) => setForm((s) => ({ ...s, licenseType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hạng" />
                </SelectTrigger>
                <SelectContent>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ngày hết hạn GPLX</Label>
              <Input
                type="date"
                value={form.licenseExpiry}
                onChange={(e) => setForm((s) => ({ ...s, licenseExpiry: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Ngày sinh</Label>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((s) => ({ ...s, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Địa chỉ</Label>
            <Input
              placeholder="Địa chỉ"
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Trạng thái</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                <SelectItem value="suspended">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ghi chú</Label>
            <Textarea
              placeholder="Ghi chú"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => onSubmit(form)}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
