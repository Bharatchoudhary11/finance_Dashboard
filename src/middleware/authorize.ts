import type { NextFunction, Request, Response } from 'express';
import { PERMISSIONS, type Permission, getPermissionsForRole } from '../types/permissions';
import { ROLES, type Role } from '../types/roles';

export const requireRoles = (...allowed: Role[]) => {
  const allowList = new Set<Role>(allowed);

  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const hasRole = authUser.roles.some((role) => allowList.has(role) || role === ROLES.ADMIN);
    if (!hasRole) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
};

const userHasPermission = (roles: Role[], permission: Permission) => {
  if (roles.includes(ROLES.ADMIN)) {
    return true;
  }

  return roles.some((role) => getPermissionsForRole(role).includes(permission));
};

export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!userHasPermission(authUser.roles, permission)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
};

export { PERMISSIONS };
