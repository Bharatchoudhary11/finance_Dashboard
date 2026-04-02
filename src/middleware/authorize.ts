import type { NextFunction, Request, Response } from 'express';
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
