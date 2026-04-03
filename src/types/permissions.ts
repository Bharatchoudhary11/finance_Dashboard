import { ROLES, type Role } from './roles';

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view:dashboard',
  VIEW_RECORDS: 'view:records',
  MANAGE_RECORDS: 'manage:records',
  VIEW_INSIGHTS: 'view:insights',
  MANAGE_USERS: 'manage:users',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const rolePermissionMap: Record<Role, Permission[]> = {
  [ROLES.VIEWER]: [PERMISSIONS.VIEW_DASHBOARD],
  [ROLES.ANALYST]: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_RECORDS, PERMISSIONS.VIEW_INSIGHTS],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_RECORDS,
    PERMISSIONS.MANAGE_RECORDS,
    PERMISSIONS.VIEW_INSIGHTS,
    PERMISSIONS.MANAGE_USERS,
  ],
};

export const getPermissionsForRole = (role: Role): Permission[] => rolePermissionMap[role] ?? [];

export const rolePermissions = rolePermissionMap;
