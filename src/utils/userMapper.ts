import type { UserDocument } from '../models/User';

export const toSafeUser = (user: UserDocument) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  roles: user.roles,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
