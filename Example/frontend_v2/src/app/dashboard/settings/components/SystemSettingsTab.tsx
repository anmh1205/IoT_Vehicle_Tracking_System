'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface SystemSettingsTabProps {
  settings: {
    logLevel: string;
    maxLogSize: number;
    backupEnabled: boolean;
  };
  onSettingsChange: (updates: Partial<SystemSettingsTabProps['settings']>) => void;
  saving: boolean;
  onSave: () => void;
}

export function SystemSettingsTab({ settings, onSettingsChange, saving, onSave }: SystemSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hệ thống</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1'>
          <Label>Log level</Label>
          <Select value={settings.logLevel} onValueChange={(val) => onSettingsChange({ logLevel: val })}>
            <SelectTrigger>
              <SelectValue placeholder='Chọn log level' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='debug'>Debug</SelectItem>
              <SelectItem value='info'>Info</SelectItem>
              <SelectItem value='warn'>Warn</SelectItem>
              <SelectItem value='error'>Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1'>
          <Label>Kích thước log tối đa (MB)</Label>
          <Input
            type='number'
            min={10}
            value={settings.maxLogSize}
            onChange={(e) => onSettingsChange({ maxLogSize: Number(e.target.value) || 0 })}
          />
        </div>
        <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
          <div>
            <div className='font-medium'>Sao lưu định kỳ</div>
            <p className='text-sm text-muted-foreground'>Bật/tắt backup dữ liệu hệ thống.</p>
          </div>
          <Switch
            checked={settings.backupEnabled}
            onCheckedChange={(v) => onSettingsChange({ backupEnabled: v })}
          />
        </div>
      </CardContent>
      <CardFooter className='flex justify-end'>
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu hệ thống'}
        </Button>
      </CardFooter>
    </Card>
  );
}

