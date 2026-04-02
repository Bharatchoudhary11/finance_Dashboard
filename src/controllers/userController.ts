import type { Request, Response } from 'express';
import { User } from '../models/User';
import type { UserStatus } from '../types/express';
import { ROLES, isRoleValid, roleHierarchy, type Role } from '../types/roles';
import { toSafeUser } from '../utils/userMapper';

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, roles = [ROLES.VIEWER] } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    roles?: Role[];
  };

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required.' });
  }

  if (!Array.isArray(roles) || roles.length === 0 || !roles.every(isRoleValid)) {
    return res.status(400).json({ message: `roles must be a non-empty array containing any of: ${roleHierarchy.join(', ')}` });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: 'A user with that email already exists.' });
  }

  const user = new User({ name, email, password, roles });
  await user.save();

  return res.status(201).json(toSafeUser(user));
};

export const listUsers = async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json(users.map(toSafeUser));
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const { status } = req.body as { status?: UserStatus };
  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'status must be either active or inactive.' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json(toSafeUser(user));
};

export const updateUserRoles = async (req: Request, res: Response) => {
  const { roles } = req.body as { roles?: Role[] };
  if (!Array.isArray(roles) || roles.length === 0 || !roles.every(isRoleValid)) {
    return res.status(400).json({ message: `roles must be a non-empty array containing any of: ${roleHierarchy.join(', ')}` });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { roles },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json(toSafeUser(user));
};

export const getProfile = async (req: Request, res: Response) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  const user = await User.findById(req.authUser.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json(toSafeUser(user));
};
