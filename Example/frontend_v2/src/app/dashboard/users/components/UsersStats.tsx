'use client';

import { StatCard } from '@/app/dashboard/device/components/StatCard';
import { Users, Shield, User as UserIcon } from 'lucide-react';

interface UsersStatsProps {
  users: User.UserDto[];
}

export function UsersStats({ users }: UsersStatsProps) {
  const totalUsers = users.length;
  const rootCount = users.filter((u) => u.role === 'root').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const normalUserCount = users.filter((u) => u.role === 'user').length;

  return (
    <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        title='Tổng người dùng'
        value={totalUsers}
        icon={<Users className='h-4 w-4 text-primary' />}
        gradient='primary'
      />
      <StatCard
        title='Root'
        value={rootCount}
        icon={<Shield className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />}
        gradient='success'
      />
      <StatCard
        title='Admin'
        value={adminCount}
        icon={<Shield className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />}
        gradient='success'
      />
      <StatCard
        title='User thường'
        value={normalUserCount}
        icon={<UserIcon className='h-4 w-4 text-blue-600 dark:text-blue-400' />}
        gradient='secondary'
      />
    </div>
  );
}

