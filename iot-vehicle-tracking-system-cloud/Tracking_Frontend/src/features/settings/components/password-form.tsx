'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const PasswordForm = ({
  onSubmit,
  isPending,
  statusMessage,
}: {
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => void;
  isPending?: boolean;
  statusMessage?: string | null;
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const valid = useMemo(
    () => currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword,
    [currentPassword, newPassword, confirmPassword],
  );

  const handleSubmit = () => {
    onSubmit({ currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-current-password">Mật khẩu hiện tại</Label>
        <Input
          id="settings-current-password"
          type="password"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu hiện tại"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-new-password">Mật khẩu mới</Label>
        <Input
          id="settings-new-password"
          type="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-confirm-password">Nhập lại mật khẩu mới</Label>
        <Input
          id="settings-confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="Nhập lại để xác nhận"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      {!valid && (confirmPassword || newPassword) ? (
        <p className="text-sm text-destructive">
          {!currentPassword ? 'Vui lòng nhập mật khẩu hiện tại.' : 'Mật khẩu mới chưa khớp hoặc chưa đủ 8 ký tự.'}
        </p>
      ) : null}
      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}

      <Button
        disabled={!valid || isPending}
        onClick={handleSubmit}
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Lưu mật khẩu
      </Button>
    </div>
  );
};
