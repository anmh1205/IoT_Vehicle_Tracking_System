'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface NotificationsSettingsTabProps {
  settings: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    pushNotifications: boolean;
    alertLevels: string[];
  };
  onSettingsChange: (updates: Partial<NotificationsSettingsTabProps['settings']>) => void;
}

export function NotificationsSettingsTab({ settings, onSettingsChange }: NotificationsSettingsTabProps) {
  const toggleAlertLevel = (level: string, checked: boolean) => {
    onSettingsChange({
      alertLevels: checked
        ? Array.from(new Set([...settings.alertLevels, level]))
        : settings.alertLevels.filter((l) => l !== level)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông báo</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-2 sm:grid-cols-2'>
          <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
            <div>
              <div className='font-medium'>Email</div>
              <p className='text-sm text-muted-foreground'>Nhận cảnh báo qua email.</p>
            </div>
            <Switch
              checked={settings.emailAlerts}
              onCheckedChange={(v) => onSettingsChange({ emailAlerts: v })}
            />
          </div>
          <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
            <div>
              <div className='font-medium'>SMS</div>
              <p className='text-sm text-muted-foreground'>Nhận cảnh báo qua SMS.</p>
            </div>
            <Switch
              checked={settings.smsAlerts}
              onCheckedChange={(v) => onSettingsChange({ smsAlerts: v })}
            />
          </div>
          <div className='flex items-center justify-between gap-2 rounded-lg border p-3 sm:col-span-2'>
            <div>
              <div className='font-medium'>Push</div>
              <p className='text-sm text-muted-foreground'>Hiển thị thông báo in-app.</p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(v) => onSettingsChange({ pushNotifications: v })}
            />
          </div>
        </div>
        <div className='space-y-2'>
          <Label>Mức cảnh báo</Label>
          <div className='flex gap-4'>
            {['error', 'warning', 'info'].map((level) => (
              <label key={level} className='flex items-center gap-2 text-sm'>
                <Checkbox
                  checked={settings.alertLevels.includes(level)}
                  onCheckedChange={(v) => toggleAlertLevel(level, Boolean(v))}
                />
                <span className='capitalize'>{level}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

