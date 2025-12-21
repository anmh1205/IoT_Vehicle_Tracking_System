'use client';

import { useUserDeviceAccess } from '@/hooks/queries/useUserDeviceAccess';

interface UserDeviceScopeCellProps {
  user: User.UserDto;
  allDevices: Device.DeviceDto[];
}

export function UserDeviceScopeCell({ user, allDevices }: UserDeviceScopeCellProps) {
  const isPrivileged = user.role === 'admin' || user.role === 'root';
  const { data, isLoading } = useUserDeviceAccess(user.id);

  if (isPrivileged) {
    return <span className='text-xs font-medium text-foreground'>Tất cả thiết bị</span>;
  }

  if (isLoading || !data) {
    return <span className='text-xs text-muted-foreground'>Đang tải...</span>;
  }

  if (!data.mode || data.mode === 'all') {
    return <span className='text-xs font-medium text-foreground'>Tất cả thiết bị</span>;
  }

  const names =
    data.deviceIds?.map((id) => {
      const found = allDevices.find((d) => d.device_id === id);
      if (found) {
        return `${found.device_name} (${found.device_id})`;
      }
      return id;
    }) ?? [];

  if (names.length === 0) {
    return <span className='text-xs text-muted-foreground'>Chưa gán thiết bị</span>;
  }

  return (
    <div className='max-h-16 space-y-0.5 overflow-y-auto text-xs text-foreground'>
      {names.map((label) => (
        <div key={label} className='truncate'>
          {label}
        </div>
      ))}
    </div>
  );
}

