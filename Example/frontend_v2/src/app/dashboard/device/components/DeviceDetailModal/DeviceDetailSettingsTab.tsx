'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { format } from 'date-fns';
import { notificationUtils } from '@/lib/notification';
import { DEVICE_ANIMATIONS, DEVICE_HOVER, DEVICE_RADIUS, DEVICE_SHADOWS } from '../device-design-constants';
import { Hash, Pencil, SlidersHorizontal, Activity, Clock, Calculator, Trash2, AlertTriangle } from 'lucide-react';

export function DeviceDetailSettingsTab({
  detail,
  onUpdateNameId,
  onUpdateSettings,
  onDelete
}: {
  detail: Device.DeviceDetail;
  onUpdateNameId: (deviceId: string, updates: { device_name?: string; device_id?: string }) => Promise<void>;
  onUpdateSettings: (deviceId: string, settings: { vibration_threshold?: number | null; request_interval?: number | null }) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(detail.device_name || '');
  const [deviceId, setDeviceId] = useState(detail.device_id);
  const [threshold, setThreshold] = useState<number | ''>(detail.vibration_threshold ?? '');
  const [requestInterval, setRequestInterval] = useState<number | ''>(detail.request_interval ?? '');
  const [savingName, setSavingName] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [avgLoading, setAvgLoading] = useState(false);
  const [avgValue, setAvgValue] = useState<number | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const saveNameId = async () => {
    if (!name.trim() || !deviceId.trim()) {
      notificationUtils.error('Lỗi', 'Tên thiết bị và ID thiết bị không được để trống');
      return;
    }
    setSavingName(true);
    try {
      await onUpdateNameId(detail.device_id, { device_name: name.trim(), device_id: deviceId.trim() });
      notificationUtils.success('Đã cập nhật tên và ID thiết bị');
    } catch (error) {
      notificationUtils.error('Lỗi cập nhật', 'Không thể cập nhật tên và ID thiết bị');
    } finally {
      setSavingName(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const intervalMs =
        requestInterval === ''
          ? null
          : Math.min(1800000, Math.max(100, Number(requestInterval)));
      const threshVal = threshold === '' ? null : Number(threshold);
      await onUpdateSettings(detail.device_id, {
        vibration_threshold: threshVal,
        request_interval: intervalMs
      });
      notificationUtils.success('Đã cập nhật cài đặt thiết bị');
    } catch (error) {
      notificationUtils.error('Lỗi cập nhật', 'Không thể cập nhật cài đặt thiết bị');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGetAverage = async () => {
    if (!detail.device_id) return;
    if (period === 'custom' && (!startDate || !endDate)) {
      notificationUtils.error('Lỗi', 'Vui lòng chọn khoảng thời gian tùy chỉnh');
      return;
    }
    setAvgLoading(true);
    try {
      let from: string | undefined;
      let to: string | undefined;
      if (period === 'week') {
        const now = new Date();
        to = format(now, 'yyyy-MM-dd');
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        from = format(weekAgo, 'yyyy-MM-dd');
      } else if (period === 'month') {
        const now = new Date();
        to = format(now, 'yyyy-MM-dd');
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        from = format(monthAgo, 'yyyy-MM-dd');
      } else if (period === 'custom' && startDate && endDate) {
        from = startDate;
        to = endDate;
      }
      const data = await deviceDetailServices.getSettingsTabData(detail.device_id, from, to);
      const avg = data?.vibrationReference?.average_vibration ?? null;
      setAvgValue(avg);
      if (avg !== null) {
        setThreshold(Number(avg.toFixed(1)));
        notificationUtils.success('Đã lấy giá trị trung bình', `Giá trị: ${avg.toFixed(1)} mm/s`);
      } else {
        notificationUtils.warning('Không có dữ liệu', 'Không tìm thấy dữ liệu rung động trong khoảng thời gian này');
      }
    } catch (error) {
      notificationUtils.error('Lỗi', 'Không thể lấy giá trị trung bình');
    } finally {
      setAvgLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      {/* Basic info */}
      <Card
        className={`border border-primary/20 bg-primary/5 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}
      >
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
            <Pencil className='h-5 w-5 text-primary' />
            Thông tin thiết bị
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-muted-foreground'>Tên thiết bị</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className='bg-background/60' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-muted-foreground'>ID thiết bị</label>
              <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className='bg-background/60' />
            </div>
          </div>
          <div className='flex items-center justify-end gap-2'>
            <Button
              size='sm'
              onClick={saveNameId}
              disabled={savingName || !deviceId.trim() || !name.trim()}
              className={DEVICE_ANIMATIONS.transition.normal}
            >
              <Hash className='mr-2 h-4 w-4' />
              {savingName ? 'Đang lưu...' : 'Lưu tên/ID'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device settings */}
      <Card
        className={`border border-border bg-muted/20 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}
      >
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
            <SlidersHorizontal className='h-5 w-5 text-primary' />
            Cài đặt hoạt động
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-muted-foreground'>Ngưỡng rung (mm/s)</label>
              <Input
                type='number'
                value={threshold}
                onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder='Nhập ngưỡng rung'
                className='bg-background/60'
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-muted-foreground'>Chu kỳ gửi dữ liệu (ms)</label>
              <Input
                type='number'
                value={requestInterval}
                onChange={(e) => setRequestInterval(e.target.value === '' ? '' : Number(e.target.value))}
                min={100}
                max={1800000}
                placeholder='100 - 1.800.000'
                className='bg-background/60'
              />
              <div className='text-[11px] text-muted-foreground flex items-center gap-2'>
                <Clock className='h-3.5 w-3.5' />
                Giới hạn: 100ms đến 30 phút
              </div>
            </div>
          </div>

          <div className='flex items-center justify-end gap-2'>
            <Button size='sm' onClick={saveSettings} disabled={savingSettings} className={DEVICE_ANIMATIONS.transition.normal}>
              <Activity className='mr-2 h-4 w-4' />
              {savingSettings ? 'Đang lưu...' : 'Lưu cài đặt'}
            </Button>
          </div>

          {/* Average helper */}
          <div className={`${DEVICE_RADIUS.md} border border-border bg-background/50 p-4 space-y-3`}>
            <div className='flex items-center justify-between gap-3 flex-wrap'>
              <div className='flex items-center gap-2'>
                <Calculator className='h-4 w-4 text-primary' />
                <div className='text-sm font-semibold text-foreground'>Gợi ý ngưỡng rung</div>
              </div>
              <div className='text-xs text-muted-foreground'>
                Giá trị trung bình: <span className='font-bold text-foreground'>{avgValue != null ? `${avgValue.toFixed(1)} mm/s` : '—'}</span>
              </div>
            </div>

            <div className='flex flex-wrap gap-2 items-center'>
              <Select value={period} onValueChange={(v: 'week' | 'month' | 'custom') => setPeriod(v)}>
                <SelectTrigger className='w-[170px] bg-background/60'>
                  <SelectValue placeholder='Khoảng thời gian' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='week'>7 ngày gần nhất</SelectItem>
                  <SelectItem value='month'>30 ngày gần nhất</SelectItem>
                  <SelectItem value='custom'>Tùy chọn</SelectItem>
                </SelectContent>
              </Select>

              {period === 'custom' && (
                <div className='flex flex-wrap gap-2 w-full'>
                  <Input
                    type='date'
                    className='w-[170px] bg-background/60'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Input
                    type='date'
                    className='w-[170px] bg-background/60'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}

              <Button
                size='sm'
                variant='outline'
                onClick={handleGetAverage}
                disabled={avgLoading || (period === 'custom' && (!startDate || !endDate))}
                className={DEVICE_ANIMATIONS.transition.normal}
              >
                {avgLoading ? 'Đang lấy...' : 'Lấy giá trị'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className={`border border-destructive/30 bg-destructive/5 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal}`}>
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold text-destructive uppercase'>
            <AlertTriangle className='h-5 w-5' />
            Vùng nguy hiểm
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-sm text-muted-foreground'>
            Hành động này sẽ xóa thiết bị và dữ liệu liên quan. Vui lòng cân nhắc trước khi thực hiện.
          </div>
          <Button variant='destructive' size='sm' onClick={onDelete} className={DEVICE_ANIMATIONS.transition.normal}>
            <Trash2 className='mr-2 h-4 w-4' />
            Xóa thiết bị
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

