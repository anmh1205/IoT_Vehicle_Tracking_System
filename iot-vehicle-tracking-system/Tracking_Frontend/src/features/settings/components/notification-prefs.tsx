'use client';
import { Switch } from '@/components/ui/switch';
export const NotificationPrefs = ({
  value,
  onChange,
}: {
  value: {
    emailAlerts: boolean;
    pushAlerts: boolean;
  };
  onChange: (next: { emailAlerts: boolean; pushAlerts: boolean }) => void;
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border p-3">
        <span>Cảnh báo email</span>
        <Switch
          checked={value.emailAlerts}
          onCheckedChange={(v) => onChange({ ...value, emailAlerts: v })}
        />
      </div>
      <div className="flex items-center justify-between rounded border p-3">
        <span>Cảnh báo đẩy</span>
        <Switch
          checked={value.pushAlerts}
          onCheckedChange={(v) => onChange({ ...value, pushAlerts: v })}
        />
      </div>
    </div>
  );
};
