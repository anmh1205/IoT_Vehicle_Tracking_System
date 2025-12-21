'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DeviceCreateModal({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: Device.CreateDeviceRequest) => Promise<void>;
}) {
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDeviceId('');
      setDeviceName('');
      setThreshold('');
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim() || !deviceName.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        device_id: deviceId.trim(),
        device_name: deviceName.trim(),
        vibration_threshold: threshold ? Number(threshold) : undefined
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Thêm thiết bị</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-3'>
          <div>
            <label className='text-sm text-muted-foreground'>Tên thiết bị</label>
            <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} required />
          </div>
          <div>
            <label className='text-sm text-muted-foreground'>Device ID</label>
            <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
          </div>
          <div>
            <label className='text-sm text-muted-foreground'>Ngưỡng rung (tùy chọn)</label>
            <Input type='number' value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              Hủy
            </Button>
            <Button type='submit' disabled={saving}>
              {saving ? 'Đang lưu...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

