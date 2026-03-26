'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export const NotificationPrefs = ({
  value,
  onChange,
  isLoading,
  isPending,
  statusMessage,
  onSubmit,
}: {
  value: {
    emailAlerts: boolean;
    pushAlerts: boolean;
  };
  onChange: (next: { emailAlerts: boolean; pushAlerts: boolean }) => void;
  isLoading?: boolean;
  isPending?: boolean;
  statusMessage?: string | null;
  onSubmit: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải tùy chọn thông báo...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded border p-3">
        <div className="space-y-1">
          <p className="font-medium">Cảnh báo email</p>
          <p className="text-sm text-muted-foreground">Nhận thông báo qua email khi có sự cố quan trọng.</p>
        </div>
        <Switch
          checked={value.emailAlerts}
          onCheckedChange={(checked) => onChange({ ...value, emailAlerts: checked })}
        />
      </div>

      <div className="flex items-center justify-between rounded border p-3">
        <div className="space-y-1">
          <p className="font-medium">Cảnh báo đẩy</p>
          <p className="text-sm text-muted-foreground">Ưu tiên cho người dùng cần phản ứng nhanh trên giao diện vận hành.</p>
        </div>
        <Switch
          checked={value.pushAlerts}
          onCheckedChange={(checked) => onChange({ ...value, pushAlerts: checked })}
        />
      </div>

      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}

      <Button onClick={onSubmit} disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Lưu tùy chọn thông báo
      </Button>
    </div>
  );
};
