'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DeviceEditModal({
  open,
  onClose,
  device,
  onUpdate
}: {
  open: boolean;
  onClose: () => void;
  device: Device.DeviceDto | null;
  onUpdate: (payload: { device_id: string; device_name: string }) => Promise<void>;
}) {
  const [deviceName, setDeviceName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDeviceName(device?.device_name || '');
  }, [device]);

  if (!device) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate({ device_id: device.device_id, device_name: deviceName });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thiết bị</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-3'>
          <div>
            <label className='text-sm text-muted-foreground'>Tên thiết bị</label>
            <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Hủy
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

