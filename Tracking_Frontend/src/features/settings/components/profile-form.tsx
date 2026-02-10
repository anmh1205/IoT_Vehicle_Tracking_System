'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProfileForm({ defaultValues, onSubmit, isPending }: { defaultValues?: any; onSubmit: (payload: { fullName?: string; email?: string }) => void; isPending?: boolean }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    setFullName(defaultValues?.fullName ?? '');
    setEmail(defaultValues?.email ?? '');
  }, [defaultValues]);

  return <div className="space-y-3"><Input placeholder="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} /><Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><Button disabled={isPending} onClick={() => onSubmit({ fullName, email })}>Cập nhật</Button></div>;
}

