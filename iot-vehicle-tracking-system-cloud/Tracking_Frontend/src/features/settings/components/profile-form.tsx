'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const ProfileForm = ({
  defaultValues,
  onSubmit,
  isPending,
  statusMessage,
}: {
  defaultValues?: any;
  onSubmit: (payload: { fullName?: string; email?: string }) => void;
  isPending?: boolean;
  statusMessage?: string | null;
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setFullName(defaultValues?.fullName ?? '');
    setEmail(defaultValues?.email ?? '');
  }, [defaultValues]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-full-name">Họ và tên</Label>
        <Input
          id="settings-full-name"
          placeholder="Ví dụ: Nguyễn Văn A"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-email">Email</Label>
        <Input
          id="settings-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="Ví dụ: admin@fleet.vn"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}

      <Button disabled={isPending} onClick={() => onSubmit({ fullName, email })}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Cập nhật hồ sơ
      </Button>
    </div>
  );
};
