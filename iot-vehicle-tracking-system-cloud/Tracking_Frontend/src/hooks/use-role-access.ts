import { useAuthStore } from '@/lib/stores/auth-store';
export type AppRole = 'root' | 'admin' | 'manager' | 'operator' | 'viewer';
const ADMIN_ROLES: ReadonlySet<AppRole> = new Set(['root', 'admin']);
const EDIT_ROLES: ReadonlySet<AppRole> = new Set(['root', 'admin', 'manager', 'operator']);
const NON_VIEWER_ROLES: ReadonlySet<AppRole> = new Set(['root', 'admin', 'manager', 'operator']);

const SYSTEM_ADMIN_ACTION_ACCESS: Record<
  | 'view'
  | 'query'
  | 'manage'
  | 'activate'
  | 'rollback'
  | 'delete',
  ReadonlySet<AppRole>
> = {
  view: new Set(['root', 'admin']),
  query: new Set(['root', 'admin']),
  manage: new Set(['root', 'admin']),
  activate: new Set(['root', 'admin']),
  rollback: new Set(['root', 'admin']),
  delete: new Set(['root', 'admin']),
};

export const useRoleAccess = () => {
  const user = useAuthStore((state) => state.user);
  const role = (user?.role ?? 'viewer') as AppRole;
  const canViewSystemInfo = ADMIN_ROLES.has(role);
  const canViewAllDevices = NON_VIEWER_ROLES.has(role);
  const canEditDevice = EDIT_ROLES.has(role);
  const canManageUsers = ADMIN_ROLES.has(role);
  const canManageFirmware = ADMIN_ROLES.has(role);
  const canExportData = NON_VIEWER_ROLES.has(role);
  const canAccessSystemAdmin = SYSTEM_ADMIN_ACTION_ACCESS.view.has(role);
  const canDeleteDevice = ADMIN_ROLES.has(role);
  const canSystemAdminView = SYSTEM_ADMIN_ACTION_ACCESS.view.has(role);
  const canSystemAdminQuery = SYSTEM_ADMIN_ACTION_ACCESS.query.has(role);
  const canSystemAdminManage = SYSTEM_ADMIN_ACTION_ACCESS.manage.has(role);
  const canSystemAdminActivate = SYSTEM_ADMIN_ACTION_ACCESS.activate.has(role);
  const canSystemAdminRollback = SYSTEM_ADMIN_ACTION_ACCESS.rollback.has(role);
  const canSystemAdminDelete = SYSTEM_ADMIN_ACTION_ACCESS.delete.has(role);

  return {
    canViewSystemInfo,
    canViewAllDevices,
    canEditDevice,
    canManageUsers,
    canManageFirmware,
    canExportData,
    canAccessSystemAdmin,
    canDeleteDevice,
    canSystemAdminView,
    canSystemAdminQuery,
    canSystemAdminManage,
    canSystemAdminActivate,
    canSystemAdminRollback,
    canSystemAdminDelete,
    role,
    isRoot: role === 'root',
    isAdmin: role === 'admin',
    hasAnyRole: (...roles: AppRole[]) => roles.includes(role),
  };
};
