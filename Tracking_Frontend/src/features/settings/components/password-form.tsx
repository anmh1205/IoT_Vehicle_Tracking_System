'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export const PasswordForm = ({
  onSubmit,
  isPending,
}: {
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => void;
  isPending?: boolean;
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const valid = useMemo(
    () => newPassword.length >= 8 && newPassword === confirmPassword,
    [newPassword, confirmPassword],
  );
  return (
    <div className="space-y-3">
      <Input
        type="password"
        placeholder="Mật khẩu hiện tại"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Mật khẩu mới"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button
        disabled={!valid || isPending}
        onClick={() => onSubmit({ currentPassword, newPassword })}
      >
        Lưu mật khẩu
      </Button>
    </div>
  );
};
