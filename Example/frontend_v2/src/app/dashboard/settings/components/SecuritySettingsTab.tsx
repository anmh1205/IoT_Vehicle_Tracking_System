'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface SecuritySettingsTabProps {
  settings: {
    sessionTimeout: number;
    requirePasswordChange: boolean;
    twoFactorAuth: boolean;
  };
  onSettingsChange: (updates: Partial<SecuritySettingsTabProps['settings']>) => void;
}

export function SecuritySettingsTab({ settings, onSettingsChange }: SecuritySettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bảo mật</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1'>
          <Label>Thời gian timeout (phút)</Label>
          <Input
            type='number'
            min={1}
            value={settings.sessionTimeout}
            onChange={(e) => onSettingsChange({ sessionTimeout: Number(e.target.value) || 0 })}
          />
        </div>
        <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
          <div>
            <div className='font-medium'>Bắt buộc đổi mật khẩu</div>
            <p className='text-sm text-muted-foreground'>Yêu cầu đổi mật khẩu định kỳ.</p>
          </div>
          <Switch
            checked={settings.requirePasswordChange}
            onCheckedChange={(v) => onSettingsChange({ requirePasswordChange: v })}
          />
        </div>
        <div className='flex items-center justify-between gap-2 rounded-lg border p-3'>
          <div>
            <div className='font-medium'>Xác thực 2 lớp</div>
            <p className='text-sm text-muted-foreground'>Bảo vệ tài khoản bằng 2FA.</p>
          </div>
          <Switch
            checked={settings.twoFactorAuth}
            onCheckedChange={(v) => onSettingsChange({ twoFactorAuth: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

