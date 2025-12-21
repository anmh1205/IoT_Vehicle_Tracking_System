'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface AppearanceSettingsTabProps {
  settings: {
    theme: string;
    compactMode: boolean;
    showAnimations: boolean;
  };
  onSettingsChange: (updates: Partial<AppearanceSettingsTabProps['settings']>) => void;
}

export function AppearanceSettingsTab({ settings, onSettingsChange }: AppearanceSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Giao diện</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1'>
          <Label>Chủ đề</Label>
          <Select value={settings.theme} onValueChange={(val) => onSettingsChange({ theme: val })}>
            <SelectTrigger>
              <SelectValue placeholder='Chọn theme' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='light'>Light</SelectItem>
              <SelectItem value='dark'>Dark</SelectItem>
              <SelectItem value='system'>System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
          <div>
            <div className='font-medium'>Chế độ cô đọng</div>
            <p className='text-sm text-muted-foreground'>Giảm padding cho bảng & thẻ.</p>
          </div>
          <Switch
            checked={settings.compactMode}
            onCheckedChange={(v) => onSettingsChange({ compactMode: v })}
          />
        </div>
        <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
          <div>
            <div className='font-medium'>Hiệu ứng animation</div>
            <p className='text-sm text-muted-foreground'>Bật/tắt animation UI.</p>
          </div>
          <Switch
            checked={settings.showAnimations}
            onCheckedChange={(v) => onSettingsChange({ showAnimations: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

