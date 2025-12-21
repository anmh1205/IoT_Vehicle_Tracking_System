'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SettingsHeaderProps {
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export function SettingsHeader({ saving, onSave, onReset }: SettingsHeaderProps) {
  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle>Tùy chọn lưu</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-3'>
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        <Button variant='outline' onClick={onReset} disabled={saving}>
          Khôi phục mặc định
        </Button>
      </CardContent>
    </Card>
  );
}

