'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe2, Network } from 'lucide-react';

interface UserCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: FormState) => Promise<void>;
  submitting: boolean;
  allDevices: Device.DeviceDto[];
}

type FormState = {
  username: string;
  password: string;
  full_name: string;
  role: User.UserDto['role'];
  deviceAccessMode: 'all' | 'custom';
  deviceIds: string[];
};

const defaultForm: FormState = {
  username: '',
  password: '',
  full_name: '',
  role: 'user',
  deviceAccessMode: 'all',
  deviceIds: []
};

export function UserCreateModal({ open, onClose, onSubmit, submitting, allDevices }: UserCreateModalProps) {
  const [form, setForm] = React.useState<FormState>(defaultForm);

  React.useEffect(() => {
    if (!open) {
      setForm(defaultForm);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm(defaultForm);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm người dùng</DialogTitle>
          <DialogDescription>Tạo tài khoản mới với vai trò phù hợp.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 pt-2'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div className='space-y-1'>
                <Label>Mật khẩu</Label>
                <Input
                  type='password'
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <Label>Họ tên</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className='space-y-1'>
                <Label>Vai trò</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm((f) => ({ ...f, role: val as User.UserDto['role'] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Chọn vai trò' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='root'>Root</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                    <SelectItem value='user'>User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-2'>
              <Label>Phạm vi thiết bị được phép xem</Label>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant={form.deviceAccessMode === 'all' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setForm((f) => ({ ...f, deviceAccessMode: 'all', deviceIds: [] }))}
                >
                  <Globe2 className='mr-1 h-4 w-4' />
                  Tất cả thiết bị
                </Button>
                <Button
                  type='button'
                  variant={form.deviceAccessMode === 'custom' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setForm((f) => ({ ...f, deviceAccessMode: 'custom' }))}
                >
                  <Network className='mr-1 h-4 w-4' />
                  Thiết bị cụ thể
                </Button>
              </div>
              {form.deviceAccessMode === 'custom' && (
                <div className='mt-2 max-h-52 space-y-1 overflow-y-auto rounded-md border p-2 text-xs'>
                  {allDevices.length === 0 ? (
                    <div className='text-muted-foreground'>Chưa có thiết bị nào để gán.</div>
                  ) : (
                    allDevices.map((d) => {
                      const checked = form.deviceIds.includes(d.device_id);
                      return (
                        <label
                          key={d.device_id}
                          className='flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/70'
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setForm((prev) => {
                                const current = new Set(prev.deviceIds);
                                if (value) {
                                  current.add(d.device_id);
                                } else {
                                  current.delete(d.device_id);
                                }
                                return { ...prev, deviceIds: Array.from(current) };
                              });
                            }}
                          />
                          <span className='truncate'>
                            <span className='font-medium'>{d.device_name}</span>{' '}
                            <span className='text-muted-foreground'>({d.device_id})</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className='pt-4'>
            <Button variant='outline' type='button' onClick={onClose}>
              Hủy
            </Button>
            <Button type='submit' disabled={submitting}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

