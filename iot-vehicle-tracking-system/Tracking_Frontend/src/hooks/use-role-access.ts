import { useAuthStore } from '@/lib/stores/auth-store';
export type AppRole = 'root' | 'admin' | 'manager' | 'operator' | 'viewer';
const ADMIN_ROLES: ReadonlySet<AppRole> = new Set(['root', 'admin']);
const EDIT_ROLES: ReadonlySet<AppRole> = new Set(['root', 'admin', 'manager', 'operator']);
const NON_VIEWER_ROLES: ReadonlySet<AppRole> = new Set(['root', 'admin', 'manager', 'operator']);
export const useRoleAccess = () => {
  const user = useAuthStore((state) => state.user);
  const role = (user?.role ?? 'viewer') as AppRole;
  const canViewSystemInfo = ADMIN_ROLES.has(role);
  const canViewAllDevices = NON_VIEWER_ROLES.has(role);
  const canEditDevice = EDIT_ROLES.has(role);
  const canManageUsers = ADMIN_ROLES.has(role);
  const canManageFirmware = ADMIN_ROLES.has(role);
  const canExportData = NON_VIEWER_ROLES.has(role);
  const canAccessSystemAdmin = ADMIN_ROLES.has(role);
  const canDeleteDevice = ADMIN_ROLES.has(role);
  return {
    canViewSystemInfo,
    canViewAllDevices,
    canEditDevice,
    canManageUsers,
    canManageFirmware,
    canExportData,
    canAccessSystemAdmin,
    canDeleteDevice,
    role,
    isRoot: role === 'root',
    isAdmin: role === 'admin',
    hasAnyRole: (...roles: AppRole[]) => roles.includes(role),
  };
};
