'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface GeneralSettingsTabProps {
  settings: {
    autoRefresh: boolean;
    refreshInterval: number;
    language: string;
    timezone: string;
  };
  onSettingsChange: (updates: Partial<GeneralSettingsTabProps['settings']>) => void;
}

export function GeneralSettingsTab({ settings, onSettingsChange }: GeneralSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt chung</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='font-medium'>Tự động làm mới</div>
            <p className='text-sm text-muted-foreground'>Bật/tắt auto refresh dữ liệu dashboard.</p>
          </div>
          <Switch checked={settings.autoRefresh} onCheckedChange={(v) => onSettingsChange({ autoRefresh: v })} />
        </div>
        <div className='grid gap-2 sm:grid-cols-2'>
          <div className='space-y-1'>
            <Label>Chu kỳ làm mới (giây)</Label>
            <Input
              type='number'
              min={1}
              value={settings.refreshInterval}
              onChange={(e) => onSettingsChange({ refreshInterval: Number(e.target.value) || 0 })}
            />
          </div>
          <div className='space-y-1'>
            <Label>Ngôn ngữ</Label>
            <Select value={settings.language} onValueChange={(val) => onSettingsChange({ language: val })}>
              <SelectTrigger>
                <SelectValue placeholder='Chọn ngôn ngữ' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='vi'>Tiếng Việt</SelectItem>
                <SelectItem value='en'>English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className='space-y-1'>
          <Label>Múi giờ</Label>
          <Input
            value={settings.timezone}
            onChange={(e) => onSettingsChange({ timezone: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

