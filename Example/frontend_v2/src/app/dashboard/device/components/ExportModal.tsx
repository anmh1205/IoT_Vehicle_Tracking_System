'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export function ExportModal({
  open,
  onClose,
  deviceName,
  onExport
}: {
  open: boolean;
  onClose: () => void;
  deviceName: string;
  onExport: (period: Period, startDate?: string, endDate?: string) => Promise<void>;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      if (selectedPeriod === 'custom') {
        await onExport(selectedPeriod, startDate, endDate);
      } else {
        await onExport(selectedPeriod);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSelectedPeriod('today');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu {deviceName}</DialogTitle>
        </DialogHeader>
        <div className='space-y-3 text-sm'>
          <div className='flex flex-wrap gap-2'>
            {(['today', 'week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
              <Button
                key={p}
                size='sm'
                variant={selectedPeriod === p ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod(p)}
              >
                {p === 'today'
                  ? 'Hôm nay'
                  : p === 'week'
                  ? 'Tuần này'
                  : p === 'month'
                  ? 'Tháng này'
                  : p === 'quarter'
                  ? 'Quý này'
                  : 'Năm nay'}
              </Button>
            ))}
            <Button
              size='sm'
              variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('custom')}
            >
              Tùy chỉnh
            </Button>
          </div>

          {selectedPeriod === 'custom' && (
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs text-muted-foreground'>Từ ngày</label>
                <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className='text-xs text-muted-foreground'>Đến ngày</label>
                <Input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={resetAndClose}>
            Hủy
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || (selectedPeriod === 'custom' && (!startDate || !endDate))}
          >
            {loading ? 'Đang xuất...' : 'Xuất dữ liệu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

