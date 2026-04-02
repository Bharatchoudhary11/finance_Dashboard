export const ROLES = {
  VIEWER: 'viewer',
  ANALYST: 'analyst',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const roleHierarchy: Role[] = [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN];

export const isRoleValid = (role: string): role is Role => roleHierarchy.includes(role as Role);
