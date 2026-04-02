import type { Role } from './roles';

export type UserStatus = 'active' | 'inactive';

export interface AuthenticatedUser {
  id: string;
  roles: Role[];
  status: UserStatus;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export {};
